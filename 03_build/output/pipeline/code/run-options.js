// "Run options": adds the client (without its dataset list) to the run, so every later step knows
// whose name, style and feeds to use. Set test_tamper to true to change one number in the script
// and watch the guard stop the run.
const { data_sources, ...client } = $("Client").first().json;
return [{ json: { ...$input.first().json, client, test_tamper: false } }];
