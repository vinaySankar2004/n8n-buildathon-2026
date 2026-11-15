// "Feeds": one item per news feed in the client's config, for "Fetch feed".
// A client with no feeds still gets one item, so the run goes on with no reports.
const run = $("Input").first().json;
const feeds = run.client?.news_feeds ?? [];
return feeds.length ? feeds.map((json) => ({ json })) : [{ json: { id: "none", kind: "none", label: "no feeds", url: "" } }];
