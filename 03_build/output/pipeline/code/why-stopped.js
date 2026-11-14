// "Why it stopped": one line for the editor (must-work row 10).
const j = $input.first().json;
const reason = j.reason || j.error?.message || j.message || "A step failed without saying why.";
return [{ json: { text: `No story today. ${reason}` } }];
