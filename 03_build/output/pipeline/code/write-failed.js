// "Failed": every error in Write ends here, so the orchestrator sends a short note instead of crashing.
const j = $input.first().json;
const reason = j.reason || `Write failed: ${j.error?.message || j.message || "unknown error"}`;
return [{ json: { ok: false, step: "Write", reason } }];
