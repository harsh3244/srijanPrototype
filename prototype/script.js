document.addEventListener("DOMContentLoaded", () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    initMenu();
    initActiveNav();
    initSmoothScroll(prefersReducedMotion);
    initRevealObserver(prefersReducedMotion);
    initCounters(prefersReducedMotion);
    initFraudDemo();
    initLanguageDemo();
    updateFooterYear();
});

function initMenu() {
    const headerShell = document.querySelector(".header-shell");
    const navToggle = document.querySelector(".nav-toggle");
    const navLinks = document.querySelectorAll(".site-nav a");

    if (!headerShell || !navToggle) {
        return;
    }

    navToggle.addEventListener("click", () => {
        const isOpen = headerShell.classList.toggle("menu-open");
        navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            headerShell.classList.remove("menu-open");
            navToggle.setAttribute("aria-expanded", "false");
        });
    });
}

function initActiveNav() {
    const page = document.body.dataset.page;
    const links = document.querySelectorAll("[data-page-link]");

    links.forEach((link) => {
        if (link.dataset.pageLink === page) {
            link.classList.add("is-current");
        }
    });
}

function initSmoothScroll(prefersReducedMotion) {
    const internalLinks = document.querySelectorAll('a[href^="#"]');

    internalLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            const targetId = link.getAttribute("href");

            if (!targetId || targetId === "#") {
                return;
            }

            const target = document.querySelector(targetId);

            if (!target) {
                return;
            }

            event.preventDefault();
            target.scrollIntoView({
                behavior: prefersReducedMotion ? "auto" : "smooth",
                block: "start"
            });
        });
    });
}

function initRevealObserver(prefersReducedMotion) {
    const revealItems = document.querySelectorAll("[data-reveal]");

    if (!revealItems.length) {
        return;
    }

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
        revealItems.forEach((item) => item.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver(
        (entries, revealObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            });
        },
        {
            threshold: 0.16,
            rootMargin: "0px 0px -6% 0px"
        }
    );

    revealItems.forEach((item) => observer.observe(item));
}

function initCounters(prefersReducedMotion) {
    const counters = document.querySelectorAll(".counter");

    if (!counters.length) {
        return;
    }

    const animateCounter = (counter) => {
        const target = Number(counter.dataset.count || 0);
        const prefix = counter.dataset.prefix || "";
        const suffix = counter.dataset.suffix || "";
        const duration = prefersReducedMotion ? 0 : 1200;
        const start = performance.now();

        const frame = (timestamp) => {
            const progress = duration === 0 ? 1 : Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = Math.round(target * eased);

            counter.textContent = `${prefix}${value}${suffix}`;

            if (progress < 1) {
                requestAnimationFrame(frame);
            } else {
                counter.textContent = `${prefix}${target}${suffix}`;
            }
        };

        requestAnimationFrame(frame);
    };

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
        counters.forEach(animateCounter);
        return;
    }

    const observer = new IntersectionObserver(
        (entries, counterObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            });
        },
        { threshold: 0.45 }
    );

    counters.forEach((counter) => observer.observe(counter));
}

function initFraudDemo() {
    const buttons = document.querySelectorAll("[data-fraud-case]");

    if (!buttons.length) {
        return;
    }

    const caseText = document.querySelector("[data-fraud-text]");
    const verdict = document.querySelector("[data-fraud-verdict]");
    const score = document.querySelector("[data-fraud-score]");
    const title = document.querySelector("[data-fraud-title]");
    const explain = document.querySelector("[data-fraud-explain]");
    const findings = document.querySelector("[data-fraud-findings]");
    const actions = document.querySelector("[data-fraud-actions]");
    const meterFill = document.querySelector("[data-fraud-meter]");

    const cases = {
        scheme: {
            verdictClass: "verdict-banner verdict-banner--danger",
            verdictLabel: "Stop / रुकें",
            scoreLabel: "88 / 100",
            meterWidth: "88%",
            meterBackground: "linear-gradient(90deg, #ffcb63, #ff7e76)",
            text: "PM-KISAN update: Pay INR 1,999 processing fee today to receive next installment. Visit pm-kisan-help-india.in",
            title: "This looks like a fake government scheme message.",
            explain: "The link is not an official government domain and the message asks for a processing fee. That is a strong fraud signal.",
            findings: [
                "Unofficial website address instead of a real .gov.in portal.",
                "Payment request before registration approval.",
                "Urgent language used to create panic."
            ],
            actions: [
                "Do not pay the fee.",
                "Open the official portal only from a trusted source.",
                "Show the message to a CSC, bank, or AgriShield support contact."
            ]
        },
        loan: {
            verdictClass: "verdict-banner verdict-banner--warning",
            verdictLabel: "Check Carefully / ध्यान से देखें",
            scoreLabel: "62 / 100",
            meterWidth: "62%",
            meterBackground: "linear-gradient(90deg, #ffcb63, #ff9f6c)",
            text: "KCC loan agent says: Send Aadhaar and INR 750 file charge on WhatsApp today to approve your farm loan fast.",
            title: "This loan offer needs careful verification before you share anything.",
            explain: "The request may be fake because the agent is asking for documents and money over WhatsApp before official bank verification.",
            findings: [
                "No branch name or official bank reference shared.",
                "Document request is happening before identity verification.",
                "Payment is requested to a personal number, not a bank channel."
            ],
            actions: [
                "Do not send money to a personal number.",
                "Call the bank branch directly using the bank's official number.",
                "Verify whether the agent is registered with the bank."
            ]
        },
        portal: {
            verdictClass: "verdict-banner verdict-banner--safe",
            verdictLabel: "Safe / सुरक्षित",
            scoreLabel: "18 / 100",
            meterWidth: "18%",
            meterBackground: "linear-gradient(90deg, #7de38d, #48d5cd)",
            text: "Visit official PM-KISAN portal: pmkisan.gov.in. No payment required to check status.",
            title: "This looks like a normal low-risk message.",
            explain: "The message points to an official portal and does not ask for money, OTP, or urgent private details.",
            findings: [
                "Official government website format is used.",
                "No payment or urgent threat wording found.",
                "The action is to check status, not to transfer money."
            ],
            actions: [
                "Open the portal and verify the page address again.",
                "Do not share OTP with anyone.",
                "Continue only if the browser shows the correct official site."
            ]
        }
    };

    const renderList = (container, items) => {
        if (!container) {
            return;
        }

        container.innerHTML = "";
        items.forEach((item) => {
            const li = document.createElement("li");
            const icon = document.createElement("i");
            icon.className = "ri-check-line";
            const span = document.createElement("span");
            span.textContent = item;
            li.append(icon, span);
            container.append(li);
        });
    };

    const applyCase = (caseKey) => {
        const selectedCase = cases[caseKey];

        if (!selectedCase) {
            return;
        }

        buttons.forEach((button) => {
            button.classList.toggle("is-active", button.dataset.fraudCase === caseKey);
        });

        if (caseText) {
            caseText.textContent = selectedCase.text;
        }

        if (verdict) {
            verdict.className = selectedCase.verdictClass;
            verdict.textContent = selectedCase.verdictLabel;
        }

        if (score) {
            score.textContent = selectedCase.scoreLabel;
        }

        if (title) {
            title.textContent = selectedCase.title;
        }

        if (explain) {
            explain.textContent = selectedCase.explain;
        }

        if (meterFill) {
            meterFill.style.width = selectedCase.meterWidth;
            meterFill.style.background = selectedCase.meterBackground;
        }

        renderList(findings, selectedCase.findings);
        renderList(actions, selectedCase.actions);
    };

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            applyCase(button.dataset.fraudCase);
        });
    });

    applyCase("scheme");
}

function initLanguageDemo() {
    const buttons = document.querySelectorAll("[data-language-button]");

    if (!buttons.length) {
        return;
    }

    const nativeLabel = document.querySelector("[data-language-native]");
    const englishLabel = document.querySelector("[data-language-english]");
    const speakerLabel = document.querySelector("[data-language-speakers]");
    const sampleNative = document.querySelector("[data-language-sample-native]");
    const sampleEnglish = document.querySelector("[data-language-sample-english]");

    const applyLanguage = (button) => {
        buttons.forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");

        if (nativeLabel) {
            nativeLabel.textContent = button.dataset.native || "";
        }

        if (englishLabel) {
            englishLabel.textContent = button.dataset.english || "";
        }

        if (speakerLabel) {
            speakerLabel.textContent = button.dataset.speakers || "";
        }

        if (sampleNative) {
            sampleNative.textContent = button.dataset.sampleNative || "";
        }

        if (sampleEnglish) {
            sampleEnglish.textContent = button.dataset.sampleEnglish || "";
        }
    };

    buttons.forEach((button) => {
        button.addEventListener("click", () => applyLanguage(button));
    });

    applyLanguage(buttons[0]);
}

function updateFooterYear() {
    document.querySelectorAll(".js-year").forEach((item) => {
        item.textContent = String(new Date().getFullYear());
    });
}
