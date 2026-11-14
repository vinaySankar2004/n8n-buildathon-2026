// Draws a workflow's n8n canvas as an SVG picture, from the same JSON n8n gets.
// build.mjs calls it for every workflow, so the pictures in ../workflows/ never go stale.
// Members of a self-hosted n8n cannot see the owner's workflows, so these pictures are how the team sees them.

const W = 196; // node box width; the build places nodes 220 apart
const H = 74;
const PAD = 40;

const KIND = {
  "n8n-nodes-base.code": ["Code", "#ff6d5a"],
  "n8n-nodes-base.httpRequest": ["HTTP Request", "#0f8bd8"],
  "n8n-nodes-base.slack": ["Slack", "#7a3f8f"],
  "n8n-nodes-base.if": ["If", "#2c9a4b"],
  "n8n-nodes-base.executeWorkflow": ["Execute Workflow", "#c27b0e"],
  "n8n-nodes-base.executeWorkflowTrigger": ["Trigger: called by a workflow", "#5a6578"],
  "n8n-nodes-base.webhook": ["Trigger: test webhook", "#5a6578"],
  "n8n-nodes-base.manualTrigger": ["Trigger: manual", "#5a6578"],
  "n8n-nodes-base.scheduleTrigger": ["Trigger: schedule", "#5a6578"],
  "n8n-nodes-base.noOp": ["Pass-through", "#9aa3b2"],
  "n8n-nodes-base.rssFeedRead": ["RSS Read", "#e8822e"],
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const wrap = (text, width) => {
  const lines = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if ((line + " " + word).trim().length > width) { if (line) lines.push(line); line = word; }
      else line = (line + " " + word).trim();
    }
    lines.push(line);
  }
  return lines;
};
const plain = (md) => md.replace(/\*\*(.*?)\*\*/g, "$1").replace(/`([^`]*)`/g, "$1");

export function toSvg(wf) {
  const nodes = wf.nodes.filter((n) => n.type !== "n8n-nodes-base.stickyNote");
  const notes = wf.nodes.filter((n) => n.type === "n8n-nodes-base.stickyNote");
  const at = new Map(nodes.map((n) => [n.name, n]));

  // Sticky notes shrink to their text, so the picture has no empty yellow space.
  const laid = notes.map((s) => {
    const w = s.parameters.width ?? 300;
    const lines = [];
    for (const raw of plain(s.parameters.content ?? "").split("\n")) {
      const title = raw.startsWith("## ");
      for (const line of wrap(title ? raw.slice(3) : raw, title ? 40 : Math.floor((w - 28) / 6.6))) lines.push({ line, title });
    }
    const h = Math.min(s.parameters.height ?? 200, 26 + lines.reduce((a, l) => a + (l.title ? 22 : 16), 0));
    return { x: s.position[0], y: s.position[1], w, h, lines };
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = (x, y, w, h) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h); };
  for (const n of nodes) grow(n.position[0], n.position[1], W, H);
  for (const s of laid) grow(s.x, s.y, s.w, s.h);
  const ox = PAD - minX;
  const oy = PAD - minY + 34; // room for the title
  const width = Math.round(maxX - minX + 2 * PAD);
  const height = Math.round(maxY - minY + 2 * PAD + 34 + 24); // and for the legend

  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="-apple-system, Segoe UI, Helvetica, Arial, sans-serif">`);
  out.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#f6f7f9"/>`);
  out.push(`<text x="${PAD}" y="${PAD + 4}" font-size="20" font-weight="700" fill="#1c2430">${esc(wf.name)}</text>`);
  out.push(`<text x="${PAD}" y="${height - 20}" font-size="12" fill="#667085">Grey line: the run goes on. Red dashed line: the error or "no" path. Drawn from 03_build/output/workflows/, the JSON deployed to n8n.</text>`);

  for (const s of laid) {
    const x = s.x + ox, y = s.y + oy;
    out.push(`<rect x="${x}" y="${y}" width="${s.w}" height="${s.h}" rx="8" fill="#fff6d6" stroke="#e8d27a"/>`);
    let ty = y + 26;
    for (const { line, title } of s.lines) {
      if (ty > y + s.h - 4) break;
      out.push(`<text x="${x + 14}" y="${ty}" font-size="${title ? 16 : 12}" font-weight="${title ? 700 : 400}" fill="#4a3f12">${esc(line)}</text>`);
      ty += title ? 22 : 16;
    }
  }

  for (const [from, { main }] of Object.entries(wf.connections)) {
    const a = at.get(from);
    if (!a || !main) continue;
    main.forEach((targets, index) => {
      for (const t of targets) {
        const b = at.get(t.node);
        if (!b) continue;
        const two = main.length > 1;
        const x1 = a.position[0] + ox + W, y1 = a.position[1] + oy + (two ? (index ? 52 : 22) : H / 2);
        const x2 = b.position[0] + ox, y2 = b.position[1] + oy + H / 2;
        // A line back to the left bends gently, so it stays inside the picture.
        const dx = x2 < x1 ? 60 : Math.max(40, Math.abs(x2 - x1) / 2);
        const side = index === 1;
        out.push(`<path d="M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}" fill="none" stroke="${side ? "#c2534a" : "#7d8796"}" stroke-width="2" ${side ? 'stroke-dasharray="6 4"' : ""}/>`);
      }
    });
  }

  for (const n of nodes) {
    const x = n.position[0] + ox, y = n.position[1] + oy;
    const [kind, colour] = KIND[n.type] ?? [n.type.split(".").pop(), "#9aa3b2"];
    const calls = n.parameters?.workflowId?.cachedResultName;
    const sub = n.disabled ? `${kind} (off)` : calls ? `Runs ${calls}` : kind;
    out.push(`<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="10" fill="#ffffff" stroke="${n.disabled ? "#b9c0cc" : "#cfd5de"}" stroke-width="1.5" ${n.disabled ? 'stroke-dasharray="5 4"' : ""}/>`);
    out.push(`<rect x="${x}" y="${y}" width="7" height="${H}" rx="3" fill="${colour}"/>`);
    const lines = wrap(n.name, 24).slice(0, 2);
    lines.forEach((line, i) => out.push(`<text x="${x + 18}" y="${y + 24 + i * 17}" font-size="13.5" font-weight="700" fill="#1c2430">${esc(line)}</text>`));
    out.push(`<text x="${x + 18}" y="${y + H - 12}" font-size="11" fill="#667085">${esc(sub)}</text>`);
  }
  out.push("</svg>");
  return out.join("\n") + "\n";
}
