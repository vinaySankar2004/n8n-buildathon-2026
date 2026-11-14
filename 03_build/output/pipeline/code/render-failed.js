// "Failed": every error in Render ends here, so the orchestrator sends a short note instead of crashing.
const j = $input.first().json;
const reason = j.reason || `Render failed: ${j.error?.message || j.message || "unknown error"}`;
return [{ json: { ok: false, step: "Render", reason } }];
