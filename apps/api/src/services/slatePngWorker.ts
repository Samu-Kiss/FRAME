// Child-process worker: renders the slate PNG with headless Chrome.
// Runs OUTSIDE the API process — `tsx watch` hangs if puppeteer-core sits
// in the server's module graph, and a Chrome crash can't take the API down.
// Protocol: JSON { fields, executablePath } on stdin → PNG bytes on stdout.
import puppeteer from "puppeteer-core"
import { slateHTML } from "./slateHtml.js"
import type { ResolvedSlateField } from "./slate.js"

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString("utf-8")
}

async function main() {
  const { fields, executablePath } = JSON.parse(await readStdin()) as {
    fields: ResolvedSlateField[]
    executablePath: string
  }
  const browser = await puppeteer.launch({ executablePath, headless: true })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setContent(slateHTML(fields), { waitUntil: "load" })
    const png = await page.screenshot({ type: "png" })
    process.stdout.write(Buffer.from(png))
  } finally {
    await browser.close()
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
)
