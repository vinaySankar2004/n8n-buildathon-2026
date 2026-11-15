// "Run options": adds the client (without its dataset list) to the run, so every later step knows
// whose name, style and feeds to use. Set test_tamper to true to change one number in the script
// and watch the guard stop the run.
const { data_sources, ...client } = $("Client").first().json;
// run_id and trigger are for the run ledger.
const trigger = $("Every morning").isExecuted ? "Daily run" : "Test run";
return [{ json: { ...$input.first().json, client, run_id: `run-${$execution.id}`, trigger, started_at: new Date().toISOString(), test_tamper: false } }];
