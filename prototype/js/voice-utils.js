/**
 * AgriShield Voice Input Utilities
 * Handles speech-to-text for all form fields with Marathi, Hindi, and English support
 */

class VoiceInputManager {
    constructor(options = {}) {
        this.recognition = null;
        this.isListening = false;
        this.currentTargetId = null;
        this.currentLanguage = options.defaultLanguage || "en-US";
        this.silenceTimeout = options.silenceTimeout || 2000;
        this.silenceTimer = null;
        this.micButtons = new Map();
        
        // Language configurations with fallback support
        this.languageConfig = {
            "en-US": {
                name: "English",
                lang: "en-US",
                fallback: "hi-IN",
                placeholder: "Tap mic and speak"
            },
            "hi-IN": {
                name: "हिन्दी",
                lang: "hi-IN",
                fallback: "en-US",
                placeholder: "माइक दबाएं और बोलें"
            },
            "mr-IN": {
                name: "मराठी",
                lang: "mr-IN",
                fallback: "hi-IN",
                placeholder: "मायक दाबा आणि बोला"
            }
        };

        // Status messages for different states
        this.statusMessages = {
            "en-US": {
                listening: "🎤 Listening...",
                processing: "✨ Processing...",
                success: "✅ Text captured",
                error: "❌ Try again",
                notSupported: "🚫 Voice not supported",
                clickToStart: "Click to speak"
            },
            "hi-IN": {
                listening: "🎤 सुन रहा हूं...",
                processing: "✨ प्रोसेस कर रहा हूं...",
                success: "✅ पाठ कैप्चर किया गया",
                error: "❌ फिर से कोशिश करें",
                notSupported: "🚫 आवाज समर्थित नहीं है",
                clickToStart: "बोलने के लिए क्लिक करें"
            },
            "mr-IN": {
                listening: "🎤 ऐकत आहे...",
                processing: "✨ प्रक्रिया करत आहे...",
                success: "✅ मजकूर कॅप्चर केला",
                error: "❌ पुन्हा प्रयत्न करा",
                notSupported: "🚫 आवाज समर्थित नाही",
                clickToStart: "बोलण्यासाठी क्लिक करा"
            }
        };

        this.initializeSpeechRecognition();
    }

    /**
     * Initialize the Web Speech API
     */
    initializeSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn("Speech Recognition API not supported in this browser");
            this.isSupported = false;
            return;
        }

        this.isSupported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        // Handle results
        this.recognition.onresult = (event) => {
            let interimTranscript = "";
            let finalTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + " ";
                } else {
                    interimTranscript += transcript;
                }
            }

            // Show interim results while listening
            if (interimTranscript) {
                this.updateFieldPreview(interimTranscript);
            }

            // When final result arrives, fill the field
            if (finalTranscript) {
                this.fillField(finalTranscript.trim());
                this.resetSilenceTimer();
            }
        };

        // Handle errors
        this.recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            if (event.error !== "no-speech" && event.error !== "audio-capture") {
                this.showStatus("error");
                this.stopListening();
            }
        };

        // Handle end of recognition
        this.recognition.onend = () => {
            if (this.isListening) {
                this.stopListening();
            }
        };

        // Handle start
        this.recognition.onstart = () => {
            this.isListening = true;
            this.showStatus("listening");
            this.resetSilenceTimer();
        };
    }

    /**
     * Attach a mic button to an input field
     */
    attachMicButton(inputId, language = "en-US") {
        const input = document.getElementById(inputId);
        if (!input) {
            console.warn(`Input field with ID "${inputId}" not found`);
            return;
        }

        // Create mic button
        const micBtn = document.createElement("button");
        micBtn.type = "button";
        micBtn.className = "voice-mic-btn";
        micBtn.title = this.statusMessages[language]?.clickToStart || "Click to speak";
        micBtn.setAttribute("data-input-id", inputId);
        micBtn.setAttribute("aria-label", `Voice input for ${input.name}`);
        
        // Icon
        const icon = document.createElement("span");
        icon.className = "voice-mic-icon";
        icon.textContent = "🎤";
        micBtn.appendChild(icon);

        // Status indicator
        const status = document.createElement("span");
        status.className = "voice-status-dot";
        status.setAttribute("data-status", "idle");
        micBtn.appendChild(status);

        // Insert after input
        input.parentElement?.insertBefore(micBtn, input.nextSibling);

        // Attach event listener
        micBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (this.isListening && this.currentTargetId === inputId) {
                this.stopListening();
            } else {
                this.startListening(inputId, language);
            }
        });

        this.micButtons.set(inputId, micBtn);
        return micBtn;
    }

    /**
     * Start listening for the specified input field
     */
    startListening(inputId, language = "en-US") {
        if (!this.isSupported) {
            this.showNotification(this.statusMessages[language]?.notSupported || "Voice not supported");
            return;
        }

        // Stop any ongoing recognition
        if (this.isListening) {
            this.stopListening();
        }

        this.currentTargetId = inputId;
        this.currentLanguage = language || this.currentLanguage;

        // Set language with fallback
        const config = this.languageConfig[language];
        if (!config) {
            console.warn(`Language ${language} not configured, using English`);
            this.currentLanguage = "en-US";
        }

        this.recognition.lang = this.languageConfig[this.currentLanguage].lang;

        try {
            this.recognition.start();
            this.updateMicButtonUI(inputId, "listening");
        } catch (e) {
            console.error("Error starting speech recognition:", e);
            this.showStatus("error");
        }
    }

    /**
     * Stop listening
     */
    stopListening() {
        if (!this.isListening) return;

        try {
            this.recognition.abort();
        } catch (e) {
            console.error("Error stopping recognition:", e);
        }

        this.isListening = false;
        this.clearSilenceTimer();
        
        if (this.currentTargetId) {
            this.updateMicButtonUI(this.currentTargetId, "idle");
        }
    }

    /**
     * Fill the input field with recognized text
     */
    fillField(text) {
        if (!this.currentTargetId) return;

        const input = document.getElementById(this.currentTargetId);
        if (!input) return;

        // Process text based on input type
        let processedText = text;

        // Convert spoken numbers to digits for number input fields
        if (input.type === "number") {
            processedText = this.convertSpokenNumbersToDigits(text, this.currentLanguage);
        }

        // Append to existing text or replace based on input type
        if (input.value && input.value.trim()) {
            input.value += " " + processedText;
        } else {
            input.value = processedText;
        }

        // Trigger change event
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));

        // Show success status
        this.showStatus("success");
        this.updateMicButtonUI(this.currentTargetId, "success");
    }

    /**
     * Convert spoken numbers to digits
     * Supports English, Hindi, and Marathi number words
     */
    convertSpokenNumbersToDigits(text, language) {
        // Number word mappings for different languages
        const numberWords = {
            "en-US": {
                "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
                "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
                "eleven": "11", "twelve": "12", "thirteen": "13", "fourteen": "14", "fifteen": "15",
                "sixteen": "16", "seventeen": "17", "eighteen": "18", "nineteen": "19", "twenty": "20",
                "thirty": "30", "forty": "40", "fifty": "50", "sixty": "60", "seventy": "70",
                "eighty": "80", "ninety": "90", "hundred": "00", "thousand": "000"
            },
            "hi-IN": {
                "शून्य": "0", "एक": "1", "दो": "2", "तीन": "3", "चार": "4", "पाँच": "5",
                "छह": "6", "सात": "7", "आठ": "8", "नौ": "9", "दस": "10",
                "ग्यारह": "11", "बारह": "12", "तेरह": "13", "चौदह": "14", "पंद्रह": "15",
                "सोलह": "16", "सत्रह": "17", "अठारह": "18", "उन्नीस": "19", "बीस": "20",
                "तीस": "30", "चालीस": "40", "पचास": "50", "साठ": "60", "सत्तर": "70",
                "अस्सी": "80", "नब्बे": "90", "सौ": "00", "हज़ार": "000"
            },
            "mr-IN": {
                "शून्य": "0", "एक": "1", "दोन": "2", "तीन": "3", "चार": "4", "पाच": "5",
                "सहा": "6", "सात": "7", "आठ": "8", "नऊ": "9", "दहा": "10",
                "अकरा": "11", "बारा": "12", "तेरा": "13", "चौदा": "14", "पंधरा": "15",
                "सोळा": "16", "सतरा": "17", "अठरा": "18", "एकोणीस": "19", "वीस": "20",
                "तीस": "30", "चाळीस": "40", "पन्नास": "50", "साठ": "60", "सत्तर": "70",
                "अशी": "80", "नव्वद": "90", "शंभर": "00", "हजार": "000"
            }
        };

        // Get the number words for current language, fallback to English
        const words = numberWords[language] || numberWords["en-US"];

        // Split text into words and process each
        const wordsArray = text.toLowerCase().split(/\s+/);
        let result = "";

        for (const word of wordsArray) {
            // Check if word is a number word
            if (words[word]) {
                result += words[word];
            } else {
                // Check if it's already a digit
                if (/^\d+$/.test(word)) {
                    result += word;
                } else {
                    // If not a number word or digit, keep as is (might be part of larger number)
                    result += word;
                }
            }
        }

        // Clean up the result - remove extra zeros and format properly
        result = result.replace(/000/g, "000"); // Keep thousands
        result = result.replace(/00/g, "00"); // Keep hundreds

        // If result contains only numbers, return it
        if (/^\d+$/.test(result)) {
            return result;
        }

        // If conversion failed, return original text
        return text;
    }

    /**
     * Update field with interim results while listening
     */
    updateFieldPreview(interimText) {
        if (!this.currentTargetId) return;

        const input = document.getElementById(this.currentTargetId);
        if (!input) return;

        // Store original value in data attribute
        if (!input.dataset.originalValue) {
            input.dataset.originalValue = input.value;
        }

        // Show interim result in a subtle way
        input.value = (input.dataset.originalValue || "") + " " + interimText;
        input.style.opacity = "0.7"; // Subtle visual feedback
    }

    /**
     * Reset silence timer - auto-stop after silence
     */
    resetSilenceTimer() {
        this.clearSilenceTimer();
        this.silenceTimer = setTimeout(() => {
            if (this.isListening) {
                this.stopListening();
            }
        }, this.silenceTimeout);
    }

    /**
     * Clear silence timer
     */
    clearSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }

    /**
     * Update mic button UI based on status
     */
    updateMicButtonUI(inputId, status) {
        const micBtn = this.micButtons.get(inputId);
        if (!micBtn) return;

        const statusDot = micBtn.querySelector(".voice-status-dot");
        if (statusDot) {
            statusDot.setAttribute("data-status", status);
        }

        // Update visual feedback
        if (status === "listening") {
            micBtn.classList.add("voice-mic-btn--listening");
            micBtn.classList.remove("voice-mic-btn--success", "voice-mic-btn--error");
        } else if (status === "success") {
            micBtn.classList.remove("voice-mic-btn--listening");
            micBtn.classList.add("voice-mic-btn--success");
            setTimeout(() => {
                micBtn.classList.remove("voice-mic-btn--success");
            }, 2000);
        } else if (status === "error") {
            micBtn.classList.add("voice-mic-btn--error");
            setTimeout(() => {
                micBtn.classList.remove("voice-mic-btn--error");
            }, 2000);
        } else {
            micBtn.classList.remove("voice-mic-btn--listening", "voice-mic-btn--success", "voice-mic-btn--error");
        }
    }

    /**
     * Show status message
     */
    showStatus(type) {
        const messages = this.statusMessages[this.currentLanguage];
        const message = messages ? messages[type] : "";
        
        if (message) {
            this.showNotification(message);
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message) {
        // Try to use existing toast system if available
        if (window.showToast) {
            window.showToast(message);
        } else {
            // Fallback to console
            console.log(message);
        }
    }

    /**
     * Set language
     */
    setLanguage(language) {
        if (this.languageConfig[language]) {
            this.currentLanguage = language;
        }
    }

    /**
     * Check if speech recognition is supported
     */
    isSupported() {
        return this.isSupported;
    }

    /**
     * Check if currently listening
     */
    isCurrentlyListening() {
        return this.isListening;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopListening();
        this.clearSilenceTimer();
        this.micButtons.clear();
    }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
    module.exports = VoiceInputManager;
}
