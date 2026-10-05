// Pexels photos (free API key). Photos are chosen by search phrase; Pexels' own alt text and photographer credit travel with each one.
const pick = (p) => ({
  id: p.id, url: p.src.large2x || p.src.large, width: p.width, height: p.height,
  alt: (p.alt || '').trim(), credit: p.photographer, creditUrl: p.photographer_url, page: p.url,
});

export async function searchPhotos(query, key, n = 8) {
  const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=${n}`, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels returned HTTP ${res.status}`);
  const j = await res.json();
  return (j.photos || []).filter((p) => p.width >= 1600 && p.height >= 900).map(pick);
}

/** Returns { hero, inline: [..], choices: [..] }. Never repeats a photo. */
export async function choosePhotos(queries, key, log = console.log) {
  if (!key) { log('No PEXELS_API_KEY, skipping photos.'); return { hero: null, inline: [], choices: [] }; }
  const used = new Set(), picks = [], choices = [];
  for (const q of queries.slice(0, 3)) {
    try {
      const list = (await searchPhotos(q, key)).filter((p) => p.alt);
      const first = list.find((p) => !used.has(p.id));
      if (first) { used.add(first.id); picks.push(first); }
      for (const p of list.slice(0, 4)) if (!choices.some((c) => c.id === p.id)) choices.push(p);
    } catch (e) { log(`Pexels search failed for "${q}": ${e.message}`); }
  }
  return { hero: picks[0] ?? null, inline: picks.slice(1), choices };
}
