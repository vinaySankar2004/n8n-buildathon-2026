// "Rank changes": every category in every source, this week against the 8 weeks before.
// A story needs at least MIN_COUNT this week and MIN_RATIO times the usual level, or a drop to
// 1 / MIN_RATIO of a usual level of at least MIN_COUNT. A drop to zero is left out: it usually
// means a program or season ended (election inquiries after an election), not news.
const MIN_COUNT = 20;
const MIN_RATIO = 2;
const round1 = (x) => Math.round(x * 10) / 10;
const topic = (t) => t.replace(/\s*-\s*311$/i, "").replace(/\s+(Request\s+)?Case$/i, "").trim();

const collected = $input.all().map((i) => i.json);
const ok = collected.filter((c) => c.ok);
const failed = collected.filter((c) => !c.ok).map((c) => c.reason).filter(Boolean);
if (!ok.length) return [{ json: { ok: false, step: "Score", reason: failed.join(" ") || "No source answered." } }];

const candidates = [];
for (const c of ok) {
  for (const t of c.types) {
    const counts = t.weekly.map((w) => w.count);
    const thisWeek = counts[8];
    const avg = round1(counts.slice(0, 8).reduce((a, b) => a + b, 0) / 8);
    if (avg === 0) continue; // nothing to compare against
    const up = thisWeek >= MIN_COUNT && thisWeek >= MIN_RATIO * avg;
    const down = avg >= MIN_COUNT && thisWeek > 0 && thisWeek <= avg / MIN_RATIO;
    candidates.push({
      c, t, thisWeek, avg, up, down,
      ratio: round1(thisWeek / avg),
      pct_change: Math.round(((thisWeek - avg) / avg) * 100),
      strength: up ? thisWeek / avg : avg / Math.max(thisWeek, 1),
    });
  }
}
const passing = candidates.filter((x) => x.up || x.down).sort((a, b) => b.strength - a.strength);
const checked = ok.map((c) => c.dataset).join(", ");
if (!passing.length) {
  return [{ json: { ok: false, step: "Score", reason: `No change passed the bar (at least ${MIN_COUNT} and ${MIN_RATIO} times the usual level) in ${checked}.${failed.length ? " " + failed.join(" ") : ""}` } }];
}

const top = passing[0];
const story = {
  week_start: top.c.week_start,
  week_ending: top.c.week_ending,
  dataset: top.c.dataset,
  source_note: top.c.source_note,
  source_url: top.c.source_url,
  unit: top.c.unit,
  type: top.t.type,
  topic: topic(top.t.type),
  direction: top.up ? "up" : "down",
  this_week: top.thisWeek,
  avg_prev_8_weeks: top.avg,
  ratio: top.ratio,
  pct_change: top.pct_change,
  // What the bars show: neighbourhoods this week, or the weekly trend when there are too few areas.
  chart_kind: top.up && top.t.by_area.length >= 3 ? "by_area" : "weekly",
  by_area: top.t.by_area.slice(0, 10),
  unknown_area: top.t.unknown_area,
  weekly: top.t.weekly,
};
return [{ json: {
  ok: true,
  story,
  runners_up: passing.slice(1, 6).map((x) => ({ dataset: x.c.dataset, type: x.t.type, direction: x.up ? "up" : "down", this_week: x.thisWeek, avg_prev_8_weeks: x.avg, ratio: x.ratio })),
  sources_checked: checked,
  sources_failed: failed,
} }];
