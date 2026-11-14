// "Run options": set test_tamper to true to change one number in the script and watch the guard stop the run.
return [{ json: { ...$input.first().json, test_tamper: false } }];
