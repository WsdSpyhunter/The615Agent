const API = 'https://api.anthropic.com/v1/messages';
export const MODEL = process.env.BLOG_MODEL || 'claude-sonnet-5-5';

export async function ask({ system, user, maxTokens = 8000 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is missing');
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API returned HTTP ${res.status}: ${(await res.text()).slice(0, 300).replace(/sk-ant-[A-Za-z0-9_-]+/g, '[hidden]')}`);
  const j = await res.json();
  return (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

export function parseJson(text) {
  const t = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = t.indexOf('{'), end = t.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('No JSON found in the model answer');
  return JSON.parse(t.slice(start, end + 1));
}
