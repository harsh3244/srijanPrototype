(function () {
    const STORAGE_KEYS = {
        users: "agrishield_auth_users",
        session: "agrishield_auth_session"
    };

    const USER_STORAGE_KEYS = {
        profile: "agrishield_labour_profile",
        labourPosts: "agrishield_labour_posts",
        activeView: "agrishield_labour_active_view",
        jobPostings: "agrishield_job_postings",
        jobApplications: "agrishield_job_applications",
        guideOnboardingSeen: "agrishield_guide_onboarding_seen"
    };

    const VIEW_META = {
        home: {
            title: "Home",
            subtitle: "Save farmer details and unlock labour and scheme recommendations."
        },
        labour: {
            title: "Labour Finding",
            subtitle: "Browse available labour, use filters, and post labour requirements."
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
    const state = {
        session: null,
        profile: null,
        labourPosts: [],
        activeView: "home",
        activeSchemeFilter: "all",
        jobPostings: [],
        jobApplications: [],
        currentJobForApplication: null
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
        state.activeView = getUserStoredValue(USER_STORAGE_KEYS.activeView, "home");
        state.jobPostings = getUserStoredValue(USER_STORAGE_KEYS.jobPostings, []);
        state.jobApplications = getUserStoredValue(USER_STORAGE_KEYS.jobApplications, []);

        bindSidebar();
        bindTopbar();
        bindHomeSection();
        bindLabourSection();
        bindSchemesSection();
        bindLinkedInLabourSection();
        initGuidePage();
        bindGuideOnboarding();

        refreshGlobalUI();
        setActiveView(state.activeView);
    }

    function initGuidePage() {
        const stepList = document.querySelector("[data-guide-step-list]");
        const statusNode = document.querySelector("[data-guide-voice-status]");
        const languageSelect = document.querySelector("[data-guide-language]");
        const openGuideButtons = document.querySelectorAll("[data-open-guide]");
        const playButton = document.querySelector("[data-guide-voice-play]");
        const repeatButton = document.querySelector("[data-guide-voice-repeat]");
        const stopButton = document.querySelector("[data-guide-voice-stop]");
        const listenButton = document.querySelector("[data-guide-voice-listen]");

        if (!stepList || !statusNode) {
            return;
        }

        const guideContent = {
            en: {
                label: "English",
                speechLang: "en-IN",
                recognitionLang: "en-IN",
                readyText: "Voice help is ready. Press Play Full Guide to start.",
                steps: [
                    {
                        title: "Login or register first",
                        detail: "Open the login page if you already have an account. If not, create a simple account from register."
                    },
                    {
                        title: "Save farmer details on Home",
                        detail: "Enter name, mobile, village, crop, and land area. These details are used for personalized help."
                    },
                    {
                        title: "Choose farm location on map",
                        detail: "Search your place or click on the map. Saved location improves labour suggestions."
                    },
                    {
                        title: "Use Labour Finding",
                        detail: "Filter available workers, then post your labour requirement with date, time, and location."
                    },
                    {
                        title: "Review recommendations",
                        detail: "Check alerts and suggested actions to plan labour demand and next farm steps."
                    },
                    {
                        title: "Review Government Schemes",
                        detail: "Open schemes to check eligibility, required documents, and the best matching support options."
                    }
                ]
            },
            hi: {
                label: "Hindi",
                speechLang: "hi-IN",
                recognitionLang: "hi-IN",
                readyText: "वॉइस गाइड तैयार है। शुरू करने के लिए प्ले दबाएं।",
                steps: [
                    {
                        title: "पहले लॉगिन या रजिस्टर करें",
                        detail: "अगर आपका अकाउंट है तो लॉगिन खोलें। नया यूज़र हो तो रजिस्टर पेज से अकाउंट बनाएं।"
                    },
                    {
                        title: "होम पर किसान विवरण सेव करें",
                        detail: "नाम, मोबाइल, गांव, फसल और जमीन का क्षेत्र भरें। इसी से सुझाव बेहतर मिलते हैं।"
                    },
                    {
                        title: "मैप पर खेत की लोकेशन चुनें",
                        detail: "स्थान खोजें या मैप पर क्लिक करें। सेव लोकेशन से लेबर मैचिंग बेहतर होती है।"
                    },
                    {
                        title: "लेबर फाइंडिंग का उपयोग करें",
                        detail: "उपलब्ध मजदूर फ़िल्टर करें और तारीख, समय, स्थान के साथ अपनी जरूरत पोस्ट करें।"
                    },
                    {
                        title: "सुझाव देखें",
                        detail: "अलर्ट और सुझाए गए कदम देखकर लेबर प्लानिंग और अगले काम तय करें।"
                    },
                    {
                        title: "सरकारी योजनाएं देखें",
                        detail: "पात्रता, जरूरी दस्तावेज़ और आपके लिए उपयुक्त योजना की जानकारी देखें।"
                    }
                ]
            },
            mr: {
                label: "Marathi",
                speechLang: "mr-IN",
                recognitionLang: "mr-IN",
                readyText: "व्हॉइस गाईड तयार आहे. सुरू करण्यासाठी प्ले दाबा.",
                steps: [
                    {
                        title: "सुरुवातीला लॉगिन किंवा नोंदणी करा",
                        detail: "खाते असेल तर लॉगिन करा. नसेल तर रजिस्टर पेजवरून नवीन खाते तयार करा."
                    },
                    {
                        title: "होममध्ये शेतकरी माहिती सेव्ह करा",
                        detail: "नाव, मोबाईल, गाव, पीक आणि क्षेत्रफळ भरा. यामुळे योग्य सूचना मिळतात."
                    },
                    {
                        title: "नकाशावर शेताची जागा निवडा",
                        detail: "ठिकाण शोधा किंवा नकाशावर क्लिक करा. सेव्ह केलेली जागा मजूर जुळवण्यात मदत करते."
                    },
                    {
                        title: "Labour Finding वापरा",
                        detail: "उपलब्ध मजूर फिल्टर करा आणि तारीख, वेळ, ठिकाणासह गरज पोस्ट करा."
                    },
                    {
                        title: "शिफारसी पहा",
                        detail: "अलर्ट आणि सुचवलेली कृती पाहून मजूर नियोजन आणि पुढची कामे ठरवा."
                    },
                    {
                        title: "सरकारी योजना तपासा",
                        detail: "पात्रता, आवश्यक कागदपत्रे आणि योग्य योजना यांची माहिती पाहा."
                    }
                ]
            },
            ta: {
                label: "Tamil",
                speechLang: "ta-IN",
                recognitionLang: "ta-IN",
                readyText: "வாய்ஸ் வழிகாட்டி தயாராக உள்ளது. தொடங்க Play அழுத்தவும்.",
                steps: [
                    {
                        title: "முதலில் Login அல்லது Register செய்யவும்",
                        detail: "கணக்கு இருந்தால் Login பக்கம் திறக்கவும். புதியவர் என்றால் Register மூலம் கணக்கு உருவாக்கவும்."
                    },
                    {
                        title: "Home-ல் விவசாயி விவரங்களை சேமிக்கவும்",
                        detail: "பெயர், மொபைல், கிராமம், பயிர், நில அளவை பதிவு செய்யவும். அதனால் பரிந்துரைகள் மேம்படும்."
                    },
                    {
                        title: "வரைபடத்தில் பண்ணை இடத்தை தேர்வு செய்யவும்",
                        detail: "இடத்தை தேடவும் அல்லது வரைபடத்தில் கிளிக் செய்யவும். சேமித்த இடம் தொழிலாளர் பொருத்தத்தை மேம்படுத்தும்."
                    },
                    {
                        title: "Labour Finding பயன்படுத்தவும்",
                        detail: "கிடைக்கும் தொழிலாளர்களை வடிகட்டி, தேதி, நேரம், இடத்துடன் தேவையை பதிவிடவும்."
                    },
                    {
                        title: "பரிந்துரைகளை பார்க்கவும்",
                        detail: "அலர்ட் மற்றும் பரிந்துரைக்கப்பட்ட நடவடிக்கைகளை பார்த்து அடுத்த பணிகளை திட்டமிடுங்கள்."
                    },
                    {
                        title: "அரசு திட்டங்களை பார்க்கவும்",
                        detail: "தகுதி, ஆவணங்கள் மற்றும் உங்களுக்கு பொருந்தும் திட்ட விவரங்களை சரிபார்க்கவும்."
                    }
                ]
            },
            te: {
                label: "Telugu",
                speechLang: "te-IN",
                recognitionLang: "te-IN",
                readyText: "వాయిస్ గైడ్ సిద్ధంగా ఉంది. ప్రారంభించడానికి ప్లే నొక్కండి.",
                steps: [
                    {
                        title: "ముందుగా Login లేదా Register చేయండి",
                        detail: "ఖాతా ఉంటే Login తెరవండి. లేకపోతే Register ద్వారా కొత్త ఖాతా సృష్టించండి."
                    },
                    {
                        title: "Homeలో రైతు వివరాలు సేవ్ చేయండి",
                        detail: "పేరు, మొబైల్, గ్రామం, పంట, భూభాగం నమోదు చేయండి. అప్పుడు సూచనలు మెరుగవుతాయి."
                    },
                    {
                        title: "మ్యాప్‌లో పొలం లొకేషన్ ఎంచుకోండి",
                        detail: "స్థలాన్ని వెతకండి లేదా మ్యాప్‌పై క్లిక్ చేయండి. సేవ్ చేసిన స్థానం పనివారి మ్యాచింగ్‌కు సహాయపడుతుంది."
                    },
                    {
                        title: "Labour Finding ఉపయోగించండి",
                        detail: "అందుబాటులో ఉన్న పనివారిని ఫిల్టర్ చేసి, తేదీ, సమయం, స్థలంతో అవసరం పోస్ట్ చేయండి."
                    },
                    {
                        title: "సిఫార్సులు చూడండి",
                        detail: "అలర్ట్స్ మరియు సూచించిన చర్యలను చూసి పనివారి ప్లానింగ్ మరియు తదుపరి పనులు నిర్ణయించండి."
                    },
                    {
                        title: "ప్రభుత్వ పథకాలు పరిశీలించండి",
                        detail: "అర్హత, అవసరమైన పత్రాలు, మీకు సరిపోయే పథకాలను చూడండి."
                    }
                ]
            },
            bn: {
                label: "Bengali",
                speechLang: "bn-IN",
                recognitionLang: "bn-IN",
                readyText: "ভয়েস গাইড প্রস্তুত। শুরু করতে Play চাপুন।",
                steps: [
                    {
                        title: "প্রথমে Login বা Register করুন",
                        detail: "অ্যাকাউন্ট থাকলে Login খুলুন। না থাকলে Register পেজ থেকে নতুন অ্যাকাউন্ট তৈরি করুন।"
                    },
                    {
                        title: "Home-এ কৃষকের তথ্য সেভ করুন",
                        detail: "নাম, মোবাইল, গ্রাম, ফসল, জমির পরিমাণ দিন। এতে ভালো পরামর্শ পাওয়া যায়।"
                    },
                    {
                        title: "ম্যাপে খামারের অবস্থান বাছুন",
                        detail: "জায়গা খুঁজুন বা ম্যাপে ক্লিক করুন। সেভ করা লোকেশন শ্রমিক মিলাতে সাহায্য করে।"
                    },
                    {
                        title: "Labour Finding ব্যবহার করুন",
                        detail: "উপলব্ধ শ্রমিক ফিল্টার করুন এবং তারিখ, সময়, লোকেশনসহ প্রয়োজন পোস্ট করুন।"
                    },
                    {
                        title: "পরামর্শ দেখুন",
                        detail: "অ্যালার্ট এবং প্রস্তাবিত পদক্ষেপ দেখে শ্রম পরিকল্পনা ও পরের কাজ ঠিক করুন।"
                    },
                    {
                        title: "সরকারি স্কিম দেখুন",
                        detail: "যোগ্যতা, দরকারি কাগজপত্র এবং আপনার জন্য মানানসই স্কিম দেখুন।"
                    }
                ]
            }
        };

        let currentStep = 0;
        let isSequencePlaying = false;
        let recognition = null;
        let isListening = false;
        let activeUtterance = null;
        let activeLanguage = languageSelect?.value || "en";
        let availableVoices = [];

        const getGuideModel = () => guideContent[activeLanguage] || guideContent.en;

        const setStatus = (message) => {
            statusNode.textContent = message;
        };

        const loadVoices = () => {
            if (!("speechSynthesis" in window)) {
                return;
            }

            availableVoices = window.speechSynthesis.getVoices() || [];
        };

        const getVoiceForLanguage = (speechLang) => {
            if (!availableVoices.length) {
                return null;
            }

            const normalizedLang = String(speechLang || "").toLowerCase();
            const primaryCode = normalizedLang.split("-")[0];

            return availableVoices.find((voice) => voice.lang?.toLowerCase() === normalizedLang)
                || availableVoices.find((voice) => voice.lang?.toLowerCase().startsWith(`${primaryCode}-`))
                || availableVoices.find((voice) => voice.lang?.toLowerCase().startsWith(primaryCode))
                || null;
        };

        const renderSteps = () => {
            const steps = getGuideModel().steps;
            stepList.innerHTML = steps.map((step, index) => `
                <article class="guide-step ${index === currentStep ? "is-active" : ""}">
                    <span class="guide-step__index">${index + 1}</span>
                    <div>
                        <h3>${escapeHtml(step.title)}</h3>
                        <p>${escapeHtml(step.detail)}</p>
                    </div>
                </article>
            `).join("");
        };

        const stopVoice = (statusMessage = "Voice playback stopped.") => {
            isSequencePlaying = false;

            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }

            activeUtterance = null;
            setStatus(statusMessage);
        };

        const speakCurrentStep = (continueSequence = false) => {
            const model = getGuideModel();
            const steps = model.steps;

            if (!("speechSynthesis" in window)) {
                setStatus("Voice playback is not supported in this browser.");
                return;
            }

            const step = steps[currentStep];

            if (!step) {
                return;
            }

            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(`Step ${currentStep + 1}. ${step.title}. ${step.detail}`);
            utterance.rate = 0.95;
            utterance.pitch = 1;
            utterance.lang = model.speechLang;

            const selectedVoice = getVoiceForLanguage(model.speechLang);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            utterance.onend = () => {
                activeUtterance = null;
                const activeSteps = getGuideModel().steps;

                if (continueSequence && isSequencePlaying) {
                    if (currentStep < activeSteps.length - 1) {
                        currentStep += 1;
                        renderSteps();
                        speakCurrentStep(true);
                    } else {
                        isSequencePlaying = false;
                        setStatus("Guide completed. You can replay or say a step number.");
                    }
                    return;
                }

                setStatus(`Finished step ${currentStep + 1}.`);
            };

            utterance.onerror = () => {
                isSequencePlaying = false;
                activeUtterance = null;
                setStatus("Voice playback failed. Try again.");
            };

            activeUtterance = utterance;
            setStatus(`Speaking step ${currentStep + 1}: ${step.title}`);
            window.speechSynthesis.speak(utterance);
        };

        const goToStep = (index) => {
            const activeSteps = getGuideModel().steps;

            if (index < 0 || index >= activeSteps.length) {
                return;
            }

            currentStep = index;
            renderSteps();
        };

        const parseStepCommand = (text) => {
            const match = text.match(/(?:step|स्टेप|पायरी|படி|దశ|ধাপ)\s*(\d+)/i);

            if (!match) {
                return null;
            }

            const index = Number(match[1]) - 1;
            return Number.isInteger(index) ? index : null;
        };

        const runVoiceCommand = (spokenText) => {
            const command = spokenText.toLowerCase();
            const compactCommand = command.replace(/\s+/g, " ");
            const stepIndex = parseStepCommand(command);
            const activeSteps = getGuideModel().steps;

            if (compactCommand.includes("next") || compactCommand.includes("अगला") || compactCommand.includes("पुढ") || compactCommand.includes("తర్వాత") || compactCommand.includes("পরের") || compactCommand.includes("அடுத்து")) {
                goToStep(Math.min(activeSteps.length - 1, currentStep + 1));
                speakCurrentStep(false);
                return;
            }

            if (compactCommand.includes("previous") || compactCommand.includes("back") || compactCommand.includes("पिछला") || compactCommand.includes("मागील") || compactCommand.includes("ముందు") || compactCommand.includes("আগের") || compactCommand.includes("முந்தைய")) {
                goToStep(Math.max(0, currentStep - 1));
                speakCurrentStep(false);
                return;
            }

            if (compactCommand.includes("repeat") || compactCommand.includes("दुबारा") || compactCommand.includes("पुन्हा") || compactCommand.includes("మళ్లీ") || compactCommand.includes("আবার") || compactCommand.includes("மீண்டும்")) {
                speakCurrentStep(false);
                return;
            }

            if (compactCommand.includes("play") || compactCommand.includes("चलाओ") || compactCommand.includes("सुरू") || compactCommand.includes("ప్రారంభ") || compactCommand.includes("চালু") || compactCommand.includes("தொடங்கு")) {
                isSequencePlaying = true;
                speakCurrentStep(true);
                return;
            }

            if (compactCommand.includes("stop") || compactCommand.includes("रुको") || compactCommand.includes("थांब") || compactCommand.includes("ఆపు") || compactCommand.includes("বন্ধ") || compactCommand.includes("நிறுத்து")) {
                stopVoice("Voice playback stopped by command.");
                return;
            }

            if (stepIndex !== null) {
                goToStep(Math.max(0, Math.min(activeSteps.length - 1, stepIndex)));
                speakCurrentStep(false);
                return;
            }

            setStatus("Command not recognized. Try: next, previous, repeat, play, stop, or step number.");
        };

        const setupVoiceRecognition = () => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (!SpeechRecognition || !listenButton) {
                return;
            }

            recognition = new SpeechRecognition();
            recognition.lang = getGuideModel().recognitionLang;
            recognition.continuous = true;
            recognition.interimResults = false;

            recognition.onresult = (event) => {
                const latest = event.results[event.results.length - 1];

                if (!latest || !latest[0]) {
                    return;
                }

                const transcript = latest[0].transcript.trim();
                setStatus(`Heard: ${transcript}`);
                runVoiceCommand(transcript);
            };

            recognition.onend = () => {
                if (isListening) {
                    try {
                        recognition.lang = getGuideModel().recognitionLang;
                        recognition.start();
                    } catch {
                        isListening = false;
                        listenButton.innerHTML = "<i class=\"ri-mic-line\" aria-hidden=\"true\"></i>Voice Commands";
                        setStatus("Voice command listening stopped.");
                    }
                }
            };

            recognition.onerror = () => {
                setStatus("Voice commands are temporarily unavailable.");
            };
        };

        renderSteps();
        setupVoiceRecognition();
        setStatus(getGuideModel().readyText);

        loadVoices();
        if ("speechSynthesis" in window) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        openGuideButtons.forEach((button) => {
            button.addEventListener("click", () => {
                openModal("guide-tutorial");
            });
        });

        languageSelect?.addEventListener("change", () => {
            activeLanguage = languageSelect.value in guideContent ? languageSelect.value : "en";
            currentStep = 0;
            isSequencePlaying = false;
            stopVoice(getGuideModel().readyText);

            if (recognition) {
                recognition.lang = getGuideModel().recognitionLang;
            }

            renderSteps();
        });

        playButton?.addEventListener("click", () => {
            isSequencePlaying = true;
            speakCurrentStep(true);
        });

        repeatButton?.addEventListener("click", () => {
            isSequencePlaying = false;
            speakCurrentStep(false);
        });

        stopButton?.addEventListener("click", () => {
            stopVoice();
        });

        listenButton?.addEventListener("click", () => {
            if (!recognition) {
                setStatus("Voice commands are not supported in this browser.");
                return;
            }

            if (!isListening) {
                isListening = true;
                listenButton.innerHTML = "<i class=\"ri-mic-off-line\" aria-hidden=\"true\"></i>Stop Listening";

                try {
                    recognition.start();
                    setStatus("Listening for commands. Try: next, repeat, stop, or step number.");
                } catch {
                    isListening = false;
                    listenButton.innerHTML = "<i class=\"ri-mic-line\" aria-hidden=\"true\"></i>Voice Commands";
                    setStatus("Unable to start voice commands.");
                }

                return;
            }

            isListening = false;
            listenButton.innerHTML = "<i class=\"ri-mic-line\" aria-hidden=\"true\"></i>Voice Commands";
            recognition.stop();
            setStatus("Voice command listening stopped.");
        });

        stepList.addEventListener("click", (event) => {
            const stepCard = event.target.closest(".guide-step");

            if (!stepCard) {
                return;
            }

            const stepCards = Array.from(stepList.querySelectorAll(".guide-step"));
            const stepIndex = stepCards.indexOf(stepCard);

            if (stepIndex < 0) {
                return;
            }

            goToStep(stepIndex);
            isSequencePlaying = false;
            speakCurrentStep(false);
        });
    }

    function bindGuideOnboarding() {
        const openGuideButton = document.getElementById("open-guide-now");
        const skipGuideButton = document.getElementById("skip-guide-now");
        const hasSeenOnboarding = getUserStoredValue(USER_STORAGE_KEYS.guideOnboardingSeen, false);

        openGuideButton?.addEventListener("click", () => {
            closeModal("guide-welcome");
            openModal("guide-tutorial");
        });

        skipGuideButton?.addEventListener("click", () => {
            closeModal("guide-welcome");
        });

        if (!hasSeenOnboarding) {
            setUserStoredValue(USER_STORAGE_KEYS.guideOnboardingSeen, true);
            openModal("guide-welcome");
        }
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
            setText("[data-home-next-detail]", "The dashboard will use this saved profile to prepare labour and scheme suggestions in the next steps.");
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
                if (button.dataset.jumpView === "guide-tutorial") {
                    openModal("guide-tutorial");
                    return;
                }

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
                label: "Tutorial / Guide",
                title: "Use guided steps and voice help",
                reason: landArea >= 2 || LABOUR_HEAVY_CROPS.includes(crop)
                    ? "This farm profile suggests labour-heavy work. Open the tutorial for step-by-step labour planning support."
                    : "Open the tutorial to follow setup steps and use multilingual voice guidance.",
                icon: "ri-book-open-line",
                view: "guide-tutorial"
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

    function bindLinkedInLabourSection() {
        const hireWorkerBtn = document.getElementById("btn-hire-worker");
        const applyJobBtn = document.getElementById("btn-apply-job");
        const hireWorkerForm = document.getElementById("hire-worker-form");
        const jobApplicationForm = document.getElementById("job-application-form");
        const modalBackdrops = document.querySelectorAll(".modal-backdrop");
        const modalCloseButtons = document.querySelectorAll(".modal-close");

        // Open modals
        hireWorkerBtn?.addEventListener("click", () => {
            openModal("hire-worker");
        });

        applyJobBtn?.addEventListener("click", () => {
            openModal("apply-job");
            renderAvailableJobs();
        });

        // Close modals
        modalBackdrops.forEach((backdrop) => {
            backdrop.addEventListener("click", (e) => {
                const modal = e.target.closest(".modal");
                if (modal) {
                    closeModal(modal.dataset.modal);
                }
            });
        });

        modalCloseButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const modal = button.closest(".modal");
                if (modal) {
                    closeModal(modal.dataset.modal);
                }
            });
        });

        // Handle job posting form submission
        hireWorkerForm?.addEventListener("submit", (event) => {
            event.preventDefault();

            const formData = new FormData(hireWorkerForm);
            const jobPosting = {
                id: `job-${Date.now()}`,
                jobTitle: cleanText(formData.get("jobTitle")),
                jobDescription: cleanText(formData.get("jobDescription")),
                workType: cleanText(formData.get("workType")),
                workersNeeded: parseInt(formData.get("workersNeeded")),
                jobDate: cleanText(formData.get("jobDate")),
                jobTime: cleanText(formData.get("jobTime")),
                jobLocation: cleanText(formData.get("jobLocation")),
                dailyWage: parseInt(formData.get("dailyWage")),
                skillsRequired: cleanText(formData.get("skillsRequired")),
                contactMobile: cleanText(formData.get("contactMobile")),
                posterName: state.profile?.farmerName || "Farmer",
                createdAt: new Date().toISOString(),
                applicants: []
            };

            if (!jobPosting.jobTitle || !jobPosting.workType || !jobPosting.jobDate) {
                showToast("Please fill all required fields.");
                return;
            }

            state.jobPostings.unshift(jobPosting);
            setUserStoredValue(USER_STORAGE_KEYS.jobPostings, state.jobPostings);
            hireWorkerForm.reset();
            closeModal("hire-worker");
            showToast("Job posted successfully!");
        });

        // Handle job application form submission
        jobApplicationForm?.addEventListener("submit", (event) => {
            event.preventDefault();

            if (!state.currentJobForApplication) {
                showToast("Please select a job first.");
                return;
            }

            const formData = new FormData(jobApplicationForm);
            const application = {
                id: `app-${Date.now()}`,
                jobId: state.currentJobForApplication.id,
                applicantName: cleanText(formData.get("applicantName")),
                applicantMobile: cleanText(formData.get("applicantMobile")),
                experience: parseInt(formData.get("experience")),
                skills: cleanText(formData.get("skills")),
                coverLetter: cleanText(formData.get("coverLetter")),
                isAvailable: formData.get("availability") === "on",
                appliedAt: new Date().toISOString()
            };

            if (!application.applicantName || !application.applicantMobile) {
                showToast("Please fill all required fields.");
                return;
            }

            state.jobApplications.push(application);
            setUserStoredValue(USER_STORAGE_KEYS.jobApplications, state.jobApplications);

            // Add applicant to job
            const job = state.jobPostings.find((j) => j.id === state.currentJobForApplication.id);
            if (job) {
                job.applicants = job.applicants || [];
                job.applicants.push(application);
                setUserStoredValue(USER_STORAGE_KEYS.jobPostings, state.jobPostings);
            }

            jobApplicationForm.reset();
            closeModal("job-application");
            showToast("Application submitted successfully!");
        });

        // Search and filter jobs
        const jobSearchInput = document.getElementById("job-search-input");
        const jobFilterType = document.getElementById("job-filter-type");
        const jobFilterWage = document.getElementById("job-filter-wage");

        jobSearchInput?.addEventListener("input", renderAvailableJobs);
        jobFilterType?.addEventListener("change", renderAvailableJobs);
        jobFilterWage?.addEventListener("change", renderAvailableJobs);

        // Add some mock jobs for demo
        addMockJobPostings();
        renderAvailableJobs();
    }

    function openModal(modalId) {
        const modal = document.querySelector(`[data-modal="${modalId}"]`);
        if (modal) {
            modal.classList.add("is-open");
        }
    }

    function closeModal(modalId) {
        const modal = document.querySelector(`[data-modal="${modalId}"]`);
        if (modal) {
            modal.classList.remove("is-open");
        }
    }

    function addMockJobPostings() {
        if (state.jobPostings.length === 0) {
            const mockJobs = [
                {
                    id: "mock-job-1",
                    jobTitle: "Harvesting Workers Needed",
                    jobDescription: "We need experienced harvesting workers for rice cultivation. Daily work, good wages.",
                    workType: "Harvesting",
                    workersNeeded: 5,
                    jobDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    jobTime: "06:00",
                    jobLocation: "Ahmednagar, Maharashtra",
                    dailyWage: 500,
                    skillsRequired: "Harvesting experience",
                    contactMobile: "9876543210",
                    posterName: "Raj Kumar",
                    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                    applicants: []
                },
                {
                    id: "mock-job-2",
                    jobTitle: "Sugarcane Cutters Required",
                    jobDescription: "Urgent need for sugarcane cutters. Heavy machinery support available. Experienced workers preferred.",
                    workType: "Sugarcane Cutting",
                    workersNeeded: 8,
                    jobDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    jobTime: "05:30",
                    jobLocation: "Pune, Maharashtra",
                    dailyWage: 600,
                    skillsRequired: "Machine operation",
                    contactMobile: "8765432109",
                    posterName: "Priya Sharma",
                    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                    applicants: []
                },
                {
                    id: "mock-job-3",
                    jobTitle: "Weeding & Fertilizing Services",
                    jobDescription: "Need workers for weeding and fertilizing. Suitable for beginners. Training provided.",
                    workType: "Weeding",
                    workersNeeded: 3,
                    jobDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    jobTime: "07:00",
                    jobLocation: "Nashik, Maharashtra",
                    dailyWage: 350,
                    skillsRequired: "None",
                    contactMobile: "7654321098",
                    posterName: "Arun Patel",
                    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    applicants: []
                }
            ];

            state.jobPostings = [...mockJobs, ...state.jobPostings];
            setUserStoredValue(USER_STORAGE_KEYS.jobPostings, state.jobPostings);
        }
    }

    function renderAvailableJobs() {
        const jobListings = document.getElementById("job-listings");
        const noJobsMessage = document.getElementById("no-jobs-message");
        const searchQuery = (document.getElementById("job-search-input")?.value || "").toLowerCase();
        const filterType = document.getElementById("job-filter-type")?.value || "";
        const filterWage = document.getElementById("job-filter-wage")?.value || "";

        if (!jobListings) {
            return;
        }

        let filteredJobs = state.jobPostings.filter((job) => {
            const matchesSearch = searchQuery === "" || job.jobTitle.toLowerCase().includes(searchQuery) || job.jobLocation.toLowerCase().includes(searchQuery);
            const matchesType = filterType === "" || job.workType === filterType;
            const matchesWage = filterWage === "" || checkWageRange(job.dailyWage, filterWage);

            return matchesSearch && matchesType && matchesWage;
        });

        if (filteredJobs.length === 0) {
            jobListings.innerHTML = "";
            noJobsMessage.style.display = "block";
            return;
        }

        noJobsMessage.style.display = "none";
        jobListings.innerHTML = filteredJobs.map((job) => `
            <div class="job-card">
                <div class="job-card-header">
                    <h3 class="job-card-title">${job.jobTitle}</h3>
                    <span class="job-card-wage">Rs. ${job.dailyWage}/day</span>
                </div>
                <p class="job-card-location"><i class="ri-map-pin-line" aria-hidden="true"></i> ${job.jobLocation}</p>
                <p class="job-card-description">${job.jobDescription}</p>
                <div class="job-card-details">
                    <span class="job-card-detail"><i class="ri-team-line"></i> ${job.workersNeeded} spots</span>
                    <span class="job-card-detail"><i class="ri-calendar-line"></i> ${formatDate(job.jobDate)}</span>
                    <span class="job-card-detail"><i class="ri-time-line"></i> ${job.jobTime}</span>
                </div>
                <button class="job-card-apply" type="button" data-apply-job="${job.id}">
                    Apply Now
                </button>
            </div>
        `).join("");

        // Add event listeners to apply buttons
        document.querySelectorAll("[data-apply-job]").forEach((button) => {
            button.addEventListener("click", () => {
                const jobId = button.dataset.applyJob;
                const job = state.jobPostings.find((j) => j.id === jobId);
                if (job) {
                    state.currentJobForApplication = job;
                    showJobApplicationModal(job);
                }
            });
        });
    }

    function showJobApplicationModal(job) {
        const detailsContainer = document.getElementById("job-application-details");
        const form = document.getElementById("job-application-form");

        detailsContainer.innerHTML = `
            <h3>${job.jobTitle}</h3>
            <p><strong>Work Type:</strong> ${job.workType}</p>
            <p><strong>Date:</strong> ${formatDate(job.jobDate)}</p>
            <p><strong>Time:</strong> ${job.jobTime}</p>
            <p><strong>Location:</strong> ${job.jobLocation}</p>
            <p><strong>Daily Wage:</strong> Rs. ${job.dailyWage}</p>
            <p><strong>Workers Needed:</strong> ${job.workersNeeded}</p>
        `;

        form.reset();
        closeModal("apply-job");
        openModal("job-application");
    }

    function checkWageRange(wage, range) {
        if (range === "0-300") return wage <= 300;
        if (range === "300-500") return wage >= 300 && wage <= 500;
        if (range === "500-800") return wage >= 500 && wage <= 800;
        if (range === "800") return wage >= 800;
        return true;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
})();
