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
const MAX_BODY_BYTES = 1_000_000;
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

loadEnvFile(path.join(__dirname, ".env"));

const config = buildConfig();
let pool;

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

initializeDatabase()
    .then(() => {
        server.listen(config.app.port, () => {
            console.log(`AgriShield server running at http://localhost:${config.app.port}`);
        });
    })
    .catch((error) => {
        console.error("Failed to start AgriShield:", error.message);
        process.exitCode = 1;
    });

async function routeRequest(req, res) {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (requestUrl.pathname.startsWith("/api/")) {
        await handleApiRequest(req, res, requestUrl);
        return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
        sendText(res, 405, "Method not allowed.");
        return;
    }

    await serveStaticFile(req, res, requestUrl.pathname);
}

async function handleApiRequest(req, res, requestUrl) {
    if (req.method === "GET" && requestUrl.pathname === "/api/health") {
        sendJson(res, 200, {
            ok: true,
            message: "AgriShield API is running."
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

        sendJson(res, 200, {
            ok: true,
            authenticated: true,
            user: session.user
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

    sendJson(res, 404, {
        ok: false,
        message: "API route not found."
    });
}

async function serveStaticFile(req, res, requestPath) {
    const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
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
            full_name VARCHAR(80) NOT NULL,
            email VARCHAR(120) NOT NULL,
            phone VARCHAR(20) DEFAULT NULL,
            password_hash CHAR(128) NOT NULL,
            password_salt CHAR(32) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY users_email_unique (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

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
                secret: process.env.APP_SECRET || randomBytes(32).toString("hex")
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
            secret: process.env.APP_SECRET || randomBytes(32).toString("hex")
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

function cleanPhone(value) {
    const normalized = String(value || "").trim().replace(/[^\d+\s-]/g, "").slice(0, 20);
    return normalized || null;
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
