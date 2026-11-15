// "Add reactions": the run from this workflow with `reactions` from 2c Reddit. If 2c Reddit fails
// (no Reddit credential yet, Reddit down), the story goes on without them.
let run;
try { run = $("Web sources").first().json; } catch { run = $("Recent reports").first().json; }
const r = $input.first().json;
const reactions = r && r.reactions ? r.reactions : { source: "Reddit", relevant: false, threads: [], quotes: [], calls: [], error: r?.error?.message || r?.message || "2c Reddit did not answer" };
return [{ json: { ...run, reactions } }];
