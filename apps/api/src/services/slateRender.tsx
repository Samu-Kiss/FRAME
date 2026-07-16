import { Document, Page, Text, View } from "@react-pdf/renderer"
import { renderToBuffer } from "@react-pdf/renderer"
import type { ResolvedSlateField } from "./slate.js"
import type { ExportFile } from "./pdfExport.js"

const SMPTE = ["#F0F0F0", "#EFC000", "#00D4DE", "#00C853", "#CC00AA", "#FF3530", "#2860FF"]

/* ── Shared HTML template — the PNG overlay and the on-screen preview
     mirror this exact layout (§4.11) ─────────────────────────────── */

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

/* ── PNG via headless Chrome (§2.9) — on-demand, no persistent browser ── */

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean) as string[]

export async function renderSlatePNG(fields: ResolvedSlateField[], shotNumber: string): Promise<ExportFile> {
  const { existsSync } = await import("node:fs")
  const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p))
  if (!executablePath) {
    throw new Error("PNG_RENDERER_UNAVAILABLE: set CHROME_PATH to a Chrome/Chromium binary")
  }
  const puppeteer = (await import("puppeteer-core")).default
  const browser = await puppeteer.launch({ executablePath, headless: true })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setContent(slateHTML(fields), { waitUntil: "load" })
    const png = (await page.screenshot({ type: "png" })) as Buffer
    return {
      filename: `slate-${shotNumber}.png`,
      contentType: "image/png",
      body: Buffer.from(png),
    }
  } finally {
    await browser.close()
  }
}

/* ── Printable PDF ────────────────────────────────────────────── */

export async function renderSlatePDF(fields: ResolvedSlateField[], shotNumber: string): Promise<ExportFile> {
  const enabled = fields.filter((f) => f.enabled)
  const big = enabled.filter((f) => ["scene", "shot", "take"].includes(f.fieldKey))
  const rest = enabled.filter((f) => !["scene", "shot", "take"].includes(f.fieldKey))

  const doc = (
    <Document title={`Slate — ${shotNumber}`}>
      <Page size="A4" orientation="landscape" style={{ backgroundColor: "#0A0A0A", padding: 40, color: "#F0F0F0", fontFamily: "Courier" }}>
        <View style={{ flexDirection: "row", height: 12 }}>
          {SMPTE.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)}
        </View>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 36, marginBottom: 30 }}>
          {big.map((f) => (
            <View key={f.fieldKey} style={{ flex: 1, borderWidth: 1.5, borderColor: "#3A3A3A", borderRadius: 4, padding: 16 }}>
              <Text style={{ fontSize: 9, color: "#8A8A8A", letterSpacing: 3, textTransform: "uppercase" }}>{f.label}</Text>
              <Text style={{ fontSize: 54, fontFamily: "Courier-Bold", marginTop: 6 }}>{f.value}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 40 }}>
          {rest.map((f) => (
            <View key={f.fieldKey} style={{ width: "45%", flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.8, borderBottomColor: "#2A2A2A", paddingVertical: 7 }}>
              <Text style={{ fontSize: 10, color: "#8A8A8A", letterSpacing: 2, textTransform: "uppercase" }}>{f.label}</Text>
              <Text style={{ fontSize: 12, fontFamily: "Courier-Bold" }}>{f.value}</Text>
            </View>
          ))}
        </View>
        <View style={{ position: "absolute", bottom: 26, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 8, color: "#4A4A4A", letterSpacing: 4 }}>FRAME</Text>
          <Text style={{ fontSize: 8, color: "#4A4A4A", letterSpacing: 4 }}>PRODUCTION SLATE</Text>
        </View>
      </Page>
    </Document>
  )
  const buffer = await renderToBuffer(doc)
  return { filename: `slate-${shotNumber}.pdf`, contentType: "application/pdf", body: buffer }
}
