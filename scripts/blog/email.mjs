// Sends mail. Brevo is the default (the account you already use; send-only API key). Resend works too if RESEND_API_KEY is set.
// The From address must be a sender or domain you have verified with the provider.
const FROM_NAME = process.env.BLOG_FROM_NAME || 'The 615 Agent Blog';
const FROM_ADDR = process.env.BLOG_FROM_ADDRESS || 'blog@the615agent.com';

export const emailConfigured = () => !!(process.env.BREVO_API_KEY || process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
  if (process.env.BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: FROM_NAME, email: FROM_ADDR }, to: [{ email: to }], replyTo: { email: to }, subject, htmlContent: html }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Brevo returned HTTP ${res.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text);
  }
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${FROM_NAME} <${FROM_ADDR}>`, to: [to], subject, html }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Resend returned HTTP ${res.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text);
  }
  throw new Error('No email key: set BREVO_API_KEY (or RESEND_API_KEY).');
}
