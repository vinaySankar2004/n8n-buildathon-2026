// "Check Slack": Slack answers 200 even when a post fails, so check ok here, then hand the row to
// "Save thread". A new thread's key is the timestamp of the message just posted.
const r = $input.first().json;
if (!r.ok) throw new Error(`Slack did not post the message: ${r.error || JSON.stringify(r).slice(0, 200)}`);
const row = $("Reply ready").first().json.row;
return [{ json: { ...row, thread_ts: row.thread_ts || r.ts } }];
