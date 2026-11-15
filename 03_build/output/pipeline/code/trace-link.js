// "Add trace link": keeps the run and adds the links to its trace pages, if the render service saved
// them. A failed save leaves the links empty; the run goes on.
const run = $("Numbers check out?").first().json;
const r = $input.first().json;
return [{ json: { ...run, trace_id: r.trace_id ?? null, trace_url: r.trace_url ?? null, story_page_url: r.story_url ?? null } }];
