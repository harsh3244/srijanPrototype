(function () {
    const STORAGE_KEYS = {
        users: "agrishield_auth_users",
        session: "agrishield_auth_session"
    };

    const USER_STORAGE_KEYS = {
        profile: "agrishield_labour_profile",
        labourPosts: "agrishield_labour_posts",
        chatHistory: "agrishield_labour_chat_history",
        activeView: "agrishield_labour_active_view"
    };

    const VIEW_META = {
        home: {
            title: "Home",
            subtitle: "Save farmer details and unlock labour, AI, and scheme recommendations."
        },
        labour: {
            title: "Labour Finding",
            subtitle: "Browse available labour, use filters, and post labour requirements."
        },
        chatbot: {
            title: "AI Chatbot",
            subtitle: "Ask for labour advice, crop help, worker shortage guidance, and scheme support."
        },
        schemes: {
            title: "Government Schemes",
            subtitle: "Review scheme matches based on land size, crop type, and farmer profile."
        }
    };

    const DEMO_USER = {
        username: "demo_farmer",
        mobile: "9876543210",
        password: "demo1234"
    };

    const LABOUR_HEAVY_CROPS = ["sugarcane", "rice", "cotton", "tomato", "onion"];
    const DEFAULT_CHAT_GREETING = {
        role: "bot",
        text: "Namaste. I can help with labour planning, crop work, labour shortage handling, and useful farmer schemes. Ask me a question or tap a quick prompt."
    };

    const state = {
        session: null,
        profile: null,
        labourPosts: [],
        chatHistory: [],
        activeView: "home",
        activeSchemeFilter: "all"
    };
    const mapState = {
        instance: null,
        marker: null,
        form: null,
        searchResults: []
    };

    const page = document.body.dataset.page;

    document.addEventListener("DOMContentLoaded", () => {
        if (page === "login") {
            initLoginPage();
        }

        if (page === "register") {
            initRegisterPage();
        }

        if (page === "dashboard") {
            initDashboardPage();
        }
    });

    function initLoginPage() {
        if (hasActiveSession()) {
            window.location.replace("dashboard.html");
            return;
        }

        const loginForm = document.getElementById("login-form");
        const demoLoginButton = document.getElementById("demo-login-button");
        const captchaRefreshButton = document.getElementById("captcha-refresh");
        const feedback = document.getElementById("login-feedback");

        if (!loginForm) {
            return;
        }

        generateCaptcha(loginForm);
        clearAuthFeedback(feedback);

        captchaRefreshButton?.addEventListener("click", () => {
            generateCaptcha(loginForm);
            loginForm.elements.captchaAnswer.value = "";
        });

        demoLoginButton?.addEventListener("click", () => {
            ensureDemoUser();
            loginForm.elements.username.value = DEMO_USER.username;
            loginForm.elements.password.value = DEMO_USER.password;
            loginForm.elements.captchaAnswer.value = loginForm.dataset.captchaAnswer || "";
            clearAuthFeedback(feedback);
            showToast("Demo login details added.");
        });

        attachAuthFieldListeners(loginForm, feedback);

        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const formData = new FormData(loginForm);
            const username = cleanText(formData.get("username"));
            const password = String(formData.get("password") || "");
            const captchaAnswer = cleanText(formData.get("captchaAnswer"));
            const expectedCaptcha = loginForm.dataset.captchaAnswer || "";

            if (!username || !password || !captchaAnswer) {
                setAuthFeedback(feedback, "error", "Fill username, password, and CAPTCHA.");
                showToast("Fill all login fields.");
                return;
            }

            if (captchaAnswer !== expectedCaptcha) {
                setAuthFeedback(feedback, "error", "CAPTCHA answer is incorrect. Try again.");
                loginForm.elements.captchaAnswer.value = "";
                generateCaptcha(loginForm);
                showToast("Incorrect CAPTCHA.");
                return;
            }

            const user = findUserByUsername(username);

            if (!user || user.password !== password) {
                setAuthFeedback(feedback, "error", "Username or password is incorrect.");
                loginForm.elements.password.value = "";
                loginForm.elements.captchaAnswer.value = "";
                generateCaptcha(loginForm);
                showToast("Invalid login credentials.");
                return;
            }

            const session = {
                isLoggedIn: true,
                username: user.username,
                mobile: user.mobile,
                loginAt: new Date().toISOString()
            };

            setStoredValue(STORAGE_KEYS.session, session);
            setStoredValue(getUserStorageKey(USER_STORAGE_KEYS.activeView, user.username), "home");
            clearAuthFeedback(feedback);
            setAuthFeedback(feedback, "success", "Login successful. Redirecting to dashboard...");
            showToast("Login successful.");

            window.setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 500);
        });
    }

    function initRegisterPage() {
        if (hasActiveSession()) {
            window.location.replace("dashboard.html");
            return;
        }

        const registerForm = document.getElementById("register-form");
        const demoRegisterButton = document.getElementById("demo-register-button");
        const feedback = document.getElementById("register-feedback");

        if (!registerForm) {
            return;
        }

        clearAuthFeedback(feedback);

        demoRegisterButton?.addEventListener("click", () => {
            registerForm.elements.username.value = DEMO_USER.username;
            registerForm.elements.mobile.value = DEMO_USER.mobile;
            registerForm.elements.password.value = DEMO_USER.password;
            registerForm.elements.confirmPassword.value = DEMO_USER.password;
            clearAuthFeedback(feedback);
            showToast("Demo registration details added.");
        });

        attachAuthFieldListeners(registerForm, feedback);

        registerForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const formData = new FormData(registerForm);
            const username = cleanText(formData.get("username"));
            const mobile = cleanNumber(formData.get("mobile"));
            const password = String(formData.get("password") || "");
            const confirmPassword = String(formData.get("confirmPassword") || "");

            if (!username || !mobile || !password || !confirmPassword) {
                setAuthFeedback(feedback, "error", "All registration fields are required.");
                showToast("Fill all registration fields.");
                return;
            }

            if (username.length < 3) {
                setAuthFeedback(feedback, "error", "Username should be at least 3 characters.");
                showToast("Invalid username.");
                return;
            }

            if (mobile.length < 10) {
                setAuthFeedback(feedback, "error", "Enter a valid mobile number.");
                showToast("Invalid mobile number.");
                return;
            }

            if (password !== confirmPassword) {
                setAuthFeedback(feedback, "error", "Password and confirm password do not match.");
                registerForm.elements.confirmPassword.value = "";
                showToast("Passwords do not match.");
                return;
            }

            if (findUserByUsername(username)) {
                setAuthFeedback(feedback, "error", "This username is already registered. Use another one.");
                showToast("Username already exists.");
                return;
            }

            const users = getUsers();

            users.push({
                username,
                usernameKey: normalizeUsername(username),
                mobile,
                password,
                createdAt: new Date().toISOString()
            });

            setStoredValue(STORAGE_KEYS.users, users);
            registerForm.reset();
            setAuthFeedback(feedback, "success", "Registration successful. Redirecting to login...");
            showToast("Registration successful.");

            window.setTimeout(() => {
                window.location.href = "login.html";
            }, 700);
        });
    }

    function initDashboardPage() {
        const session = getStoredValue(STORAGE_KEYS.session, null);

        if (!session?.isLoggedIn) {
            window.location.replace("login.html");
            return;
        }

        state.session = session;
        state.profile = getUserStoredValue(USER_STORAGE_KEYS.profile, {});
        state.labourPosts = getUserStoredValue(USER_STORAGE_KEYS.labourPosts, []);
        state.chatHistory = getUserStoredValue(USER_STORAGE_KEYS.chatHistory, []);
        state.activeView = getUserStoredValue(USER_STORAGE_KEYS.activeView, "home");

        if (!state.chatHistory.length) {
            state.chatHistory = [DEFAULT_CHAT_GREETING];
            setUserStoredValue(USER_STORAGE_KEYS.chatHistory, state.chatHistory);
        }

        bindSidebar();
        bindTopbar();
        bindHomeSection();
        bindLabourSection();
        bindChatSection();
        bindSchemesSection();

        refreshGlobalUI();
        setActiveView(state.activeView);
    }

    function bindSidebar() {
        const navButtons = document.querySelectorAll("[data-nav]");
        const jumpButtons = document.querySelectorAll("[data-jump-view]");
        const sidebar = document.querySelector("[data-sidebar]");
        const backdrop = document.querySelector("[data-sidebar-backdrop]");
        const sidebarOpenButton = document.querySelector("[data-sidebar-open]");
        const sidebarCloseButton = document.querySelector("[data-sidebar-close]");

        navButtons.forEach((button) => {
            button.addEventListener("click", () => {
                setActiveView(button.dataset.nav);
                closeSidebar();
            });
        });

        jumpButtons.forEach((button) => {
            button.addEventListener("click", () => {
                setActiveView(button.dataset.jumpView);
            });
        });

        sidebarOpenButton?.addEventListener("click", () => {
            document.body.classList.add("sidebar-open");
        });

        sidebarCloseButton?.addEventListener("click", closeSidebar);
        backdrop?.addEventListener("click", closeSidebar);

        function closeSidebar() {
            if (sidebar) {
                document.body.classList.remove("sidebar-open");
            }
        }
    }

    function bindTopbar() {
        const logoutButton = document.getElementById("logout-button");

        logoutButton?.addEventListener("click", () => {
            localStorage.removeItem(STORAGE_KEYS.session);
            showToast("Logged out successfully.");
            window.setTimeout(() => {
                window.location.href = "login.html";
            }, 350);
        });
    }

    function bindHomeSection() {
        const form = document.getElementById("farmer-details-form");

        if (!form) {
            return;
        }

        fillFormWithProfile(form, state.profile);
        prefillHomeFormDefaults(form);
        initLocationPicker(form);
        bindLocationSearch(form);

        form.addEventListener("submit", (event) => {
            event.preventDefault();

            const profile = readProfileFromForm(form);

            if (profile.farmerName.length < 2) {
                showToast("Enter a valid farmer name.");
                return;
            }

            if (profile.mobileNumber.length < 10) {
                showToast("Enter a valid mobile number.");
                return;
            }

            state.profile = profile;
            setUserStoredValue(USER_STORAGE_KEYS.profile, profile);
            refreshGlobalUI();
            syncMapSelectionFromProfile(profile);
            renderLabourCards();
            renderMatchedLabourSuggestions();
            renderSchemesView();
            prefillLabourFormDefaults(document.getElementById("labour-need-form"));
            showToast("Farmer details saved successfully.");
        });

        refreshHomeSection();
    }

    function bindLabourSection() {
        const resetButton = document.getElementById("labour-reset-button");
        const filterElements = [
            document.getElementById("labour-filter-work"),
            document.getElementById("labour-filter-type"),
            document.getElementById("labour-filter-location"),
            document.getElementById("labour-filter-count"),
            document.getElementById("labour-filter-availability")
        ];
        const postForm = document.getElementById("labour-need-form");
        const labourCards = document.getElementById("labour-cards");

        filterElements.forEach((element) => {
            element?.addEventListener("input", renderLabourCards);
            element?.addEventListener("change", renderLabourCards);
        });

        resetButton?.addEventListener("click", () => {
            filterElements.forEach((element) => {
                if (!element) {
                    return;
                }

                if (element.tagName === "SELECT") {
                    element.selectedIndex = 0;
                } else {
                    element.value = "";
                }
            });

            renderLabourCards();
        });

        labourCards?.addEventListener("click", (event) => {
            const detailsButton = event.target.closest("[data-labour-details]");

            if (!detailsButton) {
                return;
            }

            const labourer = window.AgriMockData.labourers.find((item) => item.id === detailsButton.dataset.labourDetails);

            if (labourer) {
                showToast(labourer.details);
            }
        });

        prefillLabourFormDefaults(postForm);

        postForm?.elements.workType?.addEventListener("change", () => {
            renderMatchedLabourSuggestions(postForm.elements.workType.value);
        });

        postForm?.addEventListener("submit", (event) => {
            event.preventDefault();

            const formData = new FormData(postForm);
            const requirement = {
                id: `post-${Date.now()}`,
                workType: cleanText(formData.get("workType")),
                labourCount: cleanText(formData.get("labourCount")),
                requiredDate: cleanText(formData.get("requiredDate")),
                requiredTime: cleanText(formData.get("requiredTime")),
                location: cleanText(formData.get("location")),
                notes: cleanText(formData.get("notes")),
                createdAt: new Date().toLocaleDateString("en-IN")
            };

            if (!requirement.workType || !requirement.labourCount || !requirement.requiredDate || !requirement.location) {
                showToast("Complete the labour request form first.");
                return;
            }

            state.labourPosts.unshift(requirement);
            setUserStoredValue(USER_STORAGE_KEYS.labourPosts, state.labourPosts);
            postForm.reset();
            prefillLabourFormDefaults(postForm);
            renderMatchedLabourSuggestions();
            renderPostedLabourRequirements();
            refreshAlertCount();
            refreshHomeSection();
            showToast("Labour request posted successfully.");
        });

        renderLabourCards();
        renderMatchedLabourSuggestions();
        renderPostedLabourRequirements();
    }

    function bindChatSection() {
        const chatForm = document.getElementById("chat-form");
        const chatInput = document.getElementById("chat-input");
        const chipButtons = document.querySelectorAll("[data-chat-chip]");

        chipButtons.forEach((button) => {
            button.addEventListener("click", () => {
                sendChatMessage(button.dataset.chatChip);
            });
        });

        chatForm?.addEventListener("submit", (event) => {
            event.preventDefault();

            const message = cleanText(chatInput.value);

            if (!message) {
                return;
            }

            sendChatMessage(message);
            chatInput.value = "";
        });

        renderChatHistory();
    }

    function bindSchemesSection() {
        const filterButtons = document.querySelectorAll("[data-scheme-filter]");

        filterButtons.forEach((button) => {
            button.addEventListener("click", () => {
                state.activeSchemeFilter = button.dataset.schemeFilter;

                filterButtons.forEach((item) => {
                    item.classList.toggle("is-active", item === button);
                });

                renderSchemesView();
            });
        });

        renderSchemesView();
    }

    function refreshGlobalUI() {
        refreshTopbarProfile();
        refreshHomeSection();
        refreshAlertCount();
    }

    function refreshTopbarProfile() {
        const farmerName = state.profile?.farmerName || state.session?.username || "Farmer";
        const profileMeta = state.profile?.district
            ? `${state.profile.district}${state.profile.state ? `, ${state.profile.state}` : ""}`
            : state.profile?.village
                ? `${state.profile.village}${state.profile.state ? `, ${state.profile.state}` : ""}`
            : state.session?.mobile
                ? `Mobile: ${state.session.mobile}`
                : "Authenticated user";

        setText("[data-topbar-name]", farmerName);
        setText("[data-topbar-meta]", profileMeta);
        setText("[data-profile-avatar]", getInitials(farmerName));
    }

    function refreshAlertCount() {
        const nearbyWorkers = getNearbyWorkerTotal(state.profile);
        const schemeMatches = getRelevantSchemes(state.profile).slice(0, 3).length;
        const totalAlerts = Math.max(1, Math.min(9, state.labourPosts.length + schemeMatches + (nearbyWorkers ? 1 : 0)));
        setText("[data-alert-count]", String(totalAlerts));
    }

    function setActiveView(viewKey) {
        state.activeView = VIEW_META[viewKey] ? viewKey : "home";
        setUserStoredValue(USER_STORAGE_KEYS.activeView, state.activeView);

        document.querySelectorAll("[data-nav]").forEach((button) => {
            button.classList.toggle("is-active", button.dataset.nav === state.activeView);
        });

        document.querySelectorAll(".view-section").forEach((section) => {
            section.classList.toggle("is-active", section.dataset.view === state.activeView);
        });

        setText("[data-page-title]", VIEW_META[state.activeView].title);
        setText("[data-page-subtitle]", VIEW_META[state.activeView].subtitle);

        if (state.activeView === "home" && mapState.instance) {
            window.setTimeout(() => {
                mapState.instance.invalidateSize();
            }, 140);
        }

        if (state.activeView === "labour") {
            renderLabourCards();
            renderMatchedLabourSuggestions();
        }

        if (state.activeView === "schemes") {
            renderSchemesView();
        }
    }

    function refreshHomeSection() {
        const name = state.profile?.farmerName || state.session?.username || "Farmer";
        const recommendations = buildRecommendations(state.profile);
        const relevantSchemes = getRelevantSchemes(state.profile);
        const nearbyLabourers = getNearbyLabourers(state.profile);
        const summaryItems = buildProfileSummary(state.profile);

        setText("[data-home-welcome]", `Welcome ${name}, your farmer setup dashboard is ready.`);
        setText("[data-stat-name]", state.profile?.farmerName || "Not saved yet");
        setText("[data-stat-crop]", state.profile?.mainCrop || "Profile needed");
        setText("[data-stat-land]", state.profile?.landArea ? `${state.profile.landArea} acres` : "Profile needed");
        setText("[data-stat-schemes]", `${relevantSchemes.length} matches`);
        setText("[data-profile-state]", state.profile?.farmerName ? "Profile saved on this device" : "Complete the form for personalized help");

        renderHomeSummaryStats({
            nearbyWorkers: getNearbyWorkerTotal(state.profile),
            nearbyListings: nearbyLabourers.length,
            schemeCount: relevantSchemes.slice(0, 3).length,
            completionCount: getProfileCompletionCount(state.profile),
            hasMapLocation: Boolean(state.profile?.latitude && state.profile?.longitude)
        });
        renderProfileSummary(summaryItems);
        renderRecommendations(recommendations);

        if (recommendations.length) {
            setText("[data-home-next-step]", recommendations[0].title);
            setText("[data-home-next-detail]", recommendations[0].reason);
        } else {
            setText("[data-home-next-step]", "Save the farmer details and pick the farm location.");
            setText("[data-home-next-detail]", "The dashboard will use this saved profile to prepare labour, AI, and scheme suggestions in the next steps.");
        }
    }

    function renderHomeSummaryStats(summary) {
        const container = document.getElementById("home-summary-grid");

        if (!container) {
            return;
        }

        container.innerHTML = `
            <article class="stat-card stat-card--hero">
                <span class="stat-card__label">Nearby labour signals</span>
                <strong>${escapeHtml(String(summary.nearbyWorkers || 0))}</strong>
                <p>${escapeHtml(String(summary.nearbyListings || 0))} labour listings are matched from the saved farmer area.</p>
            </article>
            <article class="stat-card">
                <span class="stat-card__label">Profile completion</span>
                <strong>${escapeHtml(String(summary.completionCount || 0))}/10</strong>
                <p>Complete details improve the profile quality for the rest of the prototype.</p>
            </article>
            <article class="stat-card">
                <span class="stat-card__label">Suggested schemes</span>
                <strong>${escapeHtml(String(summary.schemeCount))}</strong>
                <p>Relevant support is ranked from land size, crop, and farming type.</p>
            </article>
            <article class="stat-card">
                <span class="stat-card__label">Map location</span>
                <strong>${summary.hasMapLocation ? "Selected" : "Pending"}</strong>
                <p>${summary.hasMapLocation ? "Farm coordinates are saved for this profile." : "Click the map to save the farm location."}</p>
            </article>
        `;
    }

    function renderProfileSummary(items) {
        const container = document.getElementById("profile-summary-grid");

        if (!container) {
            return;
        }

        container.innerHTML = items.map((item) => `
            <article class="summary-card">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(item.value)}</strong>
            </article>
        `).join("");
    }

    function renderRecommendations(recommendations) {
        const container = document.getElementById("recommendations-grid");

        if (!container) {
            return;
        }

        if (!recommendations.length) {
            container.innerHTML = `
                <div class="empty-state empty-state--wide">
                    <i class="ri-lightbulb-flash-line" aria-hidden="true"></i>
                    <strong>Save farmer details to see personalized recommendations.</strong>
                    <p>The Home page will recommend labour actions, AI help, and scheme support based on the farmer profile.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recommendations.map((item) => `
            <article class="service-card">
                <div class="service-card__icon"><i class="${escapeHtml(item.icon)}" aria-hidden="true"></i></div>
                <div class="service-card__copy">
                    <span>${escapeHtml(item.label)}</span>
                    <h4>${escapeHtml(item.title)}</h4>
                    <p>${escapeHtml(item.reason)}</p>
                </div>
                <button class="btn btn--ghost" type="button" data-jump-view="${escapeHtml(item.view)}">
                    Open
                </button>
            </article>
        `).join("");

        container.querySelectorAll("[data-jump-view]").forEach((button) => {
            button.addEventListener("click", () => {
                setActiveView(button.dataset.jumpView);
            });
        });
    }

    function renderLabourCards() {
        const cardsContainer = document.getElementById("labour-cards");
        const meta = document.getElementById("labour-result-meta");

        if (!cardsContainer || !meta) {
            return;
        }

        const workType = cleanText(document.getElementById("labour-filter-work")?.value).toLowerCase();
        const labourType = cleanText(document.getElementById("labour-filter-type")?.value).toLowerCase();
        const location = cleanText(document.getElementById("labour-filter-location")?.value).toLowerCase();
        const minimumCount = Number(document.getElementById("labour-filter-count")?.value || 0);
        const availability = cleanText(document.getElementById("labour-filter-availability")?.value).toLowerCase();

        const filtered = window.AgriMockData.labourers
            .filter((labourer) => {
                const skillsText = labourer.skills.join(" ").toLowerCase();
                const matchesWork = !workType || labourer.workType.toLowerCase() === workType || skillsText.includes(workType);
                const matchesType = !labourType || labourer.type.toLowerCase() === labourType;
                const matchesLocation = !location || labourer.location.toLowerCase().includes(location);
                const matchesCount = labourer.availableCount >= minimumCount;
                const matchesAvailability = !availability || labourer.availability.toLowerCase() === availability;

                return matchesWork && matchesType && matchesLocation && matchesCount && matchesAvailability;
            })
            .sort((a, b) => getLocationScore(b.location, state.profile) - getLocationScore(a.location, state.profile));

        meta.textContent = `${filtered.length} labour options match the current filters.`;

        if (!filtered.length) {
            cardsContainer.innerHTML = `
                <div class="empty-state empty-state--wide">
                    <i class="ri-team-line" aria-hidden="true"></i>
                    <strong>No labourers match these filters.</strong>
                    <p>Reset filters or post a labour request so the demo still shows the core workflow.</p>
                </div>
            `;
            return;
        }

        cardsContainer.innerHTML = filtered.map((labourer) => `
            <article class="labour-card">
                <div class="card-topline">
                    <span class="status-pill status-pill--soft">${escapeHtml(labourer.type)}</span>
                    <span class="status-pill ${labourer.availability === "Limited availability" ? "status-pill--warning" : "status-pill--success"}">${escapeHtml(labourer.availability)}</span>
                </div>
                <h4>${escapeHtml(labourer.name)}</h4>
                <div class="detail-list">
                    <span><i class="ri-briefcase-3-line" aria-hidden="true"></i>${escapeHtml(labourer.workType)}</span>
                    <span><i class="ri-group-line" aria-hidden="true"></i>${escapeHtml(String(labourer.availableCount))} workers</span>
                    <span><i class="ri-map-pin-line" aria-hidden="true"></i>${escapeHtml(labourer.location)}</span>
                </div>
                <p>${escapeHtml(labourer.skills.join(", "))}</p>
                <div class="card-actions">
                    <a class="btn btn--secondary btn--compact" href="tel:${escapeHtml(labourer.contact)}">Contact</a>
                    <button class="btn btn--ghost btn--compact" type="button" data-labour-details="${escapeHtml(labourer.id)}">View Details</button>
                </div>
            </article>
        `).join("");
    }

    function renderMatchedLabourSuggestions(selectedWorkType) {
        const container = document.getElementById("matched-labour-list");
        const preferredWorkType = cleanText(selectedWorkType || document.querySelector("#labour-need-form select[name='workType']")?.value);

        if (!container) {
            return;
        }

        const matches = window.AgriMockData.labourers
            .filter((labourer) => {
                if (preferredWorkType) {
                    return labourer.workType === preferredWorkType;
                }

                return getLocationScore(labourer.location, state.profile) > 0;
            })
            .sort((a, b) => {
                const scoreDiff = getLocationScore(b.location, state.profile) - getLocationScore(a.location, state.profile);
                return scoreDiff || b.availableCount - a.availableCount;
            })
            .slice(0, 3);

        if (!matches.length) {
            container.innerHTML = `
                <div class="empty-state empty-state--compact">
                    <i class="ri-search-eye-line" aria-hidden="true"></i>
                    <strong>No matched labour suggestions yet.</strong>
                    <p>Select a work type in the request form or save farmer location details on Home.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="section-head section-head--tight">
                <div>
                    <span class="section-kicker">Matched Suggestions</span>
                    <h3>Likely labour matches</h3>
                </div>
            </div>
            ${matches.map((labourer) => `
                <article class="posted-card">
                    <div class="card-topline">
                        <strong>${escapeHtml(labourer.name)}</strong>
                        <span>${escapeHtml(String(labourer.availableCount))} workers</span>
                    </div>
                    <p>${escapeHtml(labourer.workType)} support in ${escapeHtml(labourer.location)}.</p>
                    <small>${escapeHtml(labourer.availability)}</small>
                </article>
            `).join("")}
        `;
    }

    function renderPostedLabourRequirements() {
        const container = document.getElementById("posted-labour-list");

        if (!container) {
            return;
        }

        if (!state.labourPosts.length) {
            container.innerHTML = `
                <div class="empty-state empty-state--compact">
                    <i class="ri-file-list-3-line" aria-hidden="true"></i>
                    <strong>No labour requests posted yet.</strong>
                    <p>Use the form above to create one request for the demo.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="section-head section-head--tight">
                <div>
                    <span class="section-kicker">Posted Requests</span>
                    <h3>Recent labour requests</h3>
                </div>
            </div>
            ${state.labourPosts.map((post) => `
                <article class="posted-card">
                    <div class="card-topline">
                        <strong>${escapeHtml(post.workType)}</strong>
                        <span>${escapeHtml(post.createdAt)}</span>
                    </div>
                    <p>${escapeHtml(post.labourCount)} labourers needed at ${escapeHtml(post.location)} on ${escapeHtml(post.requiredDate)} at ${escapeHtml(post.requiredTime)}.</p>
                    <small>${escapeHtml(post.notes || "No special instructions added.")}</small>
                </article>
            `).join("")}
        `;
    }

    function renderChatHistory() {
        const container = document.getElementById("chat-window");

        if (!container) {
            return;
        }

        container.innerHTML = state.chatHistory.map((item) => `
            <article class="chat-bubble chat-bubble--${escapeHtml(item.role)}">
                <div class="chat-bubble__meta">${item.role === "bot" ? "AgriShield Bot" : "You"}</div>
                <p>${escapeHtml(item.text)}</p>
            </article>
        `).join("");

        container.scrollTop = container.scrollHeight;
    }

    function sendChatMessage(message) {
        const userMessage = {
            role: "user",
            text: message
        };
        const botReply = getGeminiResponse(message, state.profile) || getMockChatbotResponse(message, state.profile);
        const botMessage = {
            role: "bot",
            text: botReply
        };

        state.chatHistory.push(userMessage, botMessage);
        setUserStoredValue(USER_STORAGE_KEYS.chatHistory, state.chatHistory);
        renderChatHistory();
    }

    function getGeminiResponse() {
        return null;
    }

    function renderSchemesView() {
        const summary = document.querySelector("[data-scheme-summary]");
        const container = document.getElementById("scheme-card-grid");

        if (!container || !summary) {
            return;
        }

        const relevantSchemes = getRelevantSchemes(state.profile);
        const filteredSchemes = relevantSchemes.filter((scheme) => {
            return state.activeSchemeFilter === "all" || scheme.categories.includes(state.activeSchemeFilter);
        });

        if (state.profile?.farmerName) {
            const landSize = state.profile.landArea ? `${state.profile.landArea} acres` : "unspecified land";
            summary.textContent = `${filteredSchemes.length} schemes match this profile. The ranking is influenced by ${landSize}, crop type, and labour-related need.`;
        } else {
            summary.textContent = "Save farmer details on Home to personalize this list. For now, all demo schemes are shown.";
        }

        if (!filteredSchemes.length) {
            container.innerHTML = `
                <div class="empty-state empty-state--wide">
                    <i class="ri-government-line" aria-hidden="true"></i>
                    <strong>No schemes match this filter.</strong>
                    <p>Try another category or save more farmer details on Home for better matching.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredSchemes.map((scheme) => `
            <article class="scheme-card scheme-card--dashboard">
                <div class="card-topline">
                    <span class="status-pill status-pill--soft">${scheme.categories.slice(0, 2).map(formatCategoryLabel).join(" • ")}</span>
                    <span class="status-pill status-pill--success">Recommended</span>
                </div>
                <h4>${escapeHtml(scheme.name)}</h4>
                <p>${escapeHtml(scheme.description)}</p>
                <div class="scheme-detail">
                    <strong>Eligibility</strong>
                    <p>${escapeHtml(scheme.eligibility)}</p>
                </div>
                <div class="scheme-detail">
                    <strong>Benefits</strong>
                    <p>${escapeHtml(scheme.benefits)}</p>
                </div>
                <div class="scheme-detail">
                    <strong>Required documents</strong>
                    <p>${escapeHtml(scheme.documents.join(", "))}</p>
                </div>
                <div class="card-actions">
                    <button class="btn btn--primary btn--compact" type="button" data-scheme-cta="${escapeHtml(scheme.name)}">${escapeHtml(scheme.cta)}</button>
                    <button class="btn btn--ghost btn--compact" type="button" data-scheme-name="${escapeHtml(scheme.name)}">Why suggested</button>
                </div>
            </article>
        `).join("");

        container.querySelectorAll("[data-scheme-cta]").forEach((button) => {
            button.addEventListener("click", () => {
                showToast(`${button.dataset.schemeCta} opened as a demo action.`);
            });
        });

        container.querySelectorAll("[data-scheme-name]").forEach((button) => {
            button.addEventListener("click", () => {
                showToast(`${button.dataset.schemeName} fits land size, crop, or labour needs in this profile.`);
            });
        });
    }

    function buildRecommendations(profile) {
        if (!profile?.farmerName) {
            return [];
        }

        const nearbyWorkers = getNearbyWorkerTotal(profile);
        const landArea = Number(profile.landArea || 0);
        const crop = (profile.mainCrop || "").toLowerCase();
        const relevantSchemes = getRelevantSchemes(profile).slice(0, 3);
        const hasMapLocation = Boolean(profile.latitude && profile.longitude);

        return [
            {
                label: "Labour Finding",
                title: "Prepare nearby labour discovery",
                reason: !hasMapLocation
                    ? "Choose the farm location on the map to improve nearby labour matching for this profile."
                    : nearbyWorkers
                    ? `${nearbyWorkers} workers appear in nearby labour listings for this saved profile.`
                    : "This saved profile is ready to be used for labour discovery in the next module.",
                icon: "ri-team-line",
                view: "labour"
            },
            {
                label: "AI Chatbot",
                title: "Get guidance from the AI assistant",
                reason: landArea >= 2 || LABOUR_HEAVY_CROPS.includes(crop)
                    ? "This farm profile suggests labour-heavy work, so AI guidance can help plan worker needs and crop tasks."
                    : "After saving the profile, AI can help with crop guidance, labour planning, and farmer questions.",
                icon: "ri-message-3-line",
                view: "chatbot"
            },
            {
                label: "Government Schemes",
                title: "Review matched farmer schemes",
                reason: relevantSchemes.length
                    ? `${relevantSchemes[0].name} is one of the strongest matches for this profile.`
                    : "Open Government Schemes to see support based on land size and crop type.",
                icon: "ri-government-line",
                view: "schemes"
            }
        ];
    }

    function buildProfileSummary(profile) {
        if (!profile?.farmerName) {
            return [
                { label: "Farmer", value: "Not saved" },
                { label: "Village / City", value: "Not saved" },
                { label: "Main Crop", value: "Not saved" },
                { label: "Farming Type", value: "Not saved" }
            ];
        }

        return [
            { label: "Farmer", value: profile.farmerName },
            { label: "Village / City", value: profile.village || "Not provided" },
            { label: "Taluka / Tehsil", value: profile.taluka || "Not provided" },
            { label: "District", value: profile.district || "Not provided" },
            { label: "State", value: profile.state || "Not provided" },
            { label: "Full Address", value: profile.fullAddress || "Not provided" },
            { label: "Land Area", value: profile.landArea ? `${profile.landArea} acres` : "Not provided" },
            { label: "Main Crop", value: profile.mainCrop || "Not provided" },
            { label: "Farming Type", value: profile.farmingType || "Not provided" },
            { label: "Map Location", value: profile.latitude && profile.longitude ? "Selected" : "Not selected" }
        ];
    }

    function getMockChatbotResponse(message, profile) {
        const prompt = message.toLowerCase();
        const landArea = Number(profile?.landArea || 0);
        const crop = (profile?.mainCrop || "").toLowerCase();
        const topSchemes = getRelevantSchemes(profile).slice(0, 2).map((scheme) => scheme.name);

        if (prompt.includes("labour advice")) {
            return "For labour advice, start by selecting the work type on Labour Finding, check nearby group availability, and post the requirement with date, time, and location.";
        }

        if (prompt.includes("crop help")) {
            return crop
                ? `${profile.mainCrop} work often needs planning by stage. Use Labour Finding to search workers by task and post labour needs before the peak farm window.`
                : "Save the main crop on Home first so I can give more crop-specific labour guidance.";
        }

        if (prompt.includes("scheme help")) {
            return topSchemes.length
                ? `Based on this profile, start with ${topSchemes.join(" and ")}. Open Government Schemes to see benefits, documents, and eligibility.`
                : "Save land area, crop, and farming type on Home first so I can suggest better scheme matches.";
        }

        if (prompt.includes("worker shortage")) {
            return "If workers are unavailable, widen the labour search, prefer group labour for urgent farm work, and post the requirement early with clear timing and location.";
        }

        if (prompt.includes("small farmer support")) {
            return topSchemes.length
                ? `For small farmer support, start with ${topSchemes[0]}. It is a strong match for this saved farmer profile.`
                : "Save land area and farming type on Home first so I can suggest better support for a small farmer profile.";
        }

        if (prompt.includes("farm planning")) {
            return "For farm planning, save the farmer profile, post labour needs early, and use the chatbot before harvesting or transplanting weeks.";
        }

        if (prompt.includes("how many labourers") && prompt.includes("2 acres")) {
            return "For 2 acres, labour need depends on crop and urgency, but for manual harvesting you can start by planning 6 to 10 workers and then adjust by field condition.";
        }

        if (prompt.includes("sugarcane")) {
            return "Sugarcane cutting usually needs experienced group labour because cutting, bundling, and loading are labour-intensive and time-sensitive.";
        }

        if (prompt.includes("labour shortage") || prompt.includes("workers are unavailable")) {
            return "If workers are unavailable, post the requirement early, widen the location filter, consider group labour, and check labour-support or equipment subsidy schemes.";
        }

        if (prompt.includes("small farmers") || prompt.includes("small farmer")) {
            return topSchemes.length
                ? `For a small farmer profile, ${topSchemes[0]} is a strong starting point. You may also check labour-support schemes if wage pressure is high.`
                : "PM-KISAN, seasonal working capital support, and crop insurance are common starting points for small farmers.";
        }

        if (prompt.includes("labour")) {
            return "Open Labour Finding to filter by work type, choose between individual or group workers, and post the labour request with time and location.";
        }

        if (prompt.includes("scheme") || prompt.includes("government")) {
            return topSchemes.length
                ? `Based on this profile, look at ${topSchemes.join(" and ")} first. The scheme page will explain benefits, documents, and why they were suggested.`
                : "Save the farmer profile first so I can rank relevant schemes more accurately.";
        }

        if (prompt.includes("crop")) {
            return crop
                ? `${profile.mainCrop} work should be planned with labour availability in mind. Use AI for task planning and Labour Finding to search by the work type you need.`
                : "Save the main crop on Home and then ask again for more specific crop guidance.";
        }

        if (prompt.includes("plan")) {
            return landArea
                ? `For ${landArea} acres, start by estimating peak labour days, then post the request early and keep one backup labour group shortlisted.`
                : "For better planning, save land area on Home first and then ask again.";
        }

        return "I can help with labour planning, labour shortage decisions, crop work guidance, and scheme support. Try a more specific farmer question.";
    }

    function getRelevantSchemes(profile) {
        const landArea = Number(profile?.landArea || 0);
        const crop = (profile?.mainCrop || "").toLowerCase();
        const farmingType = (profile?.farmingType || "").toLowerCase();

        return window.AgriMockData.schemes
            .map((scheme) => {
                let score = 1;

                if (!profile?.farmerName) {
                    return { ...scheme, score };
                }

                if (scheme.landMax && landArea > 0 && landArea <= scheme.landMax) {
                    score += 3;
                }

                if (scheme.landMin && landArea >= scheme.landMin) {
                    score += 2;
                }

                if (scheme.categories.includes("small-farmer") && (landArea > 0 && landArea <= 2.5 || farmingType.includes("small"))) {
                    score += 3;
                }

                if (scheme.categories.includes("labour-support") && (LABOUR_HEAVY_CROPS.includes(crop) || farmingType.includes("seasonal") || farmingType.includes("commercial") || landArea >= 2)) {
                    score += 3;
                }

                if (scheme.categories.includes("equipment-subsidy") && landArea >= 1.5) {
                    score += 2;
                }

                if (scheme.categories.includes("insurance") && crop) {
                    score += 2;
                }

                if (scheme.cropTags?.includes(crop)) {
                    score += 2;
                }

                if (scheme.farmingTypeTags?.includes(farmingType)) {
                    score += 2;
                }

                return { ...scheme, score };
            })
            .sort((a, b) => b.score - a.score);
    }

    function getNearbyLabourers(profile) {
        const village = cleanText(profile?.village).toLowerCase();
        const taluka = cleanText(profile?.taluka).toLowerCase();
        const district = cleanText(profile?.district).toLowerCase();
        const farmerState = cleanText(profile?.state).toLowerCase();

        const localMatches = window.AgriMockData.labourers.filter((labourer) => {
            const location = labourer.location.toLowerCase();
            return (village && location.includes(village))
                || (taluka && location.includes(taluka))
                || (district && location.includes(district))
                || (farmerState && location.includes(farmerState));
        });

        return localMatches.length ? localMatches : window.AgriMockData.labourers;
    }

    function getNearbyWorkerTotal(profile) {
        return getNearbyLabourers(profile).reduce((sum, labourer) => sum + labourer.availableCount, 0);
    }

    function getLocationScore(location, profile) {
        const normalizedLocation = cleanText(location).toLowerCase();
        const village = cleanText(profile?.village).toLowerCase();
        const taluka = cleanText(profile?.taluka).toLowerCase();
        const district = cleanText(profile?.district).toLowerCase();
        const farmerState = cleanText(profile?.state).toLowerCase();

        let score = 0;

        if (village && normalizedLocation.includes(village)) {
            score += 3;
        }

        if (taluka && normalizedLocation.includes(taluka)) {
            score += 2;
        }

        if (district && normalizedLocation.includes(district)) {
            score += 2;
        }

        if (farmerState && normalizedLocation.includes(farmerState)) {
            score += 1;
        }

        return score;
    }

    function readProfileFromForm(form) {
        const formData = new FormData(form);

        return {
            farmerName: cleanText(formData.get("farmerName")),
            mobileNumber: cleanNumber(formData.get("mobileNumber")),
            village: cleanText(formData.get("village")),
            taluka: cleanText(formData.get("taluka")),
            district: cleanText(formData.get("district")),
            state: cleanText(formData.get("state")),
            fullAddress: cleanText(formData.get("fullAddress")),
            latitude: cleanText(formData.get("latitude")),
            longitude: cleanText(formData.get("longitude")),
            landArea: cleanText(formData.get("landArea")),
            mainCrop: cleanText(formData.get("mainCrop")),
            farmingType: cleanText(formData.get("farmingType"))
        };
    }

    function fillFormWithProfile(form, profile) {
        if (!profile?.farmerName) {
            return;
        }

        Object.entries(profile).forEach(([key, value]) => {
            if (form.elements[key]) {
                form.elements[key].value = value;
            }
        });
    }

    function prefillHomeFormDefaults(form) {
        if (!form) {
            return;
        }

        if (!form.elements.farmerName.value) {
            form.elements.farmerName.value = state.session?.username || "";
        }

        if (!form.elements.mobileNumber.value) {
            form.elements.mobileNumber.value = state.session?.mobile || "";
        }
    }

    function prefillLabourFormDefaults(form) {
        if (!form) {
            return;
        }

        if (!form.elements.location.value) {
            const parts = [state.profile?.fullAddress, state.profile?.village, state.profile?.district, state.profile?.state].filter(Boolean);
            form.elements.location.value = parts.join(", ");
        }
    }

    function getProfileCompletionCount(profile) {
        const fields = [
            profile?.farmerName,
            profile?.mobileNumber,
            profile?.village,
            profile?.taluka,
            profile?.district,
            profile?.state,
            profile?.fullAddress,
            profile?.landArea,
            profile?.mainCrop,
            profile?.farmingType
        ];

        return fields.filter((value) => Boolean(cleanText(value))).length;
    }

    function initLocationPicker(form) {
        const mapContainer = document.getElementById("location-map");

        if (!form || !mapContainer) {
            return;
        }

        mapState.form = form;

        if (!window.L) {
            setMapStatus("Map could not load. You can still fill the address fields manually for this demo.");
            return;
        }

        const mapView = getMapViewFromProfile(state.profile);

        if (!mapState.instance) {
            mapState.instance = window.L.map(mapContainer, {
                zoomControl: true,
                scrollWheelZoom: true
            }).setView(mapView.center, mapView.zoom);

            window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "&copy; OpenStreetMap contributors"
            }).addTo(mapState.instance);

            mapState.instance.on("click", (event) => {
                void handleMapSelection(event.latlng);
            });
        } else {
            mapState.instance.setView(mapView.center, mapView.zoom);
        }

        if (mapView.hasSavedLocation) {
            setMapMarker(window.L.latLng(mapView.center[0], mapView.center[1]));
            setMapStatus("Saved farm location loaded. Click on the map to update it.");
        } else {
            setMapStatus("Click on the map to choose a location.");
        }

        window.setTimeout(() => {
            mapState.instance?.invalidateSize();
        }, 180);
    }

    function bindLocationSearch(form) {
        const searchForm = document.getElementById("location-search-form");
        const searchInput = document.getElementById("location-search-input");
        const searchButton = document.getElementById("location-search-button");
        const resultsContainer = document.getElementById("location-search-results");

        if (!searchForm || !searchInput || !searchButton || !resultsContainer) {
            return;
        }

        if (state.profile?.fullAddress && !searchInput.value) {
            searchInput.value = state.profile.fullAddress;
        }

        if (searchForm.dataset.bound === "true") {
            return;
        }

        searchForm.dataset.bound = "true";

        const runSearch = async () => {
            const query = cleanText(searchInput.value);

            if (!query) {
                showToast("Enter a location to search.");
                return;
            }

            setMapStatus("Searching locations...");
            const results = await searchLocations(query);
            renderLocationSearchResults(results);

            if (results.length) {
                setMapStatus("Select a searched location or click on the map.");
            } else {
                setMapStatus("No matching places found. Try another search or click on the map.");
            }
        };

        searchButton.addEventListener("click", () => {
            void runSearch();
        });

        searchInput.addEventListener("input", () => {
            if (!cleanText(searchInput.value)) {
                clearLocationSearchResults();
            }
        });

        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                void runSearch();
            }
        });

        resultsContainer.addEventListener("click", (event) => {
            const resultButton = event.target.closest("[data-location-result-index]");

            if (!resultButton || !window.L) {
                return;
            }

            const result = mapState.searchResults[Number(resultButton.dataset.locationResultIndex)];

            if (!result) {
                return;
            }

            const latlng = window.L.latLng(Number(result.lat), Number(result.lon));
            setMapMarker(latlng);
            mapState.instance?.setView(latlng, 15);
            applyReverseGeocodeToForm(form, result, latlng);
            setMapStatus("Location selected from search results.");
        });
    }

    function getMapViewFromProfile(profile) {
        const latitude = Number(profile?.latitude);
        const longitude = Number(profile?.longitude);

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            return {
                center: [latitude, longitude],
                zoom: 14,
                hasSavedLocation: true
            };
        }

        return {
            center: [20.5937, 78.9629],
            zoom: 5,
            hasSavedLocation: false
        };
    }

    function syncMapSelectionFromProfile(profile) {
        if (!mapState.instance || !window.L) {
            return;
        }

        const latitude = Number(profile?.latitude);
        const longitude = Number(profile?.longitude);
        const searchInput = document.getElementById("location-search-input");

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            if (mapState.marker) {
                mapState.instance.removeLayer(mapState.marker);
                mapState.marker = null;
            }

            mapState.instance.setView([20.5937, 78.9629], 5);
            setMapStatus("Click on the map to choose a location.");
            return;
        }

        const latlng = window.L.latLng(latitude, longitude);
        setMapMarker(latlng);
        mapState.instance.setView(latlng, 14);

        if (mapState.form?.elements.latitude) {
            mapState.form.elements.latitude.value = latitude.toFixed(6);
        }

        if (mapState.form?.elements.longitude) {
            mapState.form.elements.longitude.value = longitude.toFixed(6);
        }

        if (searchInput && profile?.fullAddress) {
            searchInput.value = profile.fullAddress;
        }

        setMapStatus("Farm location saved. Click on the map to change it.");
    }

    async function handleMapSelection(latlng) {
        if (!mapState.form) {
            return;
        }

        const latitude = Number(latlng.lat).toFixed(6);
        const longitude = Number(latlng.lng).toFixed(6);
        const fallbackAddress = `Selected location at ${latitude}, ${longitude}`;

        setMapMarker(latlng);
        mapState.form.elements.latitude.value = latitude;
        mapState.form.elements.longitude.value = longitude;
        mapState.form.elements.fullAddress.value = fallbackAddress;
        setMapStatus("Location selected. Fetching nearby address details...");

        const reverseData = await reverseGeocodeLocation(latitude, longitude);
        applyReverseGeocodeToForm(mapState.form, reverseData, latlng);
    }

    function setMapMarker(latlng) {
        if (!mapState.instance || !window.L) {
            return;
        }

        if (!mapState.marker) {
            mapState.marker = window.L.marker(latlng, { draggable: true }).addTo(mapState.instance);
            mapState.marker.on("dragend", () => {
                void handleMapSelection(mapState.marker.getLatLng());
            });
            return;
        }

        mapState.marker.setLatLng(latlng);
    }

    async function reverseGeocodeLocation(latitude, longitude) {
        const url = new URL("https://nominatim.openstreetmap.org/reverse");
        url.search = new URLSearchParams({
            format: "jsonv2",
            lat: String(latitude),
            lon: String(longitude),
            zoom: "18",
            addressdetails: "1"
        }).toString();

        try {
            const response = await fetch(url.toString(), {
                headers: {
                    Accept: "application/json"
                }
            });

            if (!response.ok) {
                throw new Error("Reverse geocoding failed");
            }

            return await response.json();
        } catch {
            return null;
        }
    }

    async function searchLocations(query) {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.search = new URLSearchParams({
            format: "jsonv2",
            q: query,
            limit: "5",
            addressdetails: "1",
            countrycodes: "in"
        }).toString();

        try {
            const response = await fetch(url.toString(), {
                headers: {
                    Accept: "application/json"
                }
            });

            if (!response.ok) {
                throw new Error("Location search failed");
            }

            return await response.json();
        } catch {
            showToast("Search is unavailable right now. You can still click on the map.");
            return [];
        }
    }

    function renderLocationSearchResults(results) {
        const resultsContainer = document.getElementById("location-search-results");

        if (!resultsContainer) {
            return;
        }

        mapState.searchResults = results;

        if (!results.length) {
            clearLocationSearchResults();
            return;
        }

        resultsContainer.hidden = false;
        resultsContainer.innerHTML = results.map((result, index) => `
            <button class="location-result" type="button" data-location-result-index="${index}">
                <strong>${escapeHtml(result.display_name.split(",").slice(0, 2).join(", "))}</strong>
                <span>${escapeHtml(result.display_name)}</span>
            </button>
        `).join("");
    }

    function clearLocationSearchResults() {
        const resultsContainer = document.getElementById("location-search-results");
        mapState.searchResults = [];

        if (!resultsContainer) {
            return;
        }

        resultsContainer.hidden = true;
        resultsContainer.innerHTML = "";
    }

    function applyReverseGeocodeToForm(form, reverseData, latlng) {
        const latitude = Number(latlng.lat).toFixed(6);
        const longitude = Number(latlng.lng).toFixed(6);
        const fallbackAddress = `Selected location at ${latitude}, ${longitude}`;
        const searchInput = document.getElementById("location-search-input");

        form.elements.latitude.value = latitude;
        form.elements.longitude.value = longitude;

        if (!reverseData) {
            form.elements.fullAddress.value = fallbackAddress;
            if (searchInput) {
                searchInput.value = fallbackAddress;
            }
            clearLocationSearchResults();
            setMapStatus("Location selected. Address details can be adjusted manually.");
            return;
        }

        const address = reverseData.address || {};
        const village = address.village || address.hamlet || address.town || address.suburb || address.city || "";
        const taluka = address.municipality || address.city_district || address.subcounty || address.taluk || "";
        const district = address.state_district || address.county || address.city || address.city_district || "";
        const stateName = address.state || "";

        form.elements.fullAddress.value = reverseData.display_name || fallbackAddress;
        form.elements.village.value = village || form.elements.village.value;
        form.elements.taluka.value = taluka || form.elements.taluka.value;
        form.elements.district.value = district || form.elements.district.value;
        form.elements.state.value = stateName || form.elements.state.value;
        if (searchInput) {
            searchInput.value = reverseData.display_name || fallbackAddress;
        }
        clearLocationSearchResults();

        setMapStatus("Location selected and address details updated from the map.");
    }

    function setMapStatus(message) {
        const statusNode = document.querySelector("[data-map-status]");

        if (statusNode) {
            statusNode.textContent = message;
        }
    }

    function ensureDemoUser() {
        const users = getUsers();
        const existing = users.find((user) => user.usernameKey === normalizeUsername(DEMO_USER.username));

        if (existing) {
            return existing;
        }

        const demoRecord = {
            username: DEMO_USER.username,
            usernameKey: normalizeUsername(DEMO_USER.username),
            mobile: DEMO_USER.mobile,
            password: DEMO_USER.password,
            createdAt: new Date().toISOString()
        };

        users.push(demoRecord);
        setStoredValue(STORAGE_KEYS.users, users);
        return demoRecord;
    }

    function generateCaptcha(loginForm) {
        const questionNode = document.querySelector("[data-captcha-question]");

        if (!loginForm || !questionNode) {
            return;
        }

        const first = randomInt(1, 9);
        const second = randomInt(1, 9);
        const answer = first + second;

        questionNode.textContent = `What is ${first} + ${second}?`;
        loginForm.dataset.captchaAnswer = String(answer);
    }

    function attachAuthFieldListeners(form, feedback) {
        form.querySelectorAll("input").forEach((input) => {
            input.addEventListener("input", () => {
                clearAuthFeedback(feedback);
            });
        });
    }

    function setAuthFeedback(node, type, message) {
        if (!node) {
            return;
        }

        node.hidden = false;
        node.textContent = message;
        node.classList.remove("is-error", "is-success");
        node.classList.add(type === "success" ? "is-success" : "is-error");
    }

    function clearAuthFeedback(node) {
        if (!node) {
            return;
        }

        node.hidden = true;
        node.textContent = "";
        node.classList.remove("is-error", "is-success");
    }

    function hasActiveSession() {
        const session = getStoredValue(STORAGE_KEYS.session, null);
        return Boolean(session?.isLoggedIn);
    }

    function getUsers() {
        return getStoredValue(STORAGE_KEYS.users, []);
    }

    function findUserByUsername(username) {
        const usernameKey = normalizeUsername(username);
        return getUsers().find((user) => user.usernameKey === usernameKey);
    }

    function getUserStorageKey(baseKey, username = state.session?.username) {
        const usernameKey = normalizeUsername(username);
        return usernameKey ? `${baseKey}_${usernameKey}` : baseKey;
    }

    function getUserStoredValue(baseKey, fallbackValue) {
        return getStoredValue(getUserStorageKey(baseKey), fallbackValue);
    }

    function setUserStoredValue(baseKey, value) {
        setStoredValue(getUserStorageKey(baseKey), value);
    }

    function formatCategoryLabel(value) {
        return value
            .split("-")
            .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
            .join(" ");
    }

    function getStoredValue(key, fallbackValue) {
        try {
            const rawValue = localStorage.getItem(key);
            return rawValue ? JSON.parse(rawValue) : fallbackValue;
        } catch {
            return fallbackValue;
        }
    }

    function setStoredValue(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function cleanText(value) {
        return String(value || "").trim();
    }

    function cleanNumber(value) {
        return String(value || "").replace(/[^\d]/g, "");
    }

    function normalizeUsername(value) {
        return cleanText(value).toLowerCase();
    }

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getInitials(name) {
        return cleanText(name)
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0].toUpperCase())
            .join("") || "FS";
    }

    function setText(selector, text) {
        const node = document.querySelector(selector);

        if (node) {
            node.textContent = text;
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function showToast(message) {
        const toast = document.querySelector("[data-toast]");

        if (!toast) {
            return;
        }

        toast.textContent = message;
        toast.classList.add("is-visible");

        window.clearTimeout(showToast.timeoutId);
        showToast.timeoutId = window.setTimeout(() => {
            toast.classList.remove("is-visible");
        }, 2600);
    }
})();
