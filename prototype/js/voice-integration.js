/**
 * AgriShield Voice Integration
 * Simple and easy-to-understand voice input integration for labour forms
 */

let voiceManager = null;
let currentLanguage = "en-US";

/**
 * Initialize voice functionality when DOM is ready
 */
function initVoiceInput() {
    // Check if VoiceInputManager is available
    if (typeof VoiceInputManager === "undefined") {
        console.warn("VoiceInputManager not loaded");
        return;
    }

    // Create voice manager instance
    voiceManager = new VoiceInputManager({
        defaultLanguage: "en-US",
        silenceTimeout: 2000
    });

    // If voice not supported, disable all mic buttons
    if (!voiceManager.isSupported) {
        disableAllMicButtons();
        console.warn("Speech Recognition not supported in this browser");
        return;
    }

    // Attach mic buttons to all voice input fields
    setupMicButtons();

    // Sync language selector
    setupLanguageSync();

    console.log("✅ Voice input ready");
}

/**
 * Setup mic buttons for all form fields
 */
function setupMicButtons() {
    const micButtons = document.querySelectorAll("button[data-voice-input]");

    micButtons.forEach((btn) => {
        const inputId = btn.getAttribute("data-voice-input");

        // Add click handler
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            
            if (voiceManager.isCurrentlyListening() && voiceManager.currentTargetId === inputId) {
                // Stop listening if already listening to this field
                voiceManager.stopListening();
            } else {
                // Start listening to this field
                voiceManager.startListening(inputId, currentLanguage);
            }
        });
    });
}

/**
 * Sync language selector with voice manager
 */
function setupLanguageSync() {
    const languageSelect = document.getElementById("labour-language-select");

    if (!languageSelect) return;

    // Update voice manager when language changes
    languageSelect.addEventListener("change", (e) => {
        currentLanguage = e.target.value;
        if (voiceManager) {
            voiceManager.setLanguage(currentLanguage);
        }
    });

    // Set initial language
    currentLanguage = languageSelect.value;
}

/**
 * Disable all mic buttons if speech API not supported
 */
function disableAllMicButtons() {
    const micButtons = document.querySelectorAll("button[data-voice-input]");
    micButtons.forEach((btn) => {
        btn.disabled = true;
        btn.title = "Voice not supported";
    });
}

/**
 * Start listening automatically (will override showToast in VoiceInputManager)
 */
function setupNotifications() {
    // Setup toast notifications
    if (voiceManager) {
        voiceManager.showNotification = function (message) {
            if (typeof showToast !== "undefined") {
                showToast(message);
            } else {
                console.log(message);
            }
        };
    }
}

// Initialize when page loads
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initVoiceInput();
        setupNotifications();
    });
} else {
    initVoiceInput();
    setupNotifications();
}

