// Signed, expiring action tokens for the approval links. The Cloudflare Worker verifies them (same format) and refuses reuse.
import { createHmac, randomBytes } from 'node:crypto';
const b64 = (b) => Buffer.from(b).toString('base64url');

export function signToken(payload, secret, ttlSeconds = 7 * 24 * 3600) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds, nonce: randomBytes(9).toString('base64url') };
  const p = b64(JSON.stringify(body));
  return `${p}.${createHmac('sha256', secret).update(p).digest('base64url')}`;
}
