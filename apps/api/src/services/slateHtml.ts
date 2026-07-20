import type { ResolvedSlateField } from "./slate.js"

const SMPTE = ["#F0F0F0", "#EFC000", "#00D4DE", "#00C853", "#CC00AA", "#FF3530", "#2860FF"]

// Shared HTML template — the PNG overlay mirrors this exact layout (§4.11).
export function slateHTML(fields: ResolvedSlateField[]): string {
  const enabled = fields.filter((f) => f.enabled)
  const big = enabled.filter((f) => ["scene", "shot", "take"].includes(f.fieldKey))
  const rest = enabled.filter((f) => !["scene", "shot", "take"].includes(f.fieldKey))
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:1920px; height:1080px; background:#0A0A0A; color:#F0F0F0;
      font-family:'Consolas','Courier New',monospace; display:flex; flex-direction:column; }
    .bar { display:flex; height:36px; }
    .bar div { flex:1; }
    .main { flex:1; display:flex; flex-direction:column; padding:70px 90px; }
    .big { display:flex; gap:40px; margin-bottom:60px; }
    .cell { flex:1; border:3px solid #3A3A3A; border-radius:8px; padding:30px 40px; }
    .cell .label { font-size:28px; letter-spacing:0.25em; color:#8A8A8A; text-transform:uppercase; }
    .cell .value { font-size:150px; font-weight:bold; line-height:1.1; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:22px 80px; }
    .row { display:flex; justify-content:space-between; border-bottom:2px solid #222; padding-bottom:14px; }
    .row .label { font-size:30px; letter-spacing:0.2em; color:#8A8A8A; text-transform:uppercase; }
    .row .value { font-size:34px; font-weight:bold; text-align:right; }
    .foot { padding:24px 90px; display:flex; justify-content:space-between; align-items:center;
      border-top:2px solid #1E1E1E; font-size:24px; color:#4A4A4A; letter-spacing:0.3em; }
  </style></head><body>
    <div class="bar">${SMPTE.map((c) => `<div style="background:${c}"></div>`).join("")}</div>
    <div class="main">
      <div class="big">
        ${big.map((f) => `<div class="cell"><div class="label">${esc(f.label)}</div><div class="value">${esc(f.value)}</div></div>`).join("")}
      </div>
      <div class="grid">
        ${rest.map((f) => `<div class="row"><span class="label">${esc(f.label)}</span><span class="value">${esc(f.value)}</span></div>`).join("")}
      </div>
    </div>
    <div class="foot"><span>FRAME</span><span>PRODUCTION SLATE</span></div>
    <div class="bar">${SMPTE.map((c) => `<div style="background:${c}"></div>`).join("")}</div>
  </body></html>`
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
