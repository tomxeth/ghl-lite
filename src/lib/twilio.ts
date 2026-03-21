import twilio from "twilio";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
  }
  return twilio(sid, token);
}

export async function sendSms(to: string, body: string) {
  const client = getClient();
  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
    statusCallback: `${process.env.APP_BASE_URL}/api/sms/webhook`,
  });
  return message.sid;
}

export async function initiateCall(to: string) {
  const client = getClient();
  const call = await client.calls.create({
    url: `${process.env.APP_BASE_URL}/api/calls/twiml`,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to,
    statusCallback: `${process.env.APP_BASE_URL}/api/calls/webhook`,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
  });
  return call.sid;
}
