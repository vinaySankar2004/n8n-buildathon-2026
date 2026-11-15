// "Start review": the first message of a review thread, posted to the editor channel after Write.
// It shows the headline, script, the numbers behind them and what goes on screen, before any voice
// or video is made. Its timestamp becomes the thread the editor replies in.
const run = $input.first().json;
if (!run.spec || !run.story) throw new Error("Start review needs a run from 3 Write, with story and spec.");
const blocks = [
  section("*New story for review.* Nothing is recorded or published until you approve."),
  ...scriptBlocks(run),
  ...(run.trace_url ? [context(`<${run.trace_url}|Open the run trace>: every source, the ranking, the news offered, what Claude was asked and answered, where each number came from, and the cost.`)] : []),
  context(HOW_TO_REPLY),
  scriptButtons(),
];
return [reply("", `For review: ${run.spec.headline}`, blocks, "script", run, [])];
