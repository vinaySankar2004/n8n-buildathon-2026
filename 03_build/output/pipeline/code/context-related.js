// "Recent reports": reads every feed "Fetch feed" got, keeps items from this story's week on,
// and adds the newest 12 to the run as `reports`. Write decides which, if any, fit the story.
// A feed that fails is noted in `feeds_checked` and skipped; news never stops a run.
const run = $("Input").first().json;
const feeds = $("Feeds").all().map((i) => i.json);
const answers = $input.all().map((i) => i.json);

const strip = (s) => String(s ?? "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ").trim();
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? strip(m[1]) : ""; };
const iso = (d) => { const t = new Date(d); return Number.isNaN(t.getTime()) ? null : t.toISOString(); };
const clip = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "..." : s);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const read = {
  rss: (text) => [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, x]) => ({
    title: tag(x, "title"), summary: clip(tag(x, "description"), 300), url: tag(x, "link"), published: iso(tag(x, "pubDate")),
  })),
  weather_alerts: (text) => {
    const seen = new Set();
    return (JSON.parse(text).features ?? []).map((f) => f.properties).filter((p) => {
      const key = `${p.alert_name_en}|${p.feature_name_en}`;
      if (seen.has(key) || new Date(p.expiration_datetime) < new Date()) return false;
      seen.add(key);
      return true;
    }).map((p) => ({
      title: `${cap(p.alert_name_en)} for ${p.feature_name_en}`,
      summary: clip(strip(p.alert_text_en), 400),
      url: "https://weather.gc.ca/warnings/index_e.html",
      published: iso(p.publication_datetime),
    }));
  },
  open511: (text) => (JSON.parse(text).events ?? []).map((e) => ({
    title: clip(strip(e.description), 120),
    summary: clip(strip(e.description), 300),
    url: "https://www.drivebc.ca/",
    published: iso(e.updated ?? e.created),
  })),
};

// From the start of the story's week, with half a day to spare for time zones.
const since = new Date(new Date(`${run.story.week_start}T00:00:00Z`).getTime() - 12 * 36e5);
const found = [];
const feeds_checked = [];
feeds.forEach((f, i) => {
  if (f.kind === "none") return;
  const a = answers[i] ?? {};
  if (typeof a.data !== "string" || !a.data) {
    feeds_checked.push({ feed: f.label, ok: false, reason: a.error?.message ?? "no answer" });
    return;
  }
  let items;
  try {
    if (!read[f.kind]) throw new Error(`unknown feed kind ${f.kind}`);
    items = read[f.kind](a.data);
  } catch (e) {
    feeds_checked.push({ feed: f.label, ok: false, reason: `could not read it: ${e.message}` });
    return;
  }
  const recent = items.filter((x) => x.title && (!x.published || new Date(x.published) >= since));
  feeds_checked.push({ feed: f.label, ok: true, items: items.length, recent: recent.length });
  for (const x of recent) found.push({ source: f.source_note, feed: f.id, ...x });
});
found.sort((a, b) => String(b.published ?? "").localeCompare(String(a.published ?? "")));
const reports = found.slice(0, 12).map((r, k) => ({ id: `r${k + 1}`, ...r }));
return [{ json: { ...run, ok: true, reports, feeds_checked } }];
