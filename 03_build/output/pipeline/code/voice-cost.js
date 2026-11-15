// "Add voice cost": what this narration used, for the trace and the ledger. Multilingual v2 bills
// about one credit per character. The plan's price per credit is the account's own: its next
// invoice divided by its monthly credits, from "Check credits". A failed check leaves it unknown.
const pkg = $("Package audio").first().json;
const input = $("Input").first().json;
const sub = $input.first().json || {};
const limit = Number(sub.character_limit) || null;
const due = Number(sub.next_invoice?.amount_due_cents);
const call = {
  at: new Date().toISOString(),
  characters: String(input.spec?.script || "").length,
  tier: sub.tier ?? null,
  used_this_period: Number.isFinite(Number(sub.character_count)) ? Number(sub.character_count) : null,
  limit,
  usd_per_credit: limit && Number.isFinite(due) ? due / 100 / limit : null,
};
return [{ json: { ...pkg, voice_calls: [...(input.voice_calls || []), call] } }];
