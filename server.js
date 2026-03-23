import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "prototype");
const SESSION_COOKIE_NAME = "agrishield_session";
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const AADHAR_VERIFICATION_TTL_MS = 10 * 60 * 1000;

loadEnvFile(path.join(__dirname, ".env"));

const config = buildConfig();
let pool;
let databaseInitError = null;

class RequestError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.name = "RequestError";
        this.statusCode = statusCode;
    }
}

const server = createServer(async (req, res) => {
    try {
        await routeRequest(req, res);
    } catch (error) {
        if (error instanceof RequestError) {
            sendJson(res, error.statusCode, {
                ok: false,
                message: error.message
            });
            return;
        }

        console.error(error);
        sendJson(res, 500, {
            ok: false,
            message: "Server error. Please try again."
        });
    }
});

server.listen(config.app.port, () => {
    console.log(`AgriShield server running at http://localhost:${config.app.port}`);
    void initializeDatabase()
        .then(() => {
            databaseInitError = null;
            console.log("MySQL connection ready.");
        })
        .catch((error) => {
            databaseInitError = error;
            console.error("MySQL unavailable:", error.message);
        });
});

async function routeRequest(req, res) {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (requestUrl.pathname.startsWith("/api/")) {
        applyApiCors(req, res);

        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }

        await handleApiRequest(req, res, requestUrl);
        return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
        sendText(res, 405, "Method not allowed.");
        return;
    }

    await serveStaticFile(req, res, requestUrl.pathname);
}

function applyApiCors(req, res) {
    const origin = String(req.headers.origin || "");

    if (!origin) {
        return;
    }

    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        return;
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,HEAD,OPTIONS");
    res.setHeader("Vary", "Origin");
}

async function handleApiRequest(req, res, requestUrl) {
    if (req.method === "GET" && requestUrl.pathname === "/api/health") {
        sendJson(res, 200, {
            ok: true,
            message: "AgriShield API is running.",
            databaseReady: Boolean(pool),
            databaseError: databaseInitError ? databaseInitError.message : null
        });
        return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/auth/captcha") {
        sendJson(res, 200, {
            ok: true,
            captcha: issueCaptcha()
        }, {
            "Cache-Control": "no-store"
        });
        return;
    }

    if (!isDatabaseReadyForRoute(requestUrl.pathname)) {
        sendJson(res, 503, {
            ok: false,
            message: "Database is unavailable. Aadhar verification works, but login and registration storage require MySQL."
        });
        return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/auth/me") {
        const session = await getSessionUser(req);

        if (!session) {
            sendJson(res, 200, {
                ok: true,
                authenticated: false,
                user: null
            }, {
                "Cache-Control": "no-store"
            });
            return;
        }

        await pool.query(
            "UPDATE user_sessions SET last_seen_at = UTC_TIMESTAMP() WHERE id = ?",
            [session.sessionId]
        );

        const [labourProfiles] = await pool.query(
            `
            SELECT
                id,
                registration_type AS registrationType,
                head_name AS headName,
                contact_number AS contactNumber,
                aadhar_status AS aadharStatus
            FROM labour_registrations
            WHERE user_id = ?
            LIMIT 1
            `,
            [session.user.id]
        );

        const roles = ["farmer"];

        if (labourProfiles.length) {
            roles.push("labour");
        }

        sendJson(res, 200, {
            ok: true,
            authenticated: true,
            user: {
                ...session.user,
                roles,
                labourProfile: labourProfiles[0] || null
            }
        }, {
            "Cache-Control": "no-store"
        });
        return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/auth/register") {
        const payload = await readJsonBody(req);
        const fullName = cleanText(payload.fullName, 80);
        const email = normalizeEmail(payload.email);
        const phone = cleanPhone(payload.phone);
        const password = String(payload.password || "");
        const captchaAnswer = String(payload.captchaAnswer || "");
        const captchaToken = String(payload.captchaToken || "");

        if (fullName.length < 2) {
            sendJson(res, 400, { ok: false, message: "Enter a valid full name." });
            return;
        }

        if (!isValidEmail(email)) {
            sendJson(res, 400, { ok: false, message: "Enter a valid email address." });
            return;
        }

        if (password.length < 8) {
            sendJson(res, 400, { ok: false, message: "Password must be at least 8 characters." });
            return;
        }

        if (!verifyCaptcha(captchaAnswer, captchaToken)) {
            sendJson(res, 400, { ok: false, message: "Captcha verification failed. Try again." });
            return;
        }

        const [existingUsers] = await pool.query(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (existingUsers.length > 0) {
            sendJson(res, 409, { ok: false, message: "This email is already registered." });
            return;
        }

        const passwordRecord = hashPassword(password);
        let insertId;

        try {
            const [result] = await pool.query(
                `
                INSERT INTO users (full_name, email, phone, password_hash, password_salt)
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    fullName,
                    email,
                    phone,
                    passwordRecord.hash,
                    passwordRecord.salt
                ]
            );

            insertId = result.insertId;
        } catch (error) {
            if (error && error.code === "ER_DUP_ENTRY") {
                sendJson(res, 409, { ok: false, message: "This email is already registered." });
                return;
            }

            throw error;
        }

        const sessionToken = await createSession(insertId);

        sendJson(res, 201, {
            ok: true,
            message: "Registration successful.",
            user: {
                id: insertId,
                fullName,
                email,
                phone
            }
        }, {
            "Cache-Control": "no-store",
            "Set-Cookie": buildSessionCookie(sessionToken)
        });
        return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/auth/login") {
        // legacy email-based login kept for compatibility (not used by current frontend)
        const payload = await readJsonBody(req);
        const email = normalizeEmail(payload.email);
        const password = String(payload.password || "");
        const captchaAnswer = String(payload.captchaAnswer || "");
        const captchaToken = String(payload.captchaToken || "");

        if (!isValidEmail(email) || password.length === 0) {
            sendJson(res, 400, { ok: false, message: "Email and password are required." });
            return;
        }

        if (!verifyCaptcha(captchaAnswer, captchaToken)) {
            sendJson(res, 400, { ok: false, message: "Captcha verification failed. Try again." });
            return;
        }

        const [users] = await pool.query(
            `
            SELECT
                id,
                username,
                full_name AS fullName,
                email,
                phone,
                password_hash AS passwordHash,
                password_salt AS passwordSalt
            FROM users
            WHERE email = ?
            LIMIT 1
            `,
            [email]
        );

        if (users.length === 0) {
            sendJson(res, 401, { ok: false, message: "Invalid email or password." });
            return;
        }

        const user = users[0];
        const passwordMatches = verifyPassword(password, user.passwordSalt, user.passwordHash);

        if (!passwordMatches) {
            sendJson(res, 401, { ok: false, message: "Invalid email or password." });
            return;
        }

        const sessionToken = await createSession(user.id);

        sendJson(res, 200, {
            ok: true,
            message: "Login successful.",
            user: {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone
            }
        }, {
            "Cache-Control": "no-store",
            "Set-Cookie": buildSessionCookie(sessionToken)
        });
        return;
    }

    // Simple username-based auth for the prototype (matches frontend math CAPTCHA flow)
    if (req.method === "POST" && requestUrl.pathname === "/api/auth/simple-register") {
        const payload = await readJsonBody(req);
        const fullName = cleanText(payload.fullName, 80);
        const username = cleanText(payload.username, 80);
        const mobile = cleanPhone(payload.mobile);
        const password = String(payload.password || "");
        const aadharNumber = cleanAadhar(payload.aadharNumber);
        const aadharConsent = payload.aadharConsent !== false;
        const aadharVerificationToken = String(payload.aadharVerificationToken || "");

        if (fullName.length < 2) {
            sendJson(res, 400, { ok: false, message: "Enter a valid full name." });
            return;
        }

        if (username.length < 3) {
            sendJson(res, 400, { ok: false, message: "Username must be at least 3 characters." });
            return;
        }

        if (password.length < 4) {
            sendJson(res, 400, { ok: false, message: "Password must be at least 4 characters." });
            return;
        }

        if (!mobile || cleanDigits(mobile).length !== 10) {
            sendJson(res, 400, { ok: false, message: "Enter a valid 10-digit mobile number." });
            return;
        }

        if (!aadharNumber) {
            sendJson(res, 400, { ok: false, message: "A valid 12-digit Aadhar number is required." });
            return;
        }

        const verifiedAadhar = aadharVerificationToken
            ? readAadharVerificationToken(aadharVerificationToken, {
                aadharNumber,
                holderName: fullName
            })
            : { status: "review", summary: "Manual review: attachments submitted." };

        if (!verifiedAadhar) {
            sendJson(res, 400, { ok: false, message: "Aadhar verification is invalid." });
            return;
        }

        const [existing] = await pool.query(
            "SELECT id FROM users WHERE username = ? LIMIT 1",
            [username]
        );

        if (existing.length) {
            sendJson(res, 409, { ok: false, message: "Username already registered." });
            return;
        }

        const passwordRecord = hashPassword(password);
        const verifiedAt = verifiedAadhar.status === "verified" ? formatUtcDateTime(new Date()) : null;

        const [result] = await pool.query(
            `
            INSERT INTO users (username, full_name, email, phone, password_hash, password_salt, aadhar_number, aadhar_status, aadhar_summary, aadhar_verified_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                username,
                fullName,
                `${username}@local.test`,
                mobile || null,
                passwordRecord.hash,
                passwordRecord.salt,
                maskAadhar(aadharNumber),
                verifiedAadhar.status,
                verifiedAadhar.summary || null,
                verifiedAt
            ]
        );

        const sessionToken = await createSession(result.insertId);

        sendJson(res, 201, {
            ok: true,
            message: "Registration successful.",
            user: { id: result.insertId, username, mobile }
        }, {
            "Cache-Control": "no-store",
            "Set-Cookie": buildSessionCookie(sessionToken)
        });
        return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/auth/bootstrap-demo") {
        const demoUser = {
            fullName: "Demo Farmer",
            username: "demo_farmer",
            mobile: "9876543210",
            password: "demo1234"
        };

        const [existing] = await pool.query(
            "SELECT id FROM users WHERE username = ? LIMIT 1",
            [demoUser.username]
        );

        if (!existing.length) {
            const passwordRecord = hashPassword(demoUser.password);

            await pool.query(
                `
                INSERT INTO users (username, full_name, email, phone, password_hash, password_salt, aadhar_number, aadhar_status, aadhar_summary, aadhar_verified_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    demoUser.username,
                    demoUser.fullName,
                    `${demoUser.username}@local.test`,
                    demoUser.mobile,
                    passwordRecord.hash,
                    passwordRecord.salt,
                    "XXXX XXXX 0000",
                    "verified",
                    "Demo account bootstrap record.",
                    formatUtcDateTime(new Date())
                ]
            );
        }

        sendJson(res, 200, { ok: true });
        return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/auth/simple-login") {
        const payload = await readJsonBody(req);
        const username = cleanText(payload.username, 80);
        const password = String(payload.password || "");

        const [users] = await pool.query(
            `
            SELECT
                id,
                username,
                full_name AS fullName,
                email,
                phone,
                password_hash AS passwordHash,
                password_salt AS passwordSalt
            FROM users
            WHERE username = ?
            LIMIT 1
            `,
            [username]
        );

        if (!users.length) {
            sendJson(res, 401, { ok: false, message: "Invalid username or password." });
            return;
        }

        const user = users[0];
        const passwordMatches = verifyPassword(password, user.passwordSalt, user.passwordHash);

        if (!passwordMatches) {
            sendJson(res, 401, { ok: false, message: "Invalid username or password." });
            return;
        }

        const sessionToken = await createSession(user.id);

        sendJson(res, 200, {
            ok: true,
            message: "Login successful.",
            user: {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                phone: user.phone
            }
        }, {
            "Cache-Control": "no-store",
            "Set-Cookie": buildSessionCookie(sessionToken)
        });
        return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/auth/logout") {
        const sessionToken = readCookie(req, SESSION_COOKIE_NAME);

        if (sessionToken) {
            await pool.query(
                "DELETE FROM user_sessions WHERE session_token_hash = ?",
                [hashToken(sessionToken)]
            );
        }

        sendJson(res, 200, {
            ok: true,
            message: "Logged out successfully."
        }, {
            "Cache-Control": "no-store",
            "Set-Cookie": clearSessionCookie()
        });
        return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/aadhar/verify") {
        const payload = await readJsonBody(req);
        const aadharNumber = cleanAadhar(payload.aadharNumber);
        const holderName = cleanText(payload.holderName, 120);
        const imageBase64 = String(payload.imageBase64 || "");

        if (!aadharNumber) {
            sendJson(res, 400, { ok: false, message: "Enter a valid 12-digit Aadhar number." });
            return;
        }

        if (holderName.length < 2) {
            sendJson(res, 400, { ok: false, message: "Enter the holder name before verifying Aadhar." });
            return;
        }

        if (!isSupportedImageDataUrl(imageBase64)) {
            sendJson(res, 400, { ok: false, message: "Aadhar image must be a PNG, JPG, or WEBP file." });
            return;
        }

        try {
            const result = await analyzeAadharWithAI({ imageBase64, holderName, aadharNumber });
            const verificationToken = ["verified", "review"].includes(result.status)
                ? issueAadharVerificationToken({
                    aadharNumber,
                    holderName,
                    status: result.status,
                    summary: result.summary
                })
                : "";

            sendJson(res, 200, {
                ok: true,
                status: result.status,
                score: result.score,
                summary: result.summary,
                maskedNumber: maskAadhar(aadharNumber),
                verificationToken
            }, {
                "Cache-Control": "no-store"
            });
        } catch (error) {
            const message = error instanceof RequestError ? error.message : "Aadhar verification failed.";
            const status = error instanceof RequestError ? error.statusCode : 502;
            sendJson(res, status, { ok: false, message });
        }
        return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/labour/register") {
        const session = await getSessionUser(req);
        const payload = await readJsonBody(req);
        const registrationType = payload.registrationType === "group" ? "group" : "self";
        const headName = cleanText(payload.headName, 120);
        const contactNumber = cleanPhone(payload.contactNumber);
        const address = cleanText(payload.address, 240);
        const username = cleanText(payload.username, 80);
        const password = String(payload.password || "");
        const aadharNumber = cleanAadhar(payload.aadharNumber);
        const aadharVerificationToken = String(payload.aadharVerificationToken || "");
        const members = Array.isArray(payload.members) ? payload.members : [];

        if (!headName || !contactNumber || !username || password.length < 4) {
            sendJson(res, 400, { ok: false, message: "Name, contact, username, and password are required." });
            return;
        }

        if (!aadharNumber) {
            sendJson(res, 400, { ok: false, message: "A valid 12-digit Aadhar number is required." });
            return;
        }

        if (registrationType === "group" && members.length > 25) {
            sendJson(res, 400, { ok: false, message: "Group members cannot exceed 25." });
            return;
        }

        const [existingLabourUsers] = await pool.query(
            "SELECT id FROM labour_registrations WHERE username = ? LIMIT 1",
            [username]
        );

        if (existingLabourUsers.length) {
            sendJson(res, 409, { ok: false, message: "Username already registered for labour." });
            return;
        }

        const [existingUsers] = await pool.query(
            "SELECT id FROM users WHERE username = ? LIMIT 1",
            [username]
        );

        const verifiedAadhar = aadharVerificationToken
            ? readAadharVerificationToken(aadharVerificationToken, {
                aadharNumber,
                holderName: headName
            })
            : { status: "review", summary: "Manual review: attachments submitted." };

        if (!verifiedAadhar) {
            sendJson(res, 400, { ok: false, message: "Aadhar verification is invalid." });
            return;
        }

        const passwordRecord = hashPassword(password);
        const verifiedAt = verifiedAadhar.status === "verified" ? formatUtcDateTime(new Date()) : null;

        let labourUserId = session?.user?.id || null;

        if (existingUsers.length && existingUsers[0].id !== labourUserId) {
            sendJson(res, 409, { ok: false, message: "Username already registered." });
            return;
        }

        if (!labourUserId) {
            const [userInsert] = await pool.query(
                `
                INSERT INTO users (
                    username, full_name, email, phone, password_hash, password_salt,
                    aadhar_number, aadhar_status, aadhar_summary, aadhar_verified_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    username,
                    headName,
                    `${username}@labour.local`,
                    contactNumber || null,
                    passwordRecord.hash,
                    passwordRecord.salt,
                    maskAadhar(aadharNumber),
                    verifiedAadhar.status,
                    verifiedAadhar.summary,
                    verifiedAt
                ]
            );

            labourUserId = userInsert.insertId;
        }

        const [result] = await pool.query(
            `
            INSERT INTO labour_registrations (
                user_id, registration_type, head_name, contact_number, address,
                aadhar_number, aadhar_status, aadhar_summary, username, password_hash, password_salt, verification_note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                labourUserId || null,
                registrationType,
                headName,
                contactNumber,
                address || null,
                maskAadhar(aadharNumber),
                verifiedAadhar.status,
                verifiedAadhar.summary,
                username,
                passwordRecord.hash,
                passwordRecord.salt,
                verifiedAadhar.summary
            ]
        );

        if (registrationType === "group" && members.length) {
            const insertValues = members
                .slice(0, 25)
                .map((member) => [
                    result.insertId,
                    cleanText(member.name, 120),
                    cleanPhone(member.contact)
                ])
                .filter((row) => row[1]);

            if (insertValues.length) {
                await pool.query(
                    "INSERT INTO labour_group_members (labour_registration_id, member_name, contact_number) VALUES ?",
                    [insertValues]
                );
            }
        }

        sendJson(res, 201, {
            ok: true,
            registrationId: result.insertId,
            aadharStatus: verifiedAadhar.status
        });
        return;
    }

    if (requestUrl.pathname === "/api/profile") {
        const session = await getSessionUser(req);

        if (!session) {
            sendJson(res, 401, { ok: false, message: "Not authenticated." });
            return;
        }

        if (req.method === "GET") {
            const [rows] = await pool.query(
                "SELECT * FROM farmer_profiles WHERE user_id = ? LIMIT 1",
                [session.user.id]
            );

            sendJson(res, 200, {
                ok: true,
                profile: rows[0] || null
            });
            return;
        }

        if (req.method === "POST") {
            const payload = await readJsonBody(req);
            const profile = sanitizeProfilePayload(payload);

            await pool.query(
                `
                INSERT INTO farmer_profiles (
                    user_id, farmer_name, mobile_number, village, taluka, district, state,
                    full_address, land_area, main_crop, farming_type, latitude, longitude
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    farmer_name = VALUES(farmer_name),
                    mobile_number = VALUES(mobile_number),
                    village = VALUES(village),
                    taluka = VALUES(taluka),
                    district = VALUES(district),
                    state = VALUES(state),
                    full_address = VALUES(full_address),
                    land_area = VALUES(land_area),
                    main_crop = VALUES(main_crop),
                    farming_type = VALUES(farming_type),
                    latitude = VALUES(latitude),
                    longitude = VALUES(longitude),
                    updated_at = CURRENT_TIMESTAMP
                `,
                [
                    session.user.id,
                    profile.farmerName,
                    profile.mobileNumber,
                    profile.village,
                    profile.taluka,
                    profile.district,
                    profile.state,
                    profile.fullAddress,
                    profile.landArea || null,
                    profile.mainCrop,
                    profile.farmingType,
                    profile.latitude || null,
                    profile.longitude || null
                ]
            );

            sendJson(res, 200, { ok: true, profile });
            return;
        }
    }

    if (requestUrl.pathname === "/api/labour/posts") {
        const session = await getSessionUser(req);

        if (!session) {
            sendJson(res, 401, { ok: false, message: "Not authenticated." });
            return;
        }

        if (req.method === "GET") {
            const [rows] = await pool.query(
                `
                SELECT id, work_type AS workType, labour_count AS labourCount, required_date AS requiredDate,
                       required_time AS requiredTime, location, notes, created_at AS createdAt
                FROM labour_posts
                WHERE user_id = ?
                ORDER BY created_at DESC
                `,
                [session.user.id]
            );

            sendJson(res, 200, { ok: true, posts: rows });
            return;
        }

        if (req.method === "POST") {
            const payload = await readJsonBody(req);
            const post = sanitizeLabourPost(payload);

            if (!post.workType || !post.labourCount || !post.requiredDate || !post.requiredTime || !post.location) {
                sendJson(res, 400, { ok: false, message: "Missing required fields." });
                return;
            }

            await pool.query(
                `
                INSERT INTO labour_posts (
                    user_id, work_type, labour_count, required_date, required_time, location, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    session.user.id,
                    post.workType,
                    post.labourCount,
                    post.requiredDate,
                    post.requiredTime,
                    post.location,
                    post.notes || null
                ]
            );

            sendJson(res, 201, { ok: true });
            return;
        }
    }

    if (requestUrl.pathname === "/api/labour/market" && req.method === "GET") {
        const session = await getSessionUser(req);

        if (!session) {
            sendJson(res, 401, { ok: false, message: "Not authenticated." });
            return;
        }

        const [rows] = await pool.query(
            `
            SELECT
                lp.id,
                lp.work_type AS workType,
                lp.labour_count AS labourCount,
                lp.required_date AS requiredDate,
                lp.required_time AS requiredTime,
                lp.location,
                lp.notes,
                lp.created_at AS createdAt,
                fp.farmer_name AS farmerName,
                fp.mobile_number AS farmerMobile,
                fp.district,
                fp.state
            FROM labour_posts lp
            LEFT JOIN farmer_profiles fp ON lp.user_id = fp.user_id
            ORDER BY lp.created_at DESC
            LIMIT 100
            `
        );

        sendJson(res, 200, { ok: true, posts: rows });
        return;
    }

    if (requestUrl.pathname === "/api/labour/apply" && req.method === "POST") {
        const session = await getSessionUser(req);

        if (!session) {
            sendJson(res, 401, { ok: false, message: "Not authenticated." });
            return;
        }

        const [labourProfiles] = await pool.query(
            `
            SELECT id, head_name AS headName, contact_number AS contactNumber
            FROM labour_registrations
            WHERE user_id = ?
            LIMIT 1
            `,
            [session.user.id]
        );

        if (!labourProfiles.length) {
            sendJson(res, 403, { ok: false, message: "Create a labour profile before applying." });
            return;
        }

        const labourProfile = labourProfiles[0];
        const payload = await readJsonBody(req);
        const postId = Number(payload.postId || 0);
        const message = cleanText(payload.message, 400) || "Interested in this labour requirement.";

        if (!postId) {
            sendJson(res, 400, { ok: false, message: "A valid labour post is required." });
            return;
        }

        const [posts] = await pool.query(
            "SELECT id FROM labour_posts WHERE id = ? LIMIT 1",
            [postId]
        );

        if (!posts.length) {
            sendJson(res, 404, { ok: false, message: "Labour post not found." });
            return;
        }

        const [existingApplications] = await pool.query(
            "SELECT id FROM labour_applications WHERE labour_post_id = ? AND labour_registration_id = ? LIMIT 1",
            [postId, labourProfile.id]
        );

        if (existingApplications.length) {
            sendJson(res, 200, { ok: true, message: "Application already submitted." });
            return;
        }

        await pool.query(
            `
            INSERT INTO labour_applications (
                labour_post_id, labour_registration_id, applicant_name, applicant_contact, message, status
            ) VALUES (?, ?, ?, ?, ?, 'applied')
            `,
            [
                postId,
                labourProfile.id,
                labourProfile.headName,
                labourProfile.contactNumber,
                message
            ]
        );

        sendJson(res, 201, { ok: true, message: "Applied to labour request." });
        return;
    }

    if (requestUrl.pathname === "/api/chat/history") {
        const session = await getSessionUser(req);

        if (!session) {
            sendJson(res, 401, { ok: false, message: "Not authenticated." });
            return;
        }

        const [rows] = await pool.query(
            `
            SELECT role, message, created_at AS createdAt
            FROM chat_messages
            WHERE user_id = ?
            ORDER BY created_at ASC
            LIMIT 200
            `,
            [session.user.id]
        );

        sendJson(res, 200, { ok: true, messages: rows });
        return;
    }

    if (requestUrl.pathname === "/api/chat/send" && req.method === "POST") {
        const session = await getSessionUser(req);

        if (!session) {
            sendJson(res, 401, { ok: false, message: "Not authenticated." });
            return;
        }

        const payload = await readJsonBody(req);
        const message = cleanText(payload.message, 2000);
        const botReply = cleanText(payload.botReply, 2000);

        if (!message) {
            sendJson(res, 400, { ok: false, message: "Message is required." });
            return;
        }

        await pool.query(
            "INSERT INTO chat_messages (user_id, role, message) VALUES (?, 'user', ?)",
            [session.user.id, message]
        );

        if (botReply) {
            await pool.query(
                "INSERT INTO chat_messages (user_id, role, message) VALUES (?, 'bot', ?)",
                [session.user.id, botReply]
            );
        }

        sendJson(res, 201, { ok: true });
        return;
    }

    sendJson(res, 404, {
        ok: false,
        message: "API route not found."
    });
}

function isDatabaseReadyForRoute(pathname) {
    if (pool) {
        return true;
    }

    return [
        "/api/health",
        "/api/auth/captcha",
        "/api/aadhar/verify"
    ].includes(pathname);
}

async function serveStaticFile(req, res, requestPath) {
    const normalizedRequestPath = requestPath.replace(/^\/+/, "");
    const relativePath = requestPath === "/"
        ? "index.html"
        : normalizedRequestPath.startsWith("prototype/")
            ? normalizedRequestPath.slice("prototype/".length)
            : normalizedRequestPath;
    const safePath = path.resolve(path.join(PUBLIC_DIR, relativePath));

    if (safePath !== PUBLIC_DIR && !safePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
        sendText(res, 403, "Access denied.");
        return;
    }

    let filePath = safePath;
    let stats;

    try {
        stats = await fs.stat(filePath);
    } catch {
        sendText(res, 404, "Page not found.");
        return;
    }

    if (stats.isDirectory()) {
        filePath = path.join(filePath, "index.html");
    }

    const content = await fs.readFile(filePath);
    const contentType = getContentType(path.extname(filePath));

    res.writeHead(200, {
        "Content-Type": contentType
    });

    if (req.method === "HEAD") {
        res.end();
        return;
    }

    res.end(content);
}

async function initializeDatabase() {
    const adminConnection = await mysql.createConnection({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password
    });

    try {
        await adminConnection.query(
            `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(config.db.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
    } finally {
        await adminConnection.end();
    }

    pool = mysql.createPool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        connectionLimit: 10
    });

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            username VARCHAR(80) DEFAULT NULL,
            full_name VARCHAR(80) NOT NULL,
            email VARCHAR(120) NOT NULL,
            phone VARCHAR(20) DEFAULT NULL,
            password_hash CHAR(128) NOT NULL,
            password_salt CHAR(32) NOT NULL,
            aadhar_number VARCHAR(20) DEFAULT NULL,
            aadhar_status ENUM('pending','verified','review','failed') NOT NULL DEFAULT 'pending',
            aadhar_summary TEXT DEFAULT NULL,
            aadhar_verified_at DATETIME DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY users_email_unique (email),
            UNIQUE KEY users_username_unique (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await ensureUsersTableShape();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            session_token_hash CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY user_sessions_token_unique (session_token_hash),
            KEY user_sessions_user_id_index (user_id),
            CONSTRAINT user_sessions_user_fk
                FOREIGN KEY (user_id) REFERENCES users (id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS farmer_profiles (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            farmer_name VARCHAR(120) NOT NULL,
            mobile_number VARCHAR(20) NOT NULL,
            village VARCHAR(120) DEFAULT NULL,
            taluka VARCHAR(120) DEFAULT NULL,
            district VARCHAR(120) DEFAULT NULL,
            state VARCHAR(120) DEFAULT NULL,
            full_address VARCHAR(255) DEFAULT NULL,
            land_area DECIMAL(10,2) DEFAULT NULL,
            main_crop VARCHAR(120) DEFAULT NULL,
            farming_type VARCHAR(120) DEFAULT NULL,
            latitude DECIMAL(11,6) DEFAULT NULL,
            longitude DECIMAL(11,6) DEFAULT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY farmer_profiles_user_unique (user_id),
            CONSTRAINT farmer_profiles_user_fk
                FOREIGN KEY (user_id) REFERENCES users (id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS labour_posts (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            work_type VARCHAR(120) NOT NULL,
            labour_count INT NOT NULL,
            required_date DATE NOT NULL,
            required_time VARCHAR(20) NOT NULL,
            location VARCHAR(255) NOT NULL,
            notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY labour_posts_user_id_index (user_id),
            CONSTRAINT labour_posts_user_fk
                FOREIGN KEY (user_id) REFERENCES users (id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS labour_applications (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            labour_post_id BIGINT UNSIGNED NOT NULL,
            labour_registration_id BIGINT UNSIGNED NOT NULL,
            applicant_name VARCHAR(120) NOT NULL,
            applicant_contact VARCHAR(20) DEFAULT NULL,
            message VARCHAR(400) DEFAULT NULL,
            status ENUM('applied','accepted','rejected') NOT NULL DEFAULT 'applied',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY labour_applications_post_index (labour_post_id),
            KEY labour_applications_registration_index (labour_registration_id),
            CONSTRAINT labour_applications_post_fk
                FOREIGN KEY (labour_post_id) REFERENCES labour_posts (id)
                ON DELETE CASCADE,
            CONSTRAINT labour_applications_registration_fk
                FOREIGN KEY (labour_registration_id) REFERENCES labour_registrations (id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            role ENUM('user','bot') NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY chat_messages_user_id_index (user_id),
            CONSTRAINT chat_messages_user_fk
                FOREIGN KEY (user_id) REFERENCES users (id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS labour_registrations (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED DEFAULT NULL,
            registration_type ENUM('self','group') NOT NULL,
            head_name VARCHAR(120) NOT NULL,
            contact_number VARCHAR(20) NOT NULL,
            address VARCHAR(255) DEFAULT NULL,
            aadhar_number VARCHAR(20) DEFAULT NULL,
            aadhar_status ENUM('pending','verified','review','failed') NOT NULL DEFAULT 'pending',
            aadhar_summary TEXT DEFAULT NULL,
            username VARCHAR(80) NOT NULL,
            password_hash CHAR(128) NOT NULL,
            password_salt CHAR(32) NOT NULL,
            verification_note VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY labour_registrations_user_id_index (user_id),
            CONSTRAINT labour_registrations_user_fk
                FOREIGN KEY (user_id) REFERENCES users (id)
                ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS labour_group_members (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            labour_registration_id BIGINT UNSIGNED NOT NULL,
            member_name VARCHAR(120) NOT NULL,
            contact_number VARCHAR(20) DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY labour_group_members_registration_index (labour_registration_id),
            CONSTRAINT labour_group_members_fk
                FOREIGN KEY (labour_registration_id) REFERENCES labour_registrations (id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

async function ensureUsersTableShape() {
    await ensureColumn("users", "username", "username VARCHAR(80) DEFAULT NULL AFTER id");
    await ensureColumn("users", "aadhar_number", "aadhar_number VARCHAR(20) DEFAULT NULL AFTER password_salt");
    await ensureColumn("users", "aadhar_status", "aadhar_status ENUM('pending','verified','review','failed') NOT NULL DEFAULT 'pending' AFTER aadhar_number");
    await ensureColumn("users", "aadhar_summary", "aadhar_summary TEXT DEFAULT NULL AFTER aadhar_status");
    await ensureColumn("users", "aadhar_verified_at", "aadhar_verified_at DATETIME DEFAULT NULL AFTER aadhar_summary");

    await pool.query(`
        UPDATE users
        SET username = CONCAT('user_', id)
        WHERE username IS NULL OR TRIM(username) = ''
    `);
}

async function ensureColumn(tableName, columnName, definition) {
    const [rows] = await pool.query(
        `SHOW COLUMNS FROM ${quoteIdentifier(tableName)} LIKE ?`,
        [columnName]
    );

    if (rows.length) {
        return;
    }

    await pool.query(
        `ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${definition}`
    );
}

function buildConfig() {
    const mysqlUrl = (process.env.MYSQL_URL || "").trim();

    if (mysqlUrl) {
        const parsedUrl = new URL(mysqlUrl);

        if (parsedUrl.protocol !== "mysql:") {
            throw new Error("MYSQL_URL must start with mysql://");
        }

        return {
            app: {
                port: parseNumber(process.env.PORT, 3000),
                secret: process.env.APP_SECRET || randomBytes(32).toString("hex"),
                aiProvider: String(process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : "gemini")).toLowerCase(),
                geminiApiKey: process.env.GEMINI_API_KEY || "",
                geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash-latest",
                openaiApiKey: process.env.OPENAI_API_KEY || "",
                openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
                pythonAadharUrl: process.env.PYTHON_AADHAR_URL || "http://127.0.0.1:8000/verify"
            },
            db: {
                host: parsedUrl.hostname || "127.0.0.1",
                port: parseNumber(parsedUrl.port, 3306),
                user: decodeURIComponent(parsedUrl.username || "root"),
                password: decodeURIComponent(parsedUrl.password || ""),
                database: decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, "") || "agrishield")
            }
        };
    }

    return {
        app: {
            port: parseNumber(process.env.PORT, 3000),
            secret: process.env.APP_SECRET || randomBytes(32).toString("hex"),
            aiProvider: String(process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : "gemini")).toLowerCase(),
            geminiApiKey: process.env.GEMINI_API_KEY || "",
            geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash-latest",
            openaiApiKey: process.env.OPENAI_API_KEY || "",
            openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
            pythonAadharUrl: process.env.PYTHON_AADHAR_URL || "http://127.0.0.1:8000/verify"
        },
        db: {
            host: process.env.MYSQL_HOST || "127.0.0.1",
            port: parseNumber(process.env.MYSQL_PORT, 3306),
            user: process.env.MYSQL_USER || "root",
            password: process.env.MYSQL_PASSWORD || "",
            database: process.env.MYSQL_DATABASE || "agrishield"
        }
    };
}

function issueCaptcha() {
    const left = randomInt(2, 9);
    const right = randomInt(1, 9);
    const useAddition = Math.random() >= 0.5;
    const answer = useAddition ? left + right : left >= right ? left - right : right - left;
    const operator = useAddition ? "+" : "-";
    const firstValue = useAddition || left >= right ? left : right;
    const secondValue = useAddition || left >= right ? right : left;
    const expiresAt = Date.now() + CAPTCHA_TTL_MS;
    const nonce = randomBytes(12).toString("hex");
    const signature = signValue(`${answer}.${expiresAt}.${nonce}`);

    return {
        prompt: `What is ${firstValue} ${operator} ${secondValue}?`,
        token: Buffer.from(JSON.stringify({
            expiresAt,
            nonce,
            signature
        })).toString("base64url")
    };
}

function verifyCaptcha(answer, token) {
    if (!answer || !token) {
        return false;
    }

    let payload;

    try {
        payload = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    } catch {
        return false;
    }

    if (!payload || Date.now() > Number(payload.expiresAt)) {
        return false;
    }

    const expectedSignature = signValue(`${String(answer).trim()}.${payload.expiresAt}.${payload.nonce}`);
    return safeEqual(payload.signature, expectedSignature);
}

function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
    const computedHash = scryptSync(password, salt, 64).toString("hex");
    return safeEqual(expectedHash, computedHash);
}

async function createSession(userId) {
    const rawToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await pool.query(
        "INSERT INTO user_sessions (user_id, session_token_hash, expires_at) VALUES (?, ?, ?)",
        [
            userId,
            hashToken(rawToken),
            formatUtcDateTime(expiresAt)
        ]
    );

    return rawToken;
}

async function getSessionUser(req) {
    const rawToken = readCookie(req, SESSION_COOKIE_NAME);

    if (!rawToken) {
        return null;
    }

    const [rows] = await pool.query(
        `
        SELECT
            user_sessions.id AS sessionId,
            users.id,
            users.username,
            users.full_name AS fullName,
            users.email,
            users.phone
        FROM user_sessions
        INNER JOIN users ON users.id = user_sessions.user_id
        WHERE user_sessions.session_token_hash = ?
          AND user_sessions.expires_at > UTC_TIMESTAMP()
        LIMIT 1
        `,
        [hashToken(rawToken)]
    );

    if (rows.length === 0) {
        return null;
    }

    return {
        sessionId: rows[0].sessionId,
        user: {
            id: rows[0].id,
            username: rows[0].username,
            fullName: rows[0].fullName,
            email: rows[0].email,
            phone: rows[0].phone
        }
    };
}

async function readJsonBody(req) {
    const chunks = [];
    let totalLength = 0;

    for await (const chunk of req) {
        totalLength += chunk.length;

        if (totalLength > MAX_BODY_BYTES) {
            throw new RequestError(413, "Request body is too large.");
        }

        chunks.push(chunk);
    }

    const rawBody = Buffer.concat(chunks).toString("utf8").trim();

    if (!rawBody) {
        return {};
    }

    try {
        return JSON.parse(rawBody);
    } catch {
        throw new RequestError(400, "Invalid JSON request body.");
    }
}

function sendJson(res, statusCode, payload, headers = {}) {
    const body = JSON.stringify(payload);

    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        ...headers
    });

    res.end(body);
}

function sendText(res, statusCode, message) {
    res.writeHead(statusCode, {
        "Content-Type": "text/plain; charset=utf-8"
    });

    res.end(message);
}

function buildSessionCookie(token) {
    return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

function clearSessionCookie() {
    return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function readCookie(req, key) {
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
        return "";
    }

    const cookiePairs = cookieHeader.split(";");

    for (const pair of cookiePairs) {
        const [rawName, ...rawValue] = pair.trim().split("=");

        if (rawName === key) {
            return decodeURIComponent(rawValue.join("="));
        }
    }

    return "";
}

function getContentType(extension) {
    const typeMap = {
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".txt": "text/plain; charset=utf-8",
        ".webp": "image/webp"
    };

    return typeMap[extension] || "application/octet-stream";
}

function cleanText(value, maxLength) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function cleanDigits(value) {
    return String(value || "").replace(/\D/g, "");
}

function cleanAadhar(value) {
    const digits = cleanDigits(value).slice(0, 12);
    return digits.length === 12 ? digits : "";
}

function maskAadhar(value) {
    const digits = cleanDigits(value);

    if (digits.length < 4) {
        return "";
    }

    return `XXXX XXXX ${digits.slice(-4)}`;
}

function normalizeHolderName(value) {
    return cleanText(value, 120).toLowerCase();
}

function sanitizeAadharSummary(value, aadharNumber = "") {
    const maskedNumber = maskAadhar(aadharNumber);
    let summary = cleanText(value, 500);

    summary = summary.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, maskedNumber || "XXXX XXXX XXXX");

    if (aadharNumber) {
        summary = summary.replaceAll(aadharNumber, maskedNumber);
    }

    return summary;
}

function isSupportedImageDataUrl(value) {
    return /^data:image\/(png|jpeg|jpg|webp);base64,[a-z0-9+/=]+$/i.test(String(value || ""));
}

function issueAadharVerificationToken({ aadharNumber, holderName, status, summary }) {
    const normalizedName = normalizeHolderName(holderName);
    const sanitizedSummary = sanitizeAadharSummary(summary, aadharNumber);
    const expiresAt = Date.now() + AADHAR_VERIFICATION_TTL_MS;
    const nonce = randomBytes(12).toString("hex");
    const aadharHash = hashToken(`aadhar:${aadharNumber}`);
    const holderHash = hashToken(`holder:${normalizedName}`);
    const signature = signValue(`${status}.${expiresAt}.${nonce}.${aadharHash}.${holderHash}.${sanitizedSummary}`);

    return Buffer.from(JSON.stringify({
        status,
        expiresAt,
        nonce,
        aadharHash,
        holderHash,
        summary: sanitizedSummary,
        signature
    })).toString("base64url");
}

function readAadharVerificationToken(token, { aadharNumber, holderName }) {
    if (!token || !aadharNumber || !holderName) {
        return null;
    }

    let payload;

    try {
        payload = JSON.parse(Buffer.from(String(token), "base64url").toString("utf8"));
    } catch {
        return null;
    }

    if (!payload || Date.now() > Number(payload.expiresAt)) {
        return null;
    }

    const aadharHash = hashToken(`aadhar:${aadharNumber}`);
    const holderHash = hashToken(`holder:${normalizeHolderName(holderName)}`);
    const expectedSignature = signValue(`${payload.status}.${payload.expiresAt}.${payload.nonce}.${aadharHash}.${holderHash}.${payload.summary || ""}`);

    if (payload.aadharHash !== aadharHash || payload.holderHash !== holderHash || !safeEqual(payload.signature, expectedSignature)) {
        return null;
    }

    return {
        status: normalizeAadharStatus(payload.status),
        summary: sanitizeAadharSummary(payload.summary || "", aadharNumber)
    };
}

async function analyzeAadharWithAI({ imageBase64, holderName, aadharNumber }) {
    // Prefer python verifier when configured; it returns verified/review/failed with summary.
    if (config.app.pythonAadharUrl) {
        const pythonResult = await analyzeAadharWithPython({ imageBase64, holderName, aadharNumber });
        if (pythonResult?.status === "verified" || pythonResult?.status === "review") {
            return pythonResult;
        }
        // If python gave a hard failure, continue to cloud AI below.
    }

    if (config.app.aiProvider === "openai") {
        if (config.app.openaiApiKey) {
            return analyzeAadharWithOpenAI({ imageBase64, holderName, aadharNumber });
        }

        if (config.app.geminiApiKey) {
            return analyzeAadharWithGemini({ imageBase64, holderName, aadharNumber });
        }
    } else {
        if (config.app.geminiApiKey) {
            return analyzeAadharWithGemini({ imageBase64, holderName, aadharNumber });
        }

        if (config.app.openaiApiKey) {
            return analyzeAadharWithOpenAI({ imageBase64, holderName, aadharNumber });
        }
    }

    return {
        status: "failed",
        score: 0.15,
        summary: sanitizeAadharSummary("Verification failed: no Gemini or OpenAI API key is configured.", aadharNumber)
    };
}

async function analyzeAadharWithPython({ imageBase64, holderName, aadharNumber }) {
    const fetchImpl = globalThis.fetch;

    if (!fetchImpl) {
        return {
            status: "review",
            score: 0.35,
            summary: sanitizeAadharSummary("Python service unavailable (fetch missing). Marked for review.", aadharNumber)
        };
    }

    try {
        const response = await fetchImpl(config.app.pythonAadharUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ holderName, aadharNumber, imageBase64 })
        });

        if (!response.ok) {
            const body = await safeJson(response);
            console.warn("Python verifier non-OK", response.status, body);
            return {
                status: "review",
                score: 0.35,
                summary: sanitizeAadharSummary(`Python verifier returned ${response.status}. Marked for manual review.`, aadharNumber)
            };
        }

        const data = await response.json();

        return {
            status: normalizeAadharStatus(data.status || "review"),
            score: Number(data.score || 0.35),
            summary: sanitizeAadharSummary(data.summary || "Python verifier response received.", aadharNumber)
        };
    } catch (error) {
        console.warn("Python verifier failed", error?.message || error);
        return {
            status: "review",
            score: 0.35,
            summary: sanitizeAadharSummary("Python verifier request failed. Marked for review.", aadharNumber)
        };
    }
}

async function analyzeAadharWithGemini({ imageBase64, holderName, aadharNumber }) {
    const fetchImpl = globalThis.fetch;

    if (!fetchImpl) {
        return {
            status: "failed",
            score: 0.15,
            summary: sanitizeAadharSummary("Verification failed: fetch unavailable in runtime.", aadharNumber)
        };
    }

    const { mimeType, dataBase64 } = parseBase64Image(imageBase64);

    if (!dataBase64) {
        return {
            status: "failed",
            score: 0.15,
            summary: "Verification failed: unsupported Aadhar image format."
        };
    }
    const prompt = [
        "Review the uploaded identity card image for a prototype Aadhar verification step.",
        "Do not output the full Aadhar number in the summary.",
        holderName ? `Expected name: ${holderName}.` : "",
        aadharNumber ? `Expected Aadhar ending with ${aadharNumber.slice(-4)}.` : "",
        "Check whether the image looks like an Aadhar card, whether it mentions Government of India, and whether the name and Aadhar number appear to match."
    ].filter(Boolean).join(" ");

    const body = {
        contents: [
            {
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: dataBase64
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    verdict: { type: "STRING", enum: ["verified", "review", "failed"] },
                    confidence: { type: "NUMBER" },
                    document_type: { type: "STRING" },
                    mentions_government_of_india: { type: "BOOLEAN" },
                    matches_name: { type: "BOOLEAN" },
                    matches_aadhar_number: { type: "BOOLEAN" },
                    summary: { type: "STRING" },
                    concerns: {
                        type: "ARRAY",
                        items: { type: "STRING" }
                    }
                },
                required: [
                    "verdict",
                    "confidence",
                    "document_type",
                    "mentions_government_of_india",
                    "matches_name",
                    "matches_aadhar_number",
                    "summary",
                    "concerns"
                ]
            }
        }
    };

    const geminiModels = Array.from(new Set([
        config.app.geminiModel || "gemini-1.5-flash-latest",
        "gemini-1.5-flash-latest"
    ]));
    let sawRateLimit = false;

    for (const modelName of geminiModels) {
        let response;

        try {
            response = await fetchImpl(
                `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": config.app.geminiApiKey
                    },
                    body: JSON.stringify(body)
                }
            );
        } catch (error) {
            console.warn("Gemini request failed:", error?.message || error);
            continue;
        }

        if (response.status === 429) {
            sawRateLimit = true;
            await sleep(350);
            continue;
        }

        if (!response.ok) {
            console.warn("Gemini non-OK", modelName, response.status, await safeJson(response));
            return {
                status: "review",
                score: 0.35,
                summary: sanitizeAadharSummary(`Gemini returned ${response.status}. Marked for manual review instead of failing.`, aadharNumber)
            };
        }

        const data = await response.json();
        const jsonText = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
        const parsed = parseStructuredJsonText(jsonText);

        if (!parsed) {
            return {
                status: "review",
                score: 0.35,
                summary: sanitizeAadharSummary("Gemini returned an unreadable response. Marked for manual review.", aadharNumber)
            };
        }

        return buildAadharAnalysisResult(parsed, aadharNumber);
    }

    if (sawRateLimit) {
        return {
            status: "review",
            score: 0.35,
            summary: sanitizeAadharSummary(
                "Gemini quota is temporarily exhausted. Basic document checks passed, so the Aadhar was marked for manual review instead of failing.",
                aadharNumber
            )
        };
    }

    return {
        status: "review",
        score: 0.35,
        summary: sanitizeAadharSummary("Gemini request failed. Marked for manual review.", aadharNumber)
    };
}

async function analyzeAadharWithOpenAI({ imageBase64, holderName, aadharNumber }) {
    const fallbackResult = (reason) => {
        const digitsOk = Boolean(aadharNumber && aadharNumber.length >= 8);
        const nameOk = Boolean(holderName);
        return {
            status: "review",
            score: 0.55,
            summary: sanitizeAadharSummary(
                `AI check skipped: ${reason}. Name provided: ${nameOk ? "yes" : "no"}. Aadhar digits provided: ${digitsOk ? "yes" : "no"}.`,
                aadharNumber
            )
        };
    };

    const geminiKey = config.app.geminiApiKey;

    if (!geminiKey) {
        return fallbackResult("Gemini API key is not configured");
    }

    const fetchImpl = globalThis.fetch;

    if (!fetchImpl) {
        return fallbackResult("fetch unavailable in runtime");
    }

    const { mimeType, dataBase64 } = parseBase64Image(imageBase64);
    const prompt = [
        "Review the uploaded identity card image for a prototype Aadhar verification step.",
        "Do not output the full Aadhar number in the summary.",
        holderName ? `Expected name: ${holderName}.` : "",
        aadharNumber ? `Expected Aadhar ending with ${aadharNumber.slice(-4)}.` : "",
        "Check whether the image looks like an Aadhar card, whether it mentions Government of India, and whether the name and Aadhar number appear to match."
    ].filter(Boolean).join(" ");

    const schema = {
        type: "object",
        additionalProperties: false,
        properties: {
            verdict: { type: "string", enum: ["verified", "review", "failed"] },
            confidence: { type: "number" },
            document_type: { type: "string" },
            mentions_government_of_india: { type: "boolean" },
            matches_name: { type: "boolean" },
            matches_aadhar_number: { type: "boolean" },
            summary: { type: "string" },
            concerns: {
                type: "array",
                items: { type: "string" }
            }
        },
        required: [
            "verdict",
            "confidence",
            "document_type",
            "mentions_government_of_india",
            "matches_name",
            "matches_aadhar_number",
            "summary",
            "concerns"
        ]
    };

    const body = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: dataBase64
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: schema
        }
    };

    const model = config.app.geminiModel || "gemini-1.5-flash-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`;

    let response;

    try {
        response = await fetchImpl(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
    } catch (error) {
        console.warn("Gemini request failed, using fallback:", error?.message || error);
        return fallbackResult("Gemini request failed");
    }

    if (!response.ok) {
        console.warn("Gemini returned non-OK status", response.status, await safeJson(response));
        return fallbackResult(`Gemini returned ${response.status}`);
    }

    const data = await response.json();
    const parsed = parseGeminiModelResponse(data);

    if (!parsed) {
        return fallbackResult("Gemini returned an unreadable response");
    }

    return buildAadharAnalysisResult(parsed, aadharNumber);
}

function parseGeminiModelResponse(data) {
    const parts = data?.candidates?.[0]?.content?.parts;
    const textPart = Array.isArray(parts) ? parts.find((part) => typeof part.text === "string")?.text : "";
    return parseStructuredJsonText(textPart || "");
}

function parseBase64Image(raw) {
    const match = /^data:([^;]+);base64,(.*)$/i.exec(String(raw || ""));

    if (match) {
        return {
            mimeType: match[1] || "image/jpeg",
            dataBase64: match[2] || ""
        };
    }

    return {
        mimeType: "image/jpeg",
        dataBase64: String(raw || "").replace(/^data:[^;]+;base64,/, "")
    };
}

function parseStructuredJsonText(jsonText) {
    if (!jsonText) {
        return null;
    }

    try {
        return JSON.parse(jsonText);
    } catch {
        return null;
    }
}

function buildAadharAnalysisResult(parsed, aadharNumber) {
    let score = Math.max(0, Math.min(1, Number(parsed.confidence || 0)));

    if (parsed.mentions_government_of_india) {
        score += 0.1;
    }

    if (parsed.matches_name) {
        score += 0.1;
    }

    if (parsed.matches_aadhar_number) {
        score += 0.1;
    }

    score = Math.max(0, Math.min(1, score));

    const concerns = Array.isArray(parsed.concerns) ? parsed.concerns.filter(Boolean) : [];
    const summaryParts = [
        sanitizeAadharSummary(parsed.summary || "", aadharNumber),
        concerns.length ? `Concerns: ${concerns.map((item) => cleanText(item, 80)).join(", ")}.` : ""
    ].filter(Boolean);

    const status = parsed.verdict === "verified"
        && parsed.matches_name
        && parsed.matches_aadhar_number
        && parsed.mentions_government_of_india
        ? "verified"
        : parsed.verdict === "review"
            ? "review"
            : "failed";

    return {
        status,
        score: Number(score.toFixed(2)),
        summary: summaryParts.join(" ").trim() || "No summary returned."
    };
}

async function safeJson(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function cleanPhone(value) {
    const normalized = String(value || "").trim().replace(/[^\d+\s-]/g, "").slice(0, 20);
    return normalized || null;
}

function normalizeAadharStatus(value) {
    const normalized = String(value || "pending").toLowerCase();
    if (["verified", "review", "failed", "pending"].includes(normalized)) {
        return normalized;
    }

    return "pending";
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function signValue(value) {
    return createHmac("sha256", config.app.secret).update(value).digest("hex");
}

function hashToken(value) {
    return createHash("sha256").update(value).digest("hex");
}

function safeEqual(left, right) {
    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
}

function formatUtcDateTime(date) {
    const iso = date.toISOString().slice(0, 19);
    return iso.replace("T", " ");
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function parseNumber(value, fallbackValue) {
    const parsed = Number.parseInt(String(value || ""), 10);
    return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function quoteIdentifier(value) {
    return `\`${String(value).replace(/`/g, "``")}\``;
}

function loadEnvFile(filePath) {
    if (!existsSync(filePath)) {
        return;
    }

    const fileContent = readFileSync(filePath, "utf8");

    for (const rawLine of fileContent.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (!line || line.startsWith("#")) {
            continue;
        }

        const separatorIndex = line.indexOf("=");

        if (separatorIndex === -1) {
            continue;
        }

        const key = line.slice(0, separatorIndex).trim();
        let value = line.slice(separatorIndex + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}
