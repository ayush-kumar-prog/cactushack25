require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(express.json());

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
const client = twilio(accountSid, authToken);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'EmergencyAR Backend Running', timestamp: new Date().toISOString() });
});

// POST /api/emergency-call
// Makes a voice call to emergency services (teammate for demo)
// Speaks the patient assessment report using TTS
app.post('/api/emergency-call', async (req, res) => {
  console.log('=== EMERGENCY CALL TRIGGERED ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  try {
    const {
      toNumber,           // Phone number to call (teammate's for demo)
      patientData,        // Assessment data
    } = req.body;

    // Build the patient report speech
    const report = buildPatientReport(patientData);
    console.log('Patient report:', report);

    // Create TwiML for the voice message
    // Twilio will speak this when the call connects
    const twiml = `
      <Response>
        <Pause length="1"/>
        <Say voice="Polly.Amy" language="en-GB">
          ${report}
        </Say>
        <Pause length="2"/>
        <Say voice="Polly.Amy" language="en-GB">
          I repeat. ${report}
        </Say>
        <Pause length="1"/>
        <Say voice="Polly.Amy" language="en-GB">
          This is an automated emergency alert. A bystander is performing CPR. Please dispatch emergency services immediately.
        </Say>
      </Response>
    `;

    // Make the call
    const call = await client.calls.create({
      twiml: twiml,
      to: toNumber || process.env.EMERGENCY_PHONE_NUMBER,
      from: twilioPhoneNumber,
    });

    console.log('Call initiated:', call.sid);

    res.json({
      success: true,
      callSid: call.sid,
      message: 'Emergency call initiated',
      report: report,
    });

  } catch (error) {
    console.error('Emergency call error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/family-alert
// Sends SMS to family member with emergency alert
app.post('/api/family-alert', async (req, res) => {
  console.log('=== FAMILY ALERT TRIGGERED ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  try {
    const {
      toNumber,           // Family member's phone number
      patientData,        // Assessment data
      location,           // GPS coordinates or address
    } = req.body;

    // Build the SMS message
    const message = buildFamilySMS(patientData, location);
    console.log('SMS message:', message);

    // Send the SMS
    const sms = await client.messages.create({
      body: message,
      to: toNumber || process.env.FAMILY_PHONE_NUMBER,
      from: twilioPhoneNumber,
    });

    console.log('SMS sent:', sms.sid);

    res.json({
      success: true,
      messageSid: sms.sid,
      message: 'Family alert sent',
    });

  } catch (error) {
    console.error('Family alert error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// XML escape helper for TwiML
function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Build patient report for voice call
function buildPatientReport(data) {
  const {
    airway = 'unknown',
    breathing = 'unknown',
    pulse = 'unknown',
    responsive = 'unknown',
    patientDescription = 'Patient details unavailable',
    location = 'Location unknown',
  } = data || {};

  // Escape all values for XML safety
  const report = `
    Emergency medical alert. This is an AI assistant from Emergency A R.
    A bystander has found an unresponsive person and is initiating CPR.

    Patient assessment:
    Airway: ${escapeXml(airway)}.
    Breathing: ${escapeXml(breathing)}.
    Pulse: ${escapeXml(pulse)}.
    Responsiveness: ${escapeXml(responsive)}.

    Patient description: ${escapeXml(patientDescription)}.

    Location: ${escapeXml(location)}.

    CPR is in progress. Please dispatch emergency medical services immediately.
  `.replace(/\s+/g, ' ').trim();

  return report;
}

// Build SMS message for family alert
function buildFamilySMS(data, location) {
  const {
    patientDescription = 'A person',
  } = data || {};

  return `EMERGENCY ALERT from EmergencyAR:

A bystander is providing emergency assistance to ${patientDescription}.

Location: ${location || 'Location being determined'}

Emergency services have been contacted. CPR is in progress.

This is an automated alert. Please stay calm and await further updates.`;
}

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`EmergencyAR Backend running on port ${PORT}`);
  console.log(`Twilio configured: ${accountSid ? 'Yes' : 'No'}`);
  console.log(`Twilio phone: ${twilioPhoneNumber}`);
});
