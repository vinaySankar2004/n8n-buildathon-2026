// "Failed": every error in Voice ends here, so the orchestrator sends a short note instead of crashing.
const j = $input.first().json;
const reason = j.reason || `Voice failed: ${j.error?.message || j.message || "unknown error"}`;
return [{ json: { ok: false, step: "Voice", reason } }];
