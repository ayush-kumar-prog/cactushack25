# PULSE: The First Responder in Your Pocket
**Mobile AI Hackathon Master Plan**

> **Manifesto:** In an emergency, panic is the enemy. Pulse is an offline, on-device AI agent that provides "The Golden Hour" expertise before the ambulance arrives. It sees what you see, guides your hands, and silently coordinates help.

## 1. Core Constraints & Platform
*   **Device:** Nothing Phone (3).
*   **OS:** Nothing OS 4.0 (Android 16 base).
*   **Framework:** React Native
*   **Engine:** **Cactus Compute Framework** (On-Device Inference).
*   **Input:** **Zero Text Entry**. 100% Voice & Vision.
*   **Connectivity:** **Offline First**. (Emergency simulated via mock API).

---

## 2. The User Journey (The "Happy Path")

### Phase 1: The Panic Launch (0s - 5s)
*   **Action:** User opens "Pulse".
*   **State:** Instant Camera feed. No splash screen.
*   **AI Vision:** The app performs a "Scene Triage". It detects a human form in a prone position.
*   **AI Voice:** "I see a person on the ground. Are they responsive? Shout their name."
*   **UI:** Large, high-contrast subtitles (NDot Font) overlaying the video.

### Phase 2: Rapid Context Gathering (5s - 30s)
*   **Action:** User shouts. "No response!"
*   **AI Memory:** Updates `IncidentContext` -> `{ consciousness: "UNRESPONSIVE" }`.
*   **AI Voice:** "Okay. Look at their chest. Is it moving? Listen for breathing."
*   **Action:** User brings phone close. The AI analyzes audio/video for breath sounds/movement.
*   **User:** "I don't think so. He's not breathing."
*   **AI Memory:** Updates `IncidentContext` -> `{ breathing: "NONE", urgency: "CRITICAL" }`.

### Phase 3: The "Silent Sub-Agent" (Background)
*   *While the user is interacting...*
*   **Sub-Agent:** Monitors the `IncidentContext`.
*   **Logic:** Detects `UNRESPONSIVE` + `NO_BREATHING` = **Cardiac Arrest**.
*   **Action:** Triggers `Tool: CallEmergencyServices`.
*   **Output:** A red banner slides down: **"🚑 EMERGENCY SERVICES ALERTED - LOC: [GPS]"**. The user does *not* need to stop to dial.

### Phase 4: Hands-Free Guidance (30s - Arrival)
*   **Transition:** App enters **CPR Mode**.
*   **UI:** The screen becomes a high-visibility Metronome.
*   **AR:** "Ghost Hands" overlay on the chest to show position.
*   **Voice:** "Place phone on the floor. Interlock fingers. Push to the beat. 1, 2, 3, 4..."
*   **Feedback:** If the user stops, the AI (listening) shouts: "Don't stop! Keep pushing!"

---

## 3. Architecture: The "Context Engine"

We will build a reactive architecture where the AI is not just a chatbot, but a **State Manager**.

### The Context Object (The Memory)
This JSON object lives in the device RAM and is updated by every Voice or Vision event.

```typescript
type IncidentContext = {
  status: "SCANNING" | "ASSESSMENT" | "CPR_IN_PROGRESS" | "STABLE";
  patient: {
    demographics: string | null; // e.g., "Adult Male" (from Vision)
    consciousness: "ALERT" | "VOICE" | "PAIN" | "UNRESPONSIVE" | null;
    breathing: boolean | null;
    pulse: boolean | null;
  };
  environment: {
    gps: { lat: number, long: number };
    hazards_detected: boolean; // e.g., "Fire" or "Traffic" (from Vision)
  };
  timeline: {
    incident_start: number; // Timestamp
    cpr_start: number | null;
    last_compression: number | null;
  }
}
```

### The Cactus Pipeline (Edge Compute)
We optimize for the MediaTek chip by splitting tasks.

1.  **Vision Scout (Cactus Vision Kernel):**
    *   Runs @ 5Hz (5 times/sec).
    *   Task: Object Detection (Person, Face).
    *   Output: Bounding Boxes + "Movement Score" (for breathing detection).

2.  **The Brain (MedGemma / Gemma3 Quantized):**
    *   Runs @ Event Trigger.
    *   Task: Decision Making & Context Updates.
    *   Input: `User Transcript` + `Visual Description` + `Current Context`.
    *   Output: `Next Question` OR `Tool Call`.

3.  **The Ears (Cactus Whisper):**
    *   Runs @ Constant.
    *   Task: Streaming ASR (Speech-to-Text).
    *   Keyword Spotting: "Help", "Yes", "No", "Stop".

---

## 4. Design System: "Nothing Native"

The app must feel like part of the phone's OS.

*   **Typography:**
    *   **Headlines:** `NDot 57` (The dotted font). Used for Vitals and Alerts.
    *   **Subtitles:** `Roboto Mono` or `Geist`. High readability.
*   **Visuals:**
    *   **Monochrome Base:** Black background (video), White text.
    *   **Functional Red:** Used *only* for critical alerts (Cardiac Arrest, Bleeding).
    *   **UI Elements:** Dotted lines, "brackets" around detected objects `[ target ]`.
*   **Glyph Interface (Hardware):**
    *   **Thinking:** Gentle pulse on the central ring.
    *   **CPR:** Hard strobe on all LEDs at 100 BPM.

---

## 5. Development Roadmap (The Hackathon Sprint)

### Phase 1: The "Sensory System" (Foundation)
*   **Goal:** App opens to camera, displays location, listens to voice.
*   **Tech:** `expo-location`, `react-native-vision-camera`, `cactus-whisper`.
*   **Deliverable:** Screen showing video feed + live subtitles of what you say.

### Phase 2: The "Context Brain" (Logic)
*   **Goal:** AI understands "No breathing" means danger.
*   **Tech:** `CactusAgent` with the `IncidentContext` state machine.
*   **Deliverable:** User says "He's not breathing", App auto-switches UI to "EMERGENCY MODE".

### Phase 3: The "Sub-Agent" (Tools)
*   **Goal:** Simulated 999 call.
*   **Tech:** Cactus Tool Calling (MCP).
*   **Deliverable:** A background process triggers a notification "Emergency Services Alerted" without interrupting the flow.

### Phase 4: The "Guardian" (AR & Polish)
*   **Goal:** Visual guidance.
*   **Tech:** `react-native-skia` for overlays + Nothing Glyph integration.
*   **Deliverable:** CPR Metronome with flash + Ghost Hands overlay.

---

## 6. Prompt Engineering Strategy (System Prompt)

The `CactusAgent` needs a very specific persona to work fast on a phone.

> "You are PULSE, an automated incident commander. You are succinct, authoritative, and calm. You do not chat. You extract facts.
> 1.  Identify the emergency.
> 2.  Update the Context Object.
> 3.  If Life Threat is detected, command the user to act.
> 4.  Keep outputs under 15 words for fast TTS."

---

### Implementation Note for Agents
*   **Do not use** complex navigation stacks. The app is mostly a single screen that changes *State*.
*   **Do use** `react-native-reanimated` for smooth UI transitions between states (Scanning -> CPR).
*   **Focus on Audio Latency:** The user needs to hear the AI *immediately*.

Here are the links for the Pulse project so far:

**Hackathon & Framework Documentation:**
*   [Mobile AI Hackathon Details (Notion)](https://www.notion.so/Mobile-AI-Hackathon-Cactus-X-Nothing-X-Hugging-Face-2a092928b9d080a2ab5ff1efbcc8b84d)
*   [Cactus Hackathon Quickstart (Notion)](https://www.notion.so/Cactus-Hackathon-Quickstart-2afd8e920c9780379d62ef0cc0d11e30)
*   [Cactus React MCP Server / Docs](https://gitmcp.io/cactus-compute/cactus-react)

**Model Weights:**
*   [Google MedGemma 4B IT (Hugging Face)](https://huggingface.co/google/medgemma-4b-it)