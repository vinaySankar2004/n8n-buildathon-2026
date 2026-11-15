// "Run options": adds the client (without its dataset list) to the run, so every later step knows
// whose name, style and feeds to use. Set test_tamper to true to change one number in the script
// and watch the guard stop the run.
const { data_sources, ...client } = $("Client").first().json;
// run_id and trigger are for the run ledger. A test webhook call with { "desk": "test" } sends the
// review to the test channel and the row to the test ledger, so the demo channel stays clean.
const trigger = $("Every morning").isExecuted ? "Daily run" : "Test run";
const asked = $("Test webhook").isExecuted ? $("Test webhook").first().json.body || {} : {};
const desk = asked.desk === "test" ? "test" : "demo";
return [{ json: { ...$input.first().json, client, run_id: `run-${$execution.id}`, trigger, desk, started_at: new Date().toISOString(), test_tamper: false } }];
