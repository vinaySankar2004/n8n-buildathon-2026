// "Package audio": the MP3 as base64 for the render service, and a length check (must-work row 4).
// ElevenLabs returns 128 kbit/s MP3, so bytes * 8 / 128000 is the length in seconds.
const input = $("Input").first().json;
const buf = await this.helpers.getBinaryDataBuffer(0, "data");
const seconds = Math.round(((buf.length * 8) / 128000) * 10) / 10;
if (seconds > 22) {
  return [{ json: { ok: false, step: "Voice", reason: `The narration is ${seconds} seconds; it must be under 22.` } }];
}
return [{ json: { ...input, ok: true, audio_base64: buf.toString("base64"), audio_seconds: seconds } }];
