// One-off helper: shows what the Bridge "reviews" dataset exposes (field names and types only, no review text),
// so the reviews job can be written against the real schema. Run through the "Explore Bridge reviews" workflow.
const token = process.env.BRIDGE_API_TOKEN;
if (!token) { console.log('No BRIDGE_API_TOKEN'); process.exit(1); }
const base = 'https://api.bridgedataoutput.com/api/v2/OData/reviews';
const get = async (path, accept = 'application/json') => {
  const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: accept } });
  const text = await res.text();
  return { status: res.status, text };
};

const meta = await get('/$metadata', 'application/xml');
console.log('$metadata status:', meta.status);
if (meta.status === 200) {
  const sets = [...meta.text.matchAll(/<EntitySet Name="([^"]+)"/g)].map((m) => m[1]);
  console.log('Entity sets:', sets.join(', ') || '(none found)');
  for (const m of meta.text.matchAll(/<EntityType Name="([^"]+)"[^>]*>([\s\S]*?)<\/EntityType>/g)) {
    const props = [...m[2].matchAll(/<Property Name="([^"]+)" Type="([^"]+)"/g)].map((p) => `${p[1]}:${p[2].replace('Edm.', '')}`);
    console.log(`Type ${m[1]} (${props.length} fields):`, props.join(', '));
  }
  for (const s of sets) {
    const r = await get(`/${s}?$top=2`);
    console.log(`GET /${s}?$top=2 ->`, r.status);
    if (r.status === 200) {
      const j = JSON.parse(r.text);
      console.log('  total (@odata.count):', j['@odata.count'] ?? 'n/a', '| rows returned:', (j.value || []).length);
      const row = (j.value || [])[0] || {};
      console.log('  first row keys/types:', Object.entries(row).map(([k, v]) => `${k}:${v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v}${typeof v === 'string' ? `(${v.length})` : ''}`).join(', '));
    } else console.log('  body:', r.text.slice(0, 300).replace(/access_token=[^&"\s]+/g, 'access_token=[hidden]'));
  }
} else {
  console.log('body:', meta.text.slice(0, 400));
}
