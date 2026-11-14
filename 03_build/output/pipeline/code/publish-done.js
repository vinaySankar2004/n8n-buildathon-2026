// "Published": the video and blurb are in the outlet channel. Hands the run back to "7 Chat".
const input = $("Input").first().json;
return [{ json: { ...input, ok: true, published: true } }];
