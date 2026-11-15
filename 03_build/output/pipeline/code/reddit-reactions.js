// "Reactions": what people on Reddit are saying, added to the run as `reactions`. Opinion only:
// nothing here is a source for numbers, and the guard never looks at it. Each quote is kept only
// if its words really are in a comment, and no username is kept.
const run = $("Input").first().json;
const { terms_body, ...rest } = run;
const searched = $("What to search").all().map((i) => i.json);
const found = (() => { try { return $("Search Reddit").all().filter((i) => i.json?.id).length; } catch { return 0; } })();
const searchError = (() => { try { return $("Search Reddit").all().map((i) => i.json?.error).find(Boolean) || null; } catch { return null; } })();
const terms = (() => { try { return $("Search terms with Claude").first().json; } catch { return null; } })();
let asked = null;
let res = null;
try { asked = $("Mood request").first().json; res = $input.first().json; } catch {}
const threads = asked?.threads || [];
const calls = [];
if (terms?.usage) calls.push({ what: "Pick Reddit searches", model: terms.model, usage: terms.usage });
if (res?.usage) calls.push({ what: "Read the Reddit reactions", model: res.model, usage: res.usage });

let mood = { relevant: false, summary: "", themes: [], quotes: [] };
if (res?.content) {
  const raw = String(res.content.find((c) => c.type === "text")?.text ?? "");
  try { mood = { ...mood, ...JSON.parse(raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, "$1")) }; } catch {}
}
const norm = (t) => String(t).toLowerCase().replace(/[“”"]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
const quotes = (Array.isArray(mood.quotes) ? mood.quotes : []).filter((q) => {
  const t = threads.find((x) => x.ref === q.thread);
  return t && q.text && t.comments.some((c) => norm(c.text).includes(norm(q.text)));
}).slice(0, 3).map((q) => ({ thread: q.thread, text: String(q.text).trim() }));

const reactions = {
  source: "Reddit",
  note: "Opinion and experience from Reddit, never data. No number from here may appear in a script.",
  searched: searched.map((s) => `r/${s.subreddit}: "${s.keyword}"`),
  threads_found: found,
  threads: threads.map(({ comments, text, ...t }) => ({ ...t, comments_read: comments.length })),
  relevant: !!mood.relevant && threads.length > 0,
  summary: mood.relevant ? String(mood.summary || "").trim() : "",
  themes: mood.relevant ? (mood.themes || []).slice(0, 3) : [],
  quotes,
  calls,
  error: searchError ? String(searchError.message || searchError) : null,
};
return [{ json: { ...rest, reactions } }];
