// Sends mail through Resend (free tier). From address must be on a domain verified in Resend.
export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is missing');
  const from = process.env.BLOG_FROM_EMAIL || 'The 615 Agent Blog <blog@the615agent.com>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Resend returned HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}
