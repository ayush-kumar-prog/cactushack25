# EmergencyAR - Complete Project Handoff

## Project Overview

**EmergencyAR** is a mobile app that provides real-time AI-powered guidance for emergency medical situations (CPR, first aid). A bystander points their phone camera at a patient, speaks observations, and receives voice-guided instructions with AR overlays showing WHERE to act.

### Tech Stack
- **Framework:** React Native 0.81.5 + Expo 54
- **AI:** Google Gemini 2.0 Flash Exp (vision + text)
- **TTS:** ElevenLabs API (eleven_flash_v2_5) with expo-speech fallback
- **Voice Input:** expo-speech-recognition
- **Camera:** expo-camera

### Current State: ✅ WORKING with OPTIMIZATIONS

**Optimizations implemented (v2 build):**
1. **Skip image on follow-ups** - Only first message captures camera (follow-ups are text-only ~1-2s)
2. **Aggressive image resize** - Images resized to 320x240 (~50KB vs ~6MB)
3. **expo-image-manipulator** - Added for efficient image processing

The full pipeline works end-to-end:
- Voice recognition captures user speech
- Camera captures frame
- Gemini analyzes image + conversation
- AI responds with guidance
- ElevenLabs speaks the response
- AR markers show on screen (when Gemini returns `[MARKER:chest]`, etc.)

---

## Two Apps on Device

| App | Package | Purpose |
|-----|---------|---------|
| EmergencyAR v1 | `com.hackathon.emergencyar` | Stable working version |
| EmergencyAR v2 | `com.hackathon.emergencyarv2` | Development version |

---

## Timing Breakdown (from actual logs)

### Before Optimization: ~7 seconds end-to-end

| Step | Duration | Notes |
|------|----------|-------|
| Voice recognition | 2-4s | User speaking time |
| Camera capture | 700-800ms | At quality 0.1 |
| **Gemini API (with image)** | **5,800-6,700ms** | 🔴 **MAIN BOTTLENECK** |
| State update | 40ms | React state |
| ElevenLabs TTS API | 850-960ms | Network call |
| Audio playback | ~7s | Just audio duration |

### After Optimization (v2): ~2-3 seconds for follow-ups

| Step | First Message | Follow-up Messages |
|------|---------------|-------------------|
| Camera + resize | ~1s (320x240) | SKIPPED |
| **Gemini API** | ~3-4s (smaller image) | **~1-2s (text-only)** |
| ElevenLabs TTS | ~1s | ~1s |
| **Total (excluding audio)** | ~5s | **~2-3s** |

### The Solution
1. **Skip image on follow-ups** - Only first message needs visual context
2. **Aggressive resize** - 320x240 @ 0.5 quality (~50KB vs ~6MB)
3. **Every 5th message** refreshes the image for updated visual context

---

## File Structure

```
emergency-ar/
├── App.tsx                      # Main app component (camera, AR overlay, voice button)
├── app.json                     # Expo config (package name, permissions)
├── .env                         # API keys (EXPO_PUBLIC_GEMINI_KEY, EXPO_PUBLIC_ELEVENLABS_KEY)
├── assets/
│   ├── handsemoji.png           # CPR marker image (hands over heart)
│   ├── icon.png                 # App icon
│   └── adaptive-icon.png        # Android adaptive icon
├── src/
│   ├── hooks/
│   │   ├── useConversation.ts   # Main flow: Voice → Camera → Gemini → TTS
│   │   ├── useVoiceInput.ts     # expo-speech-recognition wrapper
│   │   └── useTTS.ts            # TTS hook (ElevenLabs + fallback)
│   ├── services/
│   │   ├── GeminiService.ts     # Gemini 2.0 Flash Exp API
│   │   └── TTSService.ts        # ElevenLabs eleven_flash_v2_5
│   ├── components/
│   │   ├── Marker.tsx           # AR marker (hands image for CPR, star for others)
│   │   ├── SpeechBubble.tsx     # AI instruction display
│   │   ├── VoiceButton.tsx      # Push-to-talk button
│   │   └── ActionButtons.tsx    # Emergency call, report buttons
│   └── types/
│       └── index.ts             # TypeScript types (Message, etc.)
```

---

## Key Code Files

### 1. useConversation.ts (Main Flow)

```typescript
// Location: src/hooks/useConversation.ts
// This orchestrates: Voice → Camera → Gemini → TTS

const processUserInput = useCallback(async (userText: string) => {
  // 1. Capture camera frame
  const photo = await cameraRef.current.takePictureAsync({
    base64: true,
    quality: 0.1,  // Currently 0.1, still produces ~6MB
    skipProcessing: true,
  });

  // 2. Call Gemini API
  const result = await analyzeAndRespond(imageBase64, updatedMessages);

  // 3. Update state with response and marker
  setCurrentInstruction(response);
  setCurrentMarker(marker || null);  // e.g., "chest", "neck"

  // 4. Speak response (non-blocking)
  speak(response).then(() => { /* done */ });
}, [...]);
```

### 2. GeminiService.ts (AI)

```typescript
// Location: src/services/GeminiService.ts
// Uses Gemini 2.0 Flash Exp with vision

const model = genAI?.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    maxOutputTokens: 100,  // Limited for speed
    temperature: 0.7,
  },
});

// System prompt instructs AI to:
// - Ask ONE question at a time
// - Keep responses under 25 words
// - Include [MARKER:chest], [MARKER:neck], etc. for AR
```

### 3. TTSService.ts (Voice Output)

```typescript
// Location: src/services/TTSService.ts
// ElevenLabs with expo-speech fallback

export async function speak(text: string): Promise<void> {
  // 1. Configure audio for speaker output
  await configureAudio();

  // 2. Try ElevenLabs first
  if (ELEVENLABS_API_KEY) {
    const audioUri = await fetchElevenLabsAudio(text);
    await playAudio(audioUri);
  } else {
    // 3. Fallback to system TTS
    await speakWithSystem(text);
  }
}
```

### 4. useVoiceInput.ts (Speech Recognition)

```typescript
// Location: src/hooks/useVoiceInput.ts
// Uses expo-speech-recognition

useSpeechRecognitionEvent('result', (event) => {
  const result = event.results[0]?.transcript || '';
  setTranscript(result);
});

ExpoSpeechRecognitionModule.start({
  lang: 'en-US',
  interimResults: true,
  continuous: false,
});
```

---

## Gemini System Prompt

```
You are an emergency medical assistant guiding a bystander to help an unconscious person.

CRITICAL RULES:
1. Ask ONE question at a time and wait for the response
2. Keep responses under 25 words - be concise and clear
3. Be calm but urgent - lives may depend on your guidance
4. Follow the ABCDE assessment: Airway, Breathing, Circulation, Disability, Exposure

MARKER INSTRUCTIONS:
When you need to show the user WHERE to check or act, include a marker tag:
- [MARKER:neck] - for pulse check at carotid artery
- [MARKER:chest] - for CPR compressions
- [MARKER:chin] - for chin lift to open airway
```

---

## Environment Variables

```bash
# .env file
EXPO_PUBLIC_GEMINI_KEY=AIzaSy...   # Google Gemini API key
EXPO_PUBLIC_ELEVENLABS_KEY=sk_... # ElevenLabs API key
```

---

## Build Commands

```bash
# Development build
npx expo run:android

# Clean rebuild
rm -rf android && npx expo prebuild --platform android && npx expo run:android

# If local.properties missing after prebuild:
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

---

## Latency Reduction Options

### Option 1: Cactus Compute (On-Device AI)
- Run a local LLM on the phone
- Zero network latency
- Could get response in <1 second
- Trade-off: Less capable than Gemini, needs model optimization

### Option 2: Skip Image on Follow-ups
- Only send camera image on first interaction
- Subsequent messages are text-only (Gemini text is ~1-2s vs 6s with image)
- Most follow-up questions don't need new visual context

### Option 3: Gemini Streaming
- Use `generateContentStream()` instead of `generateContent()`
- Start TTS as tokens arrive
- First words could start in ~1-2 seconds

### Option 4: Aggressive Image Compression
- Force resize to 320x240 before encoding
- Could reduce 6MB → ~50KB
- Faster upload, faster processing

### Option 5: Use System TTS
- Replace ElevenLabs with expo-speech
- Saves ~1 second network call
- Trade: Lower voice quality

### Option 6: Pre-compute Common Responses
- Cache frequent responses (e.g., "Begin CPR" audio)
- Play immediately without API call

---

## Conversation Flow Example

```
AI: "I see someone who may need help. Are they responsive?"
USER: "they're not responding"
AI: "Check if they're breathing. Look at their chest for 10 seconds." [MARKER:chest]
USER: "I don't see it rising and falling"
AI: "Feel for a pulse at their neck for 10 seconds." [MARKER:neck]
USER: "no pulse"
AI: "Begin CPR now. Push hard and fast on the center of their chest." [MARKER:chest]
```

---

## Debug Logging

All components have timing logs with emoji prefixes:

```
[DEBUG:VOICE] ⏱️ 🎤 Speech recognition STARTED
[DEBUG:CONV] ⏱️ 📷 Camera capture COMPLETE: 784ms
[DEBUG:GEMINI] ⏱️ 🌐 API call with IMAGE complete: 5874ms
[DEBUG:TTS] ⏱️ 🔊 speak() STARTED
```

Filter logs with:
```bash
# In metro logs
⏱️|processUserInput|Gemini|Camera|TTS|ms
```

---

## Known Issues (Updated 2025-11-29)

1. ~~**Latency:** 6-7 seconds from voice release to AI speaking~~ **FIXED** - Now 2-3s for follow-ups
2. ~~**Image size:** Even at 0.1 quality, produces ~6MB base64~~ **FIXED** - Resize to 320x240 (~50KB)
3. **First permission request:** Takes extra 1.7s on first voice use
4. **AR markers:** Only appear when Gemini includes `[MARKER:x]` in response
5. **Development server:** Phone must stay connected or run `adb reverse tcp:8081 tcp:8081`

## AR Marker Icons (Updated 2025-11-29)

| Marker | Icon | Animation |
|--------|------|-----------|
| chest (CPR) | Hands + Heart image | Pulsing |
| neck (pulse) | ⭐ Star emoji | Pulsing |
| chin (airway) | ⭐ Star emoji | Static |

Asset: `assets/handsemoji.png` - Hands over heart icon for CPR marker

---

## Cactus Compute Research (2025-11-29)

### What is Cactus Compute?
- Y Combinator backed startup (https://github.com/cactus-compute/cactus)
- Open-source framework for on-device AI inference on mobile
- Supports React Native, Flutter, Kotlin, Swift
- Uses GGUF models from HuggingFace
- ARM CPU optimized (70% of phones don't have NPUs)
- npm package: `cactus-react-native`

### Available Models for Our Use Case

| Model | Size | Type | Use Case |
|-------|------|------|----------|
| SmolVLM2-500M | 420MB | Vision | Image analysis (our need) |
| LFM2-VL-450M | 420MB | Vision | Alternative VLM |
| LFM2-VL-1.6B | 1.4GB | Vision | Higher quality, larger |
| Gemma3-270m | 172MB | Text | Lightweight text |
| Qwen3-0.6B | 394MB | Text | Mid-range text |
| OuteTTS-0.2-500m | 500MB | TTS | On-device speech |

### Performance Benchmarks
- iPhone 15 Pro: 99 tokens/second
- Mac M4 Pro: 173 tokens/second
- RAM usage: 31-142MB depending on model
- Vision inference: "single-digit second latencies" for 256x256 images

### Integration Code Example
```typescript
import { CactusVLM } from 'cactus-react-native';

const { vlm, error } = await CactusVLM.init({
  model: '/path/to/smolvlm-500m.gguf',
  mmproj: '/path/to/mmproj.gguf',  // Required for vision
});

const response = await vlm.completion(
  [{ role: 'user', content: 'Describe this image' }],
  { images: ['/path/to/image.jpg'], n_predict: 200 }
);
```

### Critical Issues Found

| Issue | Severity | Impact |
|-------|----------|--------|
| **#143**: iOS build fails on RN 0.81+ (C++17 vs C++20 mismatch) | 🔴 HIGH | We're on RN 0.81.5! |
| **#121**: "Not compatible with a lot of models" | 🟡 MEDIUM | Model selection risk |
| **#122**: "Not resulting any output from input" | 🟡 MEDIUM | Reliability concern |
| **#127**: Flutter multimodal initialization errors | 🟡 MEDIUM | Cross-platform issues |

**iOS Build Fix (not yet merged):**
Change in `cactus-react-native.podspec`:
```diff
- "OTHER_CPLUSPLUSFLAGS" => base_optimizer_flags + " -std=c++17"
+ "OTHER_CPLUSPLUSFLAGS" => base_optimizer_flags + " -std=c++20"
```

### Risk Assessment

**RISKS:**
1. 🔴 iOS build broken on RN 0.81+ (open issue, no official fix)
2. 🔴 500M parameter VLM may not provide quality medical guidance
3. 🟡 Model files are 400MB-1.4GB (need to bundle or download)
4. 🟡 Need both model.gguf AND mmproj.gguf for vision
5. 🟡 36 open issues on GitHub suggests active but unstable

**BENEFITS:**
1. ✅ Zero network latency (critical for emergencies)
2. ✅ Works offline
3. ✅ Privacy (no data sent to cloud)
4. ✅ Impressive for hackathon demo
5. ✅ Official Expo example project exists

### Recommendation: ⚠️ PROCEED WITH CAUTION

**For this hackathon:**
- Current Gemini setup is working at 2-3s latency (acceptable)
- Cactus integration has significant risk (especially iOS)
- Time pressure makes debugging build issues costly

**Suggested approach:**
1. **If Android-only demo is OK**: Try Cactus (iOS issue doesn't affect Android)
2. **If need iOS**: Skip Cactus, focus on other features
3. **Hybrid option**: Keep Gemini as primary, add Cactus as "offline mode"

### Integration Steps (if proceeding)

```bash
# 1. Install
npm install cactus-react-native react-native-fs

# 2. For iOS (requires fix for RN 0.81+)
npx pod-install

# 3. Download model files (~420MB each)
# - SmolVLM2-500m-Instruct.gguf
# - SmolVLM2-500m-mmproj.gguf

# 4. Rebuild
npx expo prebuild --clean
npx expo run:android  # or run:ios
```

---

## Phase 2: Autonomous Emergency Call System (IN PROGRESS)

### Overview
When AI determines CPR is needed (no pulse + no breathing), the system automatically:
1. **Calls emergency services** (911 in production, teammate's phone for demo)
2. **AI speaks to dispatcher** with structured patient report
3. **SMS to family** with alert and location

### The Problem We're Solving
During CPR, bystander faces impossible choice:
- Do CPR (requires both hands, full focus)
- OR call 911 and explain situation (requires phone, speaking)

**Our Solution:** AI becomes "second responder" handling ALL communication while human saves the life.

### User Flow
```
0:00 - Bystander finds collapsed person, opens EmergencyAR
0:15 - AI: "Are they responsive?" → User: "No"
0:30 - AI: "Check breathing" [MARKER:chest] → User: "Not breathing"
0:45 - AI: "Check pulse at neck" [MARKER:neck] → User: "No pulse"
1:00 - AI: "Begin CPR now" [MARKER:chest]
       ├─→ AUTO-DIAL: Calls 911 (teammate for demo)
       ├─→ AI SPEAKS: Delivers patient report to dispatcher
       └─→ SMS SENT: Family notified with location
1:15 - Bystander doing CPR, AI talking to 911
       Bystander doesn't stop CPR to communicate
```

### Patient Report (AI speaks to dispatcher)
```
"Emergency medical alert. I am an AI assistant.
A bystander is performing CPR on an unresponsive patient.

Assessment findings:
- Airway: [clear/blocked]
- Breathing: absent
- Pulse: absent
- Eyes: unresponsive

Patient description: [Brown adult male, appears 20-30 years old]
Location: [GPS coordinates or address]

CPR is in progress. A trained bystander is on scene.
Please dispatch emergency services immediately."
```

### Technical Architecture
```
┌─────────────────────────────────────────────────────────┐
│                 EmergencyAR Mobile App                   │
├─────────────────────────────────────────────────────────┤
│  [Camera] → [Gemini Vision] → Patient Description        │
│  [Voice]  → [Gemini Chat]  → Assessment Q&A              │
│                    ↓                                     │
│  [State Collector] - Tracks: airway, breathing, pulse,   │
│                      responsiveness, patient description │
│                    ↓                                     │
│  [CPR Trigger] - Detects when AI recommends CPR          │
│                    ↓                                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │         POST /api/emergency-call                │    │
│  │         POST /api/family-alert                  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Backend Server (Node.js)                    │
├─────────────────────────────────────────────────────────┤
│  /api/emergency-call                                     │
│    → Twilio Voice API                                    │
│    → Text-to-Speech patient report                       │
│    → Calls configured "911" number                       │
│                                                          │
│  /api/family-alert                                       │
│    → Twilio SMS API                                      │
│    → Sends alert to family contact                       │
└─────────────────────────────────────────────────────────┘
```

### Data to Collect During Assessment

| Field | Source | Example |
|-------|--------|---------|
| airway | AI conversation | "clear" or "blocked" |
| breathing | AI conversation | "present" or "absent" |
| pulse | AI conversation | "present" or "absent" |
| responsive | AI conversation | "yes" or "no" |
| patientDescription | Gemini Vision | "Brown adult male, 20-30 years" |
| location | expo-location | "37.7749, -122.4194" |
| timestamp | System | "2025-11-29T14:30:00Z" |

### Twilio Setup Required

**1. Create Twilio Account**
- Go to: https://www.twilio.com/try-twilio
- Sign up (free trial gives $15 credit)

**2. Get a Twilio Phone Number**
- Console → Phone Numbers → Buy a Number
- Get a US number with Voice + SMS capability (~$1.15/month)

**3. Verify Recipient Numbers (Trial Accounts)**
- Console → Phone Numbers → Verified Caller IDs
- Add teammate's phone (for "911" demo)
- Add family contact phone (for SMS demo)
- Each number receives verification code

**4. Get API Credentials**
- Console → Account Info (right sidebar)
- Copy: Account SID
- Copy: Auth Token

**5. Environment Variables**
```bash
# Add to backend .env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
EMERGENCY_PHONE_NUMBER=+1xxxxxxxxxx  # Teammate's phone
FAMILY_PHONE_NUMBER=+1xxxxxxxxxx     # Family contact
```

### Implementation Checklist

**Backend (Node.js server):**
- [ ] Create Express server with /api/emergency-call endpoint
- [ ] Create /api/family-alert endpoint for SMS
- [ ] Integrate Twilio Voice API for calls
- [ ] Integrate Twilio SMS API for family alerts
- [ ] Deploy to Vercel/Railway/Render (needs public URL)

**Frontend (React Native):**
- [ ] Add PatientStateContext to collect assessment data
- [ ] Parse AI responses for airway/breathing/pulse status
- [ ] Add CPR trigger detection (when AI says "Begin CPR")
- [ ] Get patient description from Gemini Vision
- [ ] Get location from expo-location
- [ ] Call backend APIs when CPR triggered
- [ ] Show "Emergency Services Contacted" confirmation

**Demo Configuration:**
- [ ] Teammate's phone number as "911"
- [ ] Another phone as "family contact"
- [ ] Test end-to-end flow

---

## Phase 3: High-End UI Refinement

### Design Goals
- Apple Health app quality aesthetic
- Smooth animations and transitions
- Professional typography and spacing
- Dark mode optimized for emergency use
- Clear visual hierarchy

### UI Components to Refine
- [ ] Camera view with elegant overlay
- [ ] Pulsing AR markers with glow effects
- [ ] Speech bubble with premium styling
- [ ] Voice button with recording animation
- [ ] Status indicators (processing, calling, etc.)
- [ ] Emergency confirmation modal
- [ ] Patient assessment summary card

---

## API Keys Required

1. **Gemini API Key:** https://makersuite.google.com/app/apikey
2. **ElevenLabs API Key:** https://elevenlabs.io/

---

## Contact / Resources

- Device connected via ADB: `23112154H000112`
- Project path: `/Users/kumar/Documents/Projects/cactushack/cactushack25/emergency-ar`
- Two apps installed: EmergencyAR (v1) and EmergencyAR v2

---

*Last updated: 2025-11-29 - Added Cactus Compute research, updated AR markers, fixed latency issues*
