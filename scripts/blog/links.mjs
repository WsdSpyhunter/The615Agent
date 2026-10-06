// Turns {{link:ID|anchor}} tokens into real markdown links. Outbound links must answer HTTP 200 right now, or they are dropped
// (the anchor text stays). The model never writes a URL, and an unknown ID never becomes a link.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export async function checkUrl(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,*/*' }, signal: AbortSignal.timeout(20000) });
    res.body?.cancel?.();
    return res.status;
  } catch { return 0; }
}

/** Models sometimes wrap a token in markdown link syntax, which would produce [text]([text](url)). Unwrap those first. */
export const unwrapTokens = (body) => body
  .replace(/\[[^\]]*\]\(\s*(\{\{link:[a-z0-9-]+\|[^}]+\}\})\s*\)/g, '$1')
  .replace(/\[(\{\{link:[a-z0-9-]+\|[^}]+\}\})\]/g, '$1');

export async function resolveLinks(body, ctx) {
  body = unwrapTokens(body);
  const out = new Map(ctx.outbound.map((l) => [l.id, l])), inn = new Map(ctx.inbound.map((l) => [l.id, l]));
  const checked = [], dropped = [];
  const cache = new Map();
  const tokens = [...body.matchAll(/\{\{link:([a-z0-9-]+)\|([^}]+)\}\}/g)];
  const status = new Map();
  for (const t of tokens) {
    const l = out.get(t[1]);
    if (l && !status.has(l.url)) { status.set(l.url, await checkUrl(l.url)); checked.push({ id: l.id, url: l.url, status: status.get(l.url) }); }
  }
  const seenOut = new Set(), seenIn = new Set();
  const md = body.replace(/\{\{link:([a-z0-9-]+)\|([^}]+)\}\}/g, (all, id, text) => {
    const o = out.get(id), i = inn.get(id);
    if (o) {
      if (status.get(o.url) !== 200) { dropped.push({ id, url: o.url, status: status.get(o.url) }); return text; }
      if (seenOut.has(id)) return text; seenOut.add(id);
      return `[${text}](${o.url})`;
    }
    if (i) { if (seenIn.has(id)) return text; seenIn.add(id); return `[${text}](${i.url})`; }
    return text;
  });
  return { markdown: md, checked, dropped, outboundKept: seenOut.size, internalKept: seenIn.size };
}
