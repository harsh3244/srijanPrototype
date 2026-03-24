# 🎤 Voice Input Testing Guide - AgriShield Labour Finder

## ✅ What's Been Implemented

### 1. **Marathi & Multi-Language Voice Support**
- ✅ English (en-US)
- ✅ Hindi (hi-IN)  
- ✅ Marathi (mr-IN) with automatic fallback to Hindi if needed
- Change language using the **Language dropdown** in the Labour Finding section

### 2. **Smart Number Recognition**
- ✅ **NEW**: Voice recognition now converts spoken numbers to digits
- Say "five" → gets "5" in number fields
- Say "पाच" (Hindi/Marathi) → gets "5" in number fields
- Works for all number input fields (workers, wage, experience)

### 3. **Mic Buttons for ALL Fields**

#### Hire Workers Form (हायर)
- 🎤 Work Type field
- 🎤 Location field
- 🎤 Number of Workers field (now recognizes "five" → "5")
- 🎤 Wage/Day field (now recognizes "five hundred" → "500")

#### Get Work Form (काम)
- 🎤 Name field
- 🎤 Work Type field
- 🎤 Experience field (now recognizes "two" → "2")

### 4. **Smart Voice Features**
- **Auto-stop after silence** (2 seconds)
- **Real-time transcription** while speaking
- **Status indicators** on mic button:
  - 🎤 = Idle
  - 🎤 Listening... (animated) = Currently listening
  - ✅ Green flash = Text captured
  - ❌ Red flash = Error
- **Language-aware** - automatically uses selected language

### 5. **Enhanced Contact Functionality**
- ✅ **NEW**: Contact buttons now search for contact info instead of just calling
- Click "Contact" → Opens browser search for institution/hirer contact details
- Searches: "Institution Name Location contact number phone email address"
- Opens in new tab for easy access

## 🧪 How to Test

### Step 1: Open the Dashboard
1. Go to [AgriShield Dashboard](http://localhost:3000/prototype/dashboard.html)
2. Login with demo credentials

### Step 2: Navigate to Labour Finding
1. Click **"Labour Finding"** in sidebar
2. Click either:
   - **हायर** (Hire Workers), OR
   - **काम** (Get Work)

### Step 3: Test Voice Input

#### For English:
```
1. Select "English" from Language dropdown
2. Click 🎤 button next to any field
3. Speak: "Harvesting" or "Village name"
4. For numbers: Say "five workers" → should enter "5"
5. For wage: Say "five hundred rupees" → should enter "500"
```

#### For Hindi/Marathi:
```
1. Select "हिन्दी" or "मराठी" from Language dropdown
2. Click 🎤 button next to any field
3. Speak in Hindi or Marathi
4. For numbers: Say "पाच मजदूर" → should enter "5"
5. Text will appear in the field
```

### Step 4: Test Contact Functionality

#### Contact Search:
```
1. In Labour Finding results, click any "Contact" button
2. Browser should open new tab with search results
3. Search query includes: institution name + location + contact info
4. Should show phone numbers, emails, addresses
```

### Step 5: Expected Behavior

✅ **You Should See:**
- Mic button animates (pulses) while listening
- Text appears in the field while speaking
- **Numbers convert properly**: "five" → "5" in number fields
- Toast message shows transcribed text
- Button turns green briefly on success
- **Contact opens browser search** instead of phone dialer
- Form can be submitted with voice-filled data

❌ **If Not Working:**
1. Check browser console for errors
2. Verify browser supports Web Speech API:
   - Chrome/Edge: ✅ Supported
   - Firefox: ⚠️ Limited support
   - Safari: ✅ Partially supported
3. Check microphone is enabled in browser permissions
4. Try a different language

## 📋 File Structure

```
prototype/
├── dashboard.html              # Updated forms with mic buttons
├── css/
│   └── style.css               # Voice button styles & animations
└── js/
    ├── voice-utils.js          # Core VoiceInputManager class
    ├── voice-integration.js     # Integration with dashboard
    └── script.js               # Existing dashboard logic
```

## 🔧 How It Works (Simple Explanation)

### VoiceInputManager (voice-utils.js)
- **Listens** for speech using browser's Web Speech API
- **Captures** audio and converts it to text
- **Fills** the specified input field automatically
- **Updates** UI with status (listening, success, error)

### Integration (voice-integration.js)
- **Initializes** VoiceInputManager on page load
- **Attaches** click handlers to all mic buttons
- **Syncs** language selection
- **Shows** notifications via toast messages

### UI Changes (dashboard.html)
- Each form field now has: `<input id="field-id">` + `<button data-voice-input="field-id">🎤</button>`
- Buttons use `data-voice-input` attribute to know which field to fill

## 🌐 Language Codes Used

| Language | Code | Script |
|----------|------|--------|
| English | en-US | English script |
| Hindi | hi-IN | Devanagari script |
| Marathi | mr-IN | Devanagari script |

## 🎨 Visual Feedback

| State | Icon | Color | Animation |
|-------|------|-------|-----------|
| Idle | 🎤 | Gray | None |
| Listening | 🎤 | Orange | Pulse 💫 |
| Success | ✅ | Green | Flash ⚡ |
| Error | ❌ | Red | Shake 🔄 |

## ⚡ Quick Tips

1. **Speak Clearly** - Better pronunciation = better recognition
2. **Speak in Native Language** - Use Marathi for mr-IN, Hindi for hi-IN
3. **Wait for Silence** - Mic auto-stops after 2 seconds of silence
4. **Check Permissions** - Browser asks for microphone access first time
5. **Test in Chrome** - Best browser support for Web Speech API

## 📞 Troubleshooting

### "Voice not supported"
- Use Chrome, Edge, or Safari
- Update your browser to latest version
- Not supported on Firefox (use Chrome instead)

### Mic button doesn't respond
- Check browser console for errors (F12 → Console)
- Ensure microphone is physically working
- Grant microphone permission when browser asks

### Wrong language being recognized
- Select correct language from dropdown BEFORE clicking mic
- Speak in the selected language
- If Marathi fails, it auto-fallsback to Hindi

### Numbers not converting to digits
- Make sure you're clicking mic on NUMBER input fields (workers, wage, experience)
- Speak clearly: "five" should become "5"
- Try saying just the number: "5" instead of "five"
- Check if field is actually a number input (has spinner controls)

### Contact search not working
- Check if popup blocker is enabled in browser
- Allow popups for the AgriShield site
- Contact button should open new tab with Google search
- If blocked, you'll see "Unable to open search" message

## 🚀 Future Enhancements (Optional)

- Add waveform animation while listening
- Add confidence score display
- Add redo button for each field
- Add batch voice fill for multiple fields
- Add voice feedback (TTS confirmation)

---

**Version:** 1.0  
**Last Updated:** March 2026  
**Status:** ✅ Production Ready
