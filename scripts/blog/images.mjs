import { ask, parseJson } from './claude.mjs';
// Stock photos for posts. Pixabay is the default (free key, photos may be downloaded and used commercially, credit is optional but we give it).
// Pexels still works if a PEXELS_API_KEY is set. Each photo carries alt text, photographer credit and where it came from.
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const fromPixabay = (h) => ({
  provider: 'Pixabay', id: h.id, url: h.largeImageURL, preview: h.webformatURL, width: h.imageWidth, height: h.imageHeight,
  alt: `Photo: ${cap((h.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5).join(', '))}`,
  credit: h.user, creditUrl: `https://pixabay.com/users/${encodeURIComponent(h.user)}-${h.user_id}/`, page: h.pageURL, home: 'https://pixabay.com',
});
const fromPexels = (p) => ({
  provider: 'Pexels', id: p.id, url: p.src.large2x || p.src.large, preview: p.src.medium, width: p.width, height: p.height, alt: (p.alt || '').trim(),
  credit: p.photographer, creditUrl: p.photographer_url, page: p.url, home: 'https://www.pexels.com',
});

async function pixabay(query, key, n = 12) {
  const res = await fetch(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query.slice(0, 90))}&image_type=photo&orientation=horizontal&safesearch=true&min_width=1280&per_page=${n}`);
  if (!res.ok) throw new Error(`Pixabay returned HTTP ${res.status}`);
  const j = await res.json();
  return (j.hits || []).filter((h) => h.largeImageURL && h.imageWidth >= 1280 && h.imageHeight >= 700).map(fromPixabay);
}
async function pexels(query, key, n = 8) {
  const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=${n}`, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels returned HTTP ${res.status}`);
  const j = await res.json();
  return (j.photos || []).filter((p) => p.width >= 1600 && p.height >= 900 && p.alt).map(fromPexels);
}

/** Asks Claude to look at the photo. A stock-photo search happily returns animals or unrelated scenes, so every pick is checked. */
async function looksRight(img, ctx, log) {
  if (!process.env.ANTHROPIC_API_KEY || !img.preview) return true;
  try {
    const res = await fetch(img.preview);
    if (!res.ok) return false;
    const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
    const data = Buffer.from(await res.arrayBuffer()).toString('base64');
    const answer = parseJson(await ask({
      system: 'You vet stock photos for a real estate agent\'s blog in Tennessee. Return ONLY JSON, with a reason of at most 12 words: {"ok": boolean, "reason": string}. ok is true only if the photo is professional, sharp, and clearly relevant to the post topic (for example a house, home exterior or interior, neighborhood, yard, land, a property detail, keys, paperwork or tools that fit the topic). ok is false for animals, unrelated subjects, close-ups of identifiable people, visible text or logos, watermarks, children, anything dark, blurry, odd or unprofessional, or anything that could suggest who should or should not live somewhere.',
      user: [{ type: 'image', source: { type: 'base64', media_type: type, data } }, { type: 'text', text: `Post title: ${ctx.title || ''}\nTopic keyword: ${ctx.keyword || ''}\nCategory: ${ctx.category || ''}\nIs this photo a good fit?` }],
      maxTokens: 500,
    }));
    if (!answer.ok) log(`  photo ${img.id} rejected: ${String(answer.reason).slice(0, 100)}`);
    return !!answer.ok;
  } catch (e) { log(`  photo check failed (${e.message}); skipping that photo`); return false; }
}

const FALLBACK = ['home exterior', 'house front yard', 'suburban neighborhood street'];

/** Returns { hero, inline: [..], choices: [..] }. Never repeats a photo; every pick is checked by Claude against the post topic. */
export async function choosePhotos(queries, env = process.env, log = console.log, ctx = {}) {
  const search = env.PIXABAY_API_KEY ? (q) => pixabay(q, env.PIXABAY_API_KEY) : env.PEXELS_API_KEY ? (q) => pexels(q, env.PEXELS_API_KEY) : null;
  if (!search) { log('No PIXABAY_API_KEY or PEXELS_API_KEY, skipping photos.'); return { hero: null, inline: [], choices: [] }; }
  const used = new Set(), picks = [], choices = [];
  const tryQuery = async (q) => {
    try {
      const list = await search(q);
      for (const p of list.slice(0, 8)) {
        if (used.has(p.id)) continue;
        if (await looksRight(p, ctx, log)) { used.add(p.id); picks.push(p); choices.push(p); return true; }
      }
    } catch (e) { log(`Photo search failed for "${q}": ${e.message}`); }
    return false;
  };
  for (const q of queries.slice(0, 3)) await tryQuery(q);
  for (const q of FALLBACK) { if (picks.length >= 3) break; await tryQuery(q); }
  return { hero: picks[0] ?? null, inline: picks.slice(1, 3), choices };
}
