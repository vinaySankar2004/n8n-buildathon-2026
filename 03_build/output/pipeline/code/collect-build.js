// "Build collected": days into weeks, plus this week's neighbourhood counts. See `collected` in _config/contracts.md.
const s = $("Source config").first().json;
const w = $("Set window").first().json;
const daily = $("Daily counts by category").all().map((i) => i.json);
const areas = $("This week by area").all().map((i) => i.json);
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 864e5);
const weeks = Array.from({ length: 9 }, (_, k) => addDays(w.week_ending, -7 * (8 - k)));

const types = new Map();
const entry = (t) => {
  if (!types.has(t)) types.set(t, { type: t, weekly: weeks.map((we) => ({ week_ending: we, count: 0 })), by_area: [], unknown_area: 0 });
  return types.get(t);
};
for (const r of daily) {
  const t = r[s.category_field];
  if (!t || !r.day) continue;
  const k = 8 - Math.floor(daysBetween(r.day, w.week_ending) / 7);
  if (k >= 0 && k <= 8) entry(t).weekly[k].count += r.n;
}
for (const r of areas) {
  const t = r[s.category_field];
  if (!t) continue;
  const e = entry(t);
  if (r[s.area_field]) e.by_area.push({ area: r[s.area_field], count: r.n });
  else e.unknown_area += r.n;
}
for (const e of types.values()) e.by_area.sort((a, b) => b.count - a.count);
if (!types.size) return [{ json: { ok: false, source: s.label, reason: `${s.label}: no rows in the last 9 weeks.` } }];

return [{ json: {
  ok: true,
  source_id: s.id,
  dataset: s.label,
  source_note: s.source_note,
  source_url: s.source_url,
  unit: s.unit,
  newest_record: w.newest_record,
  week_start: w.week_start,
  week_ending: w.week_ending,
  weeks,
  types: [...types.values()],
} }];
