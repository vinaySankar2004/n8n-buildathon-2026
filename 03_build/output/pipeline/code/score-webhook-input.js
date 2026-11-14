// "Webhook input": the test webhook's body is an array of Collect outputs (or { collected: [...] }).
const body = $input.first().json.body;
const list = Array.isArray(body) ? body : Array.isArray(body?.collected) ? body.collected : [];
if (!list.length) return [{ json: { ok: false, reason: "Send an array of Collect outputs." } }];
return list.map((json) => ({ json }));
