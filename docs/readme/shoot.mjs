// Regenerates the README section images from product-summary.html.
// Usage:  npm i puppeteer-core --no-save && node docs/readme/shoot.mjs
// Requires Google Chrome installed at the default Windows path.
import puppeteer from "puppeteer-core"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const HTML = "file:///" + join(here, "product-summary.html").replace(/\\/g, "/")
const OUT = here

const SECTIONS = [
  ["hero", "01-hero"],
  ["problem", "02-problem"],
  ["modules", "03-modules"],
  ["roles", "04-roles"],
  ["pricing", "05-pricing"],
  ["design", "06-design"],
  ["footer", "07-footer"],
]

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
})
const page = await browser.newPage()
await page.setViewport({ width: 1004, height: 900, deviceScaleFactor: 2 })
await page.goto(HTML, { waitUntil: "networkidle0", timeout: 60000 })
await page.evaluate(() => document.fonts.ready)
await new Promise((r) => setTimeout(r, 800))

// include the top SMPTE bar with the hero
await page.evaluate(() => {
  const bar = document.getElementById("bar-top")
  const hero = document.getElementById("hero")
  hero.insertBefore(bar, hero.firstChild)
  hero.style.paddingTop = "0"
  bar.style.margin = "0 -72px 88px"
})

for (const [id, name] of SECTIONS) {
  const el = await page.$(`#${id}`)
  if (!el) { console.log(`MISSING: ${id}`); continue }
  await el.screenshot({ path: join(OUT, `${name}.png`) })
  console.log(`saved ${name}.png`)
}

await browser.close()
console.log("done")
