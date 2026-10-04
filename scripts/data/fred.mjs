// FRED (Federal Reserve Bank of St. Louis): 30-year fixed mortgage rate, series MORTGAGE30US (Freddie Mac PMMS).
export async function fetchMortgageRate(apiKey, log = console.log) {
  if (!apiKey) { log('FRED: no FRED_API_KEY, skipping the mortgage rate'); return null; }
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${encodeURIComponent(apiKey)}&file_type=json&sort_order=desc&limit=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED returned HTTP ${res.status}`);
  const data = await res.json();
  const obs = (data.observations || []).find((o) => o.value !== '.' && !Number.isNaN(Number(o.value)));
  if (!obs) throw new Error('FRED returned no usable observation');
  log(`FRED: 30-year rate ${obs.value}% for the week of ${obs.date}`);
  return { rate: Number(obs.value), date: obs.date };
}
