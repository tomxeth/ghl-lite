export async function POST(request: Request) {
  const formData = await request.formData();
  const to = formData.get("To") as string | null;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER}">
    <Number>${to || ""}</Number>
  </Dial>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
