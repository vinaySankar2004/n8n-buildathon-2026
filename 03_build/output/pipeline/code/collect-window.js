// "Set window": 9 weeks of 7 days ending on the Vancouver date of the newest record.
const s = $("Source config").first().json;
const newest = $input.first().json.results?.[0]?.newest;
if (!newest) return [{ json: { ok: false, source: s.label, reason: `${s.label}: the city API returned no newest record.` } }];
const day = s.date_only
  ? String(newest).slice(0, 10)
  : new Date(newest).toLocaleDateString("en-CA", { timeZone: "America/Vancouver" });
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ageHours = (Date.now() - new Date(newest).getTime()) / 36e5;
if (ageHours > s.max_age_hours) {
  return [{ json: { ok: false, source: s.label, reason: `${s.label}: the newest record is ${Math.round(ageHours)} hours old.` } }];
}
const start = addDays(day, -62);
const weekStart = addDays(day, -6);
const end = addDays(day, 1);
const extra = s.filter ? ` and (${s.filter})` : "";
const between = (a) => `${s.date_field} >= date'${a}' and ${s.date_field} < date'${end}'${extra}`;
return [{ json: {
  ok: true,
  newest_record: newest,
  week_ending: day,
  week_start: weekStart,
  daily: {
    select: `${s.category_field}, count(*) as n`,
    where: between(start),
    group_by: `${s.category_field}, date_format(${s.date_field}, 'yyyy-MM-dd') as day`,
  },
  area: {
    select: `${s.category_field}, ${s.area_field}, count(*) as n`,
    where: between(weekStart),
    group_by: `${s.category_field}, ${s.area_field}`,
  },
} }];
