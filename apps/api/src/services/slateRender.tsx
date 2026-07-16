import { existsSync } from "node:fs"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { Document, Page, Text, View } from "@react-pdf/renderer"
import { renderToBuffer } from "@react-pdf/renderer"
import type { ResolvedSlateField } from "./slate.js"
import type { ExportFile } from "./pdfExport.js"

const SMPTE = ["#F0F0F0", "#EFC000", "#00D4DE", "#00C853", "#CC00AA", "#FF3530", "#2860FF"]

/* ── PNG via headless Chrome in a CHILD process (§2.9) ──────────
   puppeteer-core must stay out of the server's module graph — `tsx
   watch` deadlocks on it — and a Chrome crash must not kill the API. */

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean) as string[]

export async function renderSlatePNG(fields: ResolvedSlateField[], shotNumber: string): Promise<ExportFile> {
  const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p))
  if (!executablePath) {
    throw new Error("PNG_RENDERER_UNAVAILABLE: set CHROME_PATH to a Chrome/Chromium binary")
  }
  const workerPath = join(dirname(fileURLToPath(import.meta.url)), "slatePngWorker.ts")

  const png = await new Promise<Buffer>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import=tsx", workerPath], {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 60_000,
    })
    const out: Buffer[] = []
    const err: Buffer[] = []
    child.stdout.on("data", (d) => out.push(d))
    child.stderr.on("data", (d) => err.push(d))
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0 && out.length) resolve(Buffer.concat(out))
      else reject(new Error(`SLATE_PNG_FAILED: ${Buffer.concat(err).toString("utf-8").slice(0, 300) || `exit ${code}`}`))
    })
    child.stdin.write(JSON.stringify({ fields, executablePath }))
    child.stdin.end()
  })

  return { filename: `slate-${shotNumber}.png`, contentType: "image/png", body: png }
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
