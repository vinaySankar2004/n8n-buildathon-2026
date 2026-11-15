// What a run cost, from what the run itself recorded. Shared by the trace pages and the ledger.

// Claude prices per million tokens, from Anthropic's model list on 2026-11-14.
const PRICES = {
  "claude-sonnet-5-5": { in: 2, out: 10 },
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
};

// Every Claude call the run made: reading a Slack request, searching the web, writing the draft,
// each revision. A web search also costs $10 per 1,000 searches on top of its tokens.
const PER_SEARCH = 10 / 1000;
export function claudeCalls(run) {
  const calls = [];
  if (run.request?.parse?.usage) calls.push({ what: "Read the Slack request", ...run.request.parse });
  if (run.web_search?.usage) calls.push({ what: `Search the web (${run.web_search.searches || 0} searches)`, model: run.web_search.model, usage: run.web_search.usage, searches: run.web_search.searches || 0 });
  for (const c of run.reactions?.calls || []) if (c.usage) calls.push(c);
  if (run.write?.usage) calls.push({ what: "Write the draft", model: run.write.model, usage: run.write.usage });
  for (const r of run.revisions || []) if (r.usage) calls.push({ what: `Revise: "${r.editor}"`, model: r.model, usage: r.usage });
  return calls.map((c) => {
    const p = PRICES[c.model] || PRICES["claude-sonnet-5-5"];
    return { ...c, usd: (c.usage.input_tokens * p.in + c.usage.output_tokens * p.out) / 1e6 + (c.searches || 0) * PER_SEARCH };
  });
}

// ElevenLabs: about one credit per character on Multilingual v2. The price per credit is the
// account's own (next invoice / monthly credits), read by 4 Voice; null when ElevenLabs did not say.
export function voiceCost(run) {
  const calls = run.voice_calls || [];
  const credits = calls.reduce((s, c) => s + (c.characters || 0), 0);
  const last = calls[calls.length - 1] || {};
  const rate = last.tier === "free" ? 0 : last.usd_per_credit;
  return {
    calls: calls.length,
    credits,
    usd: Number.isFinite(rate) ? credits * rate : null,
    tier: last.tier || null,
    left: Number.isFinite(last.limit) && Number.isFinite(last.used_this_period) ? last.limit - last.used_this_period : null,
    limit: last.limit ?? null,
  };
}

export function totalCost(run) {
  const claude = claudeCalls(run).reduce((s, c) => s + c.usd, 0);
  const voice = voiceCost(run);
  return { claude, voice, usd: claude + (voice.usd || 0) };
}

export const usd = (x) => (x === null || x === undefined ? "unknown" : `$${x.toFixed(4)}`);
