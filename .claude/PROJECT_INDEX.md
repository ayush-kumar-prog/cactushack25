# Emergency Medical AR Guidance App - Project Index

## Hackathon Context

**Event:** Mobile AI Hackathon: Cactus X Nothing X Hugging Face
**Duration:** 24 hours (November 28-29, 2025, 5 PM to 5 PM GMT)
**Location:** London (in-person) or globally online
**Team Size:** 1-3 members

### Competition Tracks
1. **Main Track:** Best Mobile Application with On-Device AI
2. **Memory Master:** Best shared memory/knowledge base implementation
3. **Hybrid Hero:** Best local-to-cloud hybrid inference strategy

### Prize Structure
- Winner: Sponsored SF trip + lunch with YC partner
- Top 3: Guaranteed job interviews at Cactus and Nothing
- Top 5: Roundtable dinner with company leaders
- Other: Nothing Phone, Hugging Face Reachy Mini Robot

### Core Pillars (Judging Criteria)
1. **Total Privacy** - Data never leaves the device
2. **Zero Latency** - Real-time interactions
3. **Offline Capability** - Works without internet

### Submission Requirements
- Must use the Cactus SDK
- Demonstrate functional local AI features
- Ship a usable .apk/.ipa or TestFlight link

---

## Target Device

**Device:** Nothing Phone 3
**OS:** Nothing OS 4.0 (Android 16 based)
**Chipset:** Qualcomm Snapdragon 8s Gen 4 (4nm)
**RAM:** 12GB or 16GB
**Storage:** UFS 4.0 (256GB/512GB)
**Display:** 6.67" OLED, 120Hz, 2800x1260
**Camera:** Triple 50MP (main + ultrawide + 3x telephoto), 50MP front
**Battery:** 5150mAh with 65W charging
**Special:** Glyph Matrix LED notification system

### Expected AI Performance (Based on Cactus Benchmarks)
- Similar Snapdragon chips achieve ~42-43 tok/sec for Gemma3 1B Q4
- ~14 tok/sec for Qwen3 4B Q4
- Should handle real-time inference well

---

## Required Technology Stack

### Mandatory
- **Cactus SDK** (React Native) - `npm install cactus-react-native`
- **React Native** (not Flutter or Kotlin)

### Cactus SDK v1 Features
| Feature | Status |
|---------|--------|
| LLM Inference | Available |
| Tool Calling | Available |
| Embeddings | Available |
| Voice Transcription (Whisper) | Available |
| Voice Synthesis (TTS) | Coming Soon |
| Image/Vision | Coming Soon (v1), Available (v0) |
| RAG | Coming Soon |

### Available Cactus Models (INT8)
**Text:**
- Qwen3-0.6B, Qwen3-1.7B, Qwen3-4B
- Gemma3-1B, Gemma3-4B
- SmolLM2-135M, SmolLM2-360M
- LFM2-1.2B

**Vision:**
- LFM2-VL-450M (smallest, recommended for mobile)
- LFM2-VL-1.6B

**Speech:**
- Whisper Small (~244MB)
- Whisper Medium (~769MB)

---

## Architecture Decision: Hybrid Approach

Since demo functionality is priority over pure on-device operation:

### Option A: Gemini Live API (Recommended for Demo)
**Pros:**
- Real-time bidirectional audio/video streaming
- Native multimodal understanding (voice + vision simultaneously)
- Can "see" camera and "speak" responses
- Function calling for agentic actions
- Low latency (~50ms TTFT)

**Implementation:**
- Use WebSocket connection to Gemini Live API
- Stream camera frames at 1 FPS (768x768 optimal)
- Stream audio at 16kHz PCM mono
- Receive audio responses at 24kHz PCM

**React Native Integration:**
- Community implementation: github.com/pathakmukul/Gemini-LIVE-API-Bidirectional-Audio-in-React-Native
- Uses expo-av for audio playback
- WebSocket for real-time communication

### Option B: MedGemma (Medical Specialist)
**MedGemma 4B Multimodal:**
- Trained on medical images (X-rays, dermatology, etc.)
- 64.4% on MedQA benchmark
- 81% radiologist approval on chest X-ray reports
- Available on Hugging Face: google/medgemma-4b-it

**Limitation:** Not designed for real-time voice interaction

### Option C: Cactus On-Device + Cloud Hybrid
- Use Cactus for on-device speech transcription (Whisper)
- Use Cactus for local text inference (emergency protocol knowledge)
- Use cloud API for complex vision analysis
- Use react-native-tts for speech synthesis

---

## AR Overlay Technology

### ViroReact / ReactVision (Recommended)
- Most mature AR framework for React Native
- Supports ARKit (iOS) and ARCore (Android)
- Expo plugin available: @reactvision/react-viro
- Can render 3D objects, animations, overlays on camera
- Maintained by Morrow (acquired 2025)

**Capabilities:**
- Surface detection (floor, walls)
- Object placement in AR space
- Animation support
- Camera passthrough with overlays

**Docs:** https://viro-community.readme.io/docs/overview
**GitHub:** https://github.com/ReactVision/viro

### Alternative: Simple Camera Overlay
If full AR is too complex:
- Use react-native-vision-camera for camera
- Overlay React Native views on top
- Position markers based on screen coordinates
- Simpler but less immersive

---

## Camera Frame Processing

### react-native-vision-camera
- High-performance camera with Frame Processors
- JSI integration for near-native speed
- Can process frames at 30-60 FPS
- Required for sending video to Gemini Live

**Key Features:**
- Frame Processors (JS worklets)
- Skia integration for drawing on frames
- Native plugin system for heavy processing
- Direct GPU buffer access via JSI

**Installation:**
```bash
npm install react-native-vision-camera
npm install react-native-worklets-core
```

---

## Emergency Services Integration (Demo)

**Approach:** Simulate with dedicated phone number

**Implementation Options:**
1. **Twilio API** - Send SMS with patient details
2. **Direct Phone Call** - Use react-native-phone-call
3. **WhatsApp API** - Send structured message
4. **Custom Backend** - POST to webhook that logs/displays

**Patient Context to Send:**
```json
{
  "estimated_age": "mid-20s",
  "gender": "male",
  "ethnicity": "white",
  "symptoms": {
    "pupils_responsive": false,
    "breathing": true,
    "throat_blockage": false,
    "conscious": false
  },
  "assessment": "suspected cardiac arrest",
  "location": {
    "lat": 51.5074,
    "lng": -0.1278,
    "address": "123 Example St, London"
  },
  "timestamp": "2025-11-28T17:30:00Z"
}
```

---

## Key Dependencies

```json
{
  "dependencies": {
    "cactus-react-native": "latest",
    "react-native-nitro-modules": "latest",
    "@reactvision/react-viro": "latest",
    "react-native-vision-camera": "latest",
    "react-native-worklets-core": "latest",
    "expo-av": "latest",
    "react-native-tts": "latest",
    "@react-native-voice/voice": "latest",
    "react-native-permissions": "latest",
    "react-native-geolocation-service": "latest"
  }
}
```

---

## Reference Links

### Official Documentation
- Cactus Docs: https://cactuscompute.com/docs
- Cactus React Native: https://cactuscompute.com/docs/react-native
- Gemini Live API: https://ai.google.dev/gemini-api/docs/live
- MedGemma: https://developers.google.com/health-ai-developer-foundations/medgemma
- ViroReact: https://viro-community.readme.io/docs/overview
- Vision Camera: https://react-native-vision-camera.com/docs/guides/frame-processors

### GitHub Repositories
- Cactus Core: https://github.com/cactus-compute/cactus
- Cactus React Native: https://github.com/cactus-compute/cactus-react-native
- ViroReact: https://github.com/ReactVision/viro
- Vision Camera: https://github.com/mrousavy/react-native-vision-camera
- Gemini Live RN: https://github.com/pathakmukul/Gemini-LIVE-API-Bidirectional-Audio-in-React-Native
- Gemini Live Console: https://github.com/google-gemini/live-api-web-console

### Hackathon Resources
- Event Page: https://luma.com/jrec73nt
- Nothing Phone 3 Specs: https://www.gsmarena.com/nothing_phone_(3)_5g-13969.php

---

## Model Selection Recommendations

For real-time performance on Nothing Phone 3:

| Use Case | Model | Size | Expected Speed |
|----------|-------|------|----------------|
| Text Reasoning | Qwen3-0.6B INT8 | ~400MB | 40+ tok/sec |
| Vision Analysis | LFM2-VL-450M | ~450MB | TBD |
| Speech-to-Text | Whisper Small | ~244MB | Real-time |
| Text-to-Speech | System TTS or Cactus (when available) | N/A | Real-time |

**Alternative (Cloud):**
- Gemini 2.0 Flash Live for unified voice+vision
- MedGemma 4B for medical-specific analysis
