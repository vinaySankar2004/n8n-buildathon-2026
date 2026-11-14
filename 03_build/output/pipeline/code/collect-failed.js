// "Failed": every error in Collect ends here, so the orchestrator sends a short note instead of crashing.
const j = $input.first().json;
const reason = j.reason || `Collect failed: ${j.error?.message || j.message || "unknown error"}`;
return [{ json: { ok: false, step: "Collect", source: $("Source config").first()?.json?.label, reason } }];
