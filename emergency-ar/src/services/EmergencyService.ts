// EmergencyService.ts
// Handles autonomous emergency calls and family alerts via backend API

const DEBUG_PREFIX = '[DEBUG:EMERGENCY]';

// Backend URL - for local development use your computer's IP
// For production, deploy to Vercel/Railway and use that URL
const BACKEND_URL = __DEV__
  ? 'http://10.3.27.182:3001'  // Local development server
  : 'https://your-backend.vercel.app';

export interface PatientAssessment {
  responsive: 'yes' | 'no' | 'unknown';
  airway: 'clear' | 'blocked' | 'unknown';
  breathing: 'present' | 'absent' | 'unknown';
  pulse: 'present' | 'absent' | 'unknown';
  patientDescription: string;
  location: string;
  timestamp: string;
}

export interface EmergencyCallResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

export interface FamilyAlertResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

// Trigger emergency call to 911 (teammate for demo)
export async function triggerEmergencyCall(
  assessment: PatientAssessment,
  emergencyNumber?: string
): Promise<EmergencyCallResult> {
  console.log(`${DEBUG_PREFIX} 🚨 TRIGGERING EMERGENCY CALL`);
  console.log(`${DEBUG_PREFIX} Assessment:`, JSON.stringify(assessment, null, 2));

  try {
    const response = await fetch(`${BACKEND_URL}/api/emergency-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toNumber: emergencyNumber,
        patientData: assessment,
      }),
    });

    const result = await response.json();
    console.log(`${DEBUG_PREFIX} Emergency call result:`, result);

    return {
      success: result.success,
      callSid: result.callSid,
      error: result.error,
    };
  } catch (error) {
    console.error(`${DEBUG_PREFIX} ❌ Emergency call failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Send SMS alert to family member
export async function sendFamilyAlert(
  assessment: PatientAssessment,
  familyNumber?: string
): Promise<FamilyAlertResult> {
  console.log(`${DEBUG_PREFIX} 📱 SENDING FAMILY ALERT`);

  try {
    const response = await fetch(`${BACKEND_URL}/api/family-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toNumber: familyNumber,
        patientData: assessment,
        location: assessment.location,
      }),
    });

    const result = await response.json();
    console.log(`${DEBUG_PREFIX} Family alert result:`, result);

    return {
      success: result.success,
      messageSid: result.messageSid,
      error: result.error,
    };
  } catch (error) {
    console.error(`${DEBUG_PREFIX} ❌ Family alert failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Parse AI response to extract assessment status
export function parseAssessmentFromResponse(
  response: string,
  currentAssessment: PatientAssessment
): Partial<PatientAssessment> {
  const updates: Partial<PatientAssessment> = {};
  const lowerResponse = response.toLowerCase();

  // Detect breathing status from AI questions/statements
  if (lowerResponse.includes('not breathing') || lowerResponse.includes('no breathing')) {
    updates.breathing = 'absent';
  } else if (lowerResponse.includes('breathing') && !lowerResponse.includes('check')) {
    updates.breathing = 'present';
  }

  // Detect pulse status
  if (lowerResponse.includes('no pulse') || lowerResponse.includes('pulse absent')) {
    updates.pulse = 'absent';
  } else if (lowerResponse.includes('pulse') && lowerResponse.includes('found')) {
    updates.pulse = 'present';
  }

  // Detect responsiveness
  if (lowerResponse.includes('not responsive') || lowerResponse.includes('unresponsive')) {
    updates.responsive = 'no';
  }

  // Detect airway
  if (lowerResponse.includes('airway blocked') || lowerResponse.includes('obstruction')) {
    updates.airway = 'blocked';
  } else if (lowerResponse.includes('airway clear') || lowerResponse.includes('airway is clear')) {
    updates.airway = 'clear';
  }

  return updates;
}

// Parse user response to extract assessment info
export function parseUserResponseForAssessment(
  userText: string,
  currentAssessment: PatientAssessment
): Partial<PatientAssessment> {
  const updates: Partial<PatientAssessment> = {};
  const lower = userText.toLowerCase();

  // Breathing
  if (lower.includes('not breathing') || lower.includes('no breathing') ||
      lower.includes("isn't breathing") || lower.includes("don't see") && lower.includes('chest')) {
    updates.breathing = 'absent';
  } else if (lower.includes('breathing') && !lower.includes('not') && !lower.includes('no')) {
    updates.breathing = 'present';
  }

  // Pulse
  if (lower.includes('no pulse') || lower.includes("can't feel") ||
      lower.includes("don't feel") || lower.includes('nothing')) {
    updates.pulse = 'absent';
  } else if (lower.includes('pulse') && !lower.includes('no')) {
    updates.pulse = 'present';
  }

  // Responsiveness
  if (lower.includes('not responding') || lower.includes('no response') ||
      lower.includes("won't respond") || lower.includes('unconscious')) {
    updates.responsive = 'no';
  } else if (lower.includes('responding') || lower.includes('conscious')) {
    updates.responsive = 'yes';
  }

  return updates;
}

// Detect if CPR should be triggered
export function shouldTriggerCPR(
  aiResponse: string,
  assessment: PatientAssessment
): boolean {
  const lower = aiResponse.toLowerCase();

  // Direct CPR instruction from AI
  if (lower.includes('begin cpr') || lower.includes('start cpr') ||
      lower.includes('perform cpr') || lower.includes('cpr now')) {
    return true;
  }

  // Or if we know there's no pulse and no breathing
  if (assessment.pulse === 'absent' && assessment.breathing === 'absent') {
    return true;
  }

  return false;
}

// Create initial empty assessment
export function createInitialAssessment(): PatientAssessment {
  return {
    responsive: 'unknown',
    airway: 'unknown',
    breathing: 'unknown',
    pulse: 'unknown',
    patientDescription: '',
    location: '',
    timestamp: new Date().toISOString(),
  };
}
