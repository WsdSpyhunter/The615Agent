// Stock photos for posts. Pixabay is the default (free key, photos may be downloaded and used commercially, credit is optional but we give it).
// Pexels still works if a PEXELS_API_KEY is set. Each photo carries alt text, photographer credit and where it came from.
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const fromPixabay = (h) => ({
  provider: 'Pixabay', id: h.id, url: h.largeImageURL, width: h.imageWidth, height: h.imageHeight,
  alt: `Photo: ${cap((h.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5).join(', '))}`,
  credit: h.user, creditUrl: `https://pixabay.com/users/${encodeURIComponent(h.user)}-${h.user_id}/`, page: h.pageURL, home: 'https://pixabay.com',
});
const fromPexels = (p) => ({
  provider: 'Pexels', id: p.id, url: p.src.large2x || p.src.large, width: p.width, height: p.height, alt: (p.alt || '').trim(),
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

/** Returns { hero, inline: [..], choices: [..] }. Never repeats a photo. */
export async function choosePhotos(queries, env = process.env, log = console.log) {
  const search = env.PIXABAY_API_KEY ? (q) => pixabay(q, env.PIXABAY_API_KEY) : env.PEXELS_API_KEY ? (q) => pexels(q, env.PEXELS_API_KEY) : null;
  if (!search) { log('No PIXABAY_API_KEY or PEXELS_API_KEY, skipping photos.'); return { hero: null, inline: [], choices: [] }; }
  const used = new Set(), picks = [], choices = [];
  for (const q of queries.slice(0, 3)) {
    try {
      const list = await search(q);
      const first = list.find((p) => !used.has(p.id));
      if (first) { used.add(first.id); picks.push(first); }
      for (const p of list.slice(0, 4)) if (!choices.some((c) => c.id === p.id)) choices.push(p);
    } catch (e) { log(`Photo search failed for "${q}": ${e.message}`); }
  }
  return { hero: picks[0] ?? null, inline: picks.slice(1), choices };
}
