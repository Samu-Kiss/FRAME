// Rule-based screenplay breakdown (v2.0 "auto breakdown"). Parses the
// TipTap screenplay doc — no LLM — extracting scene headings, characters
// and simple prop hints so the user gets a draft structure to refine.
//
// Deterministic and transparent: scene headings by INT./EXT. prefix,
// characters from CHARACTER blocks, daylight from the heading's time-of-day.

export interface ParsedScene {
  heading: string
  intExt: "INT" | "EXT" | "INT/EXT" | null
  location: string
  daylight: string // DaylightType enum value
  action: string
  characters: string[]
}

export interface BreakdownResult {
  scenes: ParsedScene[]
  characters: string[] // unique across the whole script
}

const DAYLIGHT_MAP: { re: RegExp; value: string }[] = [
  { re: /\bDAWN\b/i, value: "DAWN" },
  { re: /\b(MORNING|SUNRISE)\b/i, value: "MORNING" },
  { re: /\b(NOON|MIDDAY)\b/i, value: "MIDDAY" },
  { re: /\bAFTERNOON\b/i, value: "AFTERNOON" },
  { re: /\b(SUNSET|DUSK|GOLDEN HOUR|MAGIC HOUR)\b/i, value: "SUNSET" },
  { re: /\bDEEP NIGHT|MIDNIGHT|LATE NIGHT\b/i, value: "DEEP_NIGHT" },
  { re: /\bNIGHT\b/i, value: "NIGHT" },
  { re: /\b(STUDIO|SET)\b/i, value: "STUDIO" },
  { re: /\bDAY\b/i, value: "MIDDAY" },
]

function daylightFrom(heading: string): string {
  for (const { re, value } of DAYLIGHT_MAP) if (re.test(heading)) return value
  return "MORNING"
}

function parseHeading(text: string): { intExt: ParsedScene["intExt"]; location: string } {
  const m = text.match(/^\s*(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?)\s*[\.\-—:]?\s*(.*)$/i)
  if (!m) return { intExt: null, location: text.trim() }
  const raw = m[1]!.toUpperCase().replace(/\./g, "")
  const intExt = raw.includes("/") ? "INT/EXT" : raw.startsWith("INT") ? "INT" : "EXT"
  // location = everything up to the time-of-day separator (last " - X")
  let loc = m[2]!.trim()
  const dash = loc.match(/^(.*?)\s+[\-—]\s+([A-Z ]+)\s*$/)
  if (dash) loc = dash[1]!.trim()
  return { intExt, location: loc || text.trim() }
}

interface SPBlock {
  blockType?: string
  text: string
}

function flatten(doc: unknown): SPBlock[] {
  if (!doc || typeof doc !== "object") return []
  const d = doc as { content?: { type?: string; attrs?: { blockType?: string }; content?: { text?: string }[] }[] }
  return (d.content ?? []).map((node) => ({
    blockType: node.attrs?.blockType,
    text: (node.content ?? []).map((c) => c.text ?? "").join("").trim(),
  }))
}

export function breakdownScript(doc: unknown): BreakdownResult {
  const blocks = flatten(doc)
  const scenes: ParsedScene[] = []
  const allCharacters = new Set<string>()
  let current: ParsedScene | null = null

  const pushCurrent = () => {
    if (current) {
      current.characters = [...new Set(current.characters)]
      scenes.push(current)
    }
  }

  for (const b of blocks) {
    if (!b.text) continue
    const isHeading =
      b.blockType === "sceneHeading" || /^\s*(INT\.?|EXT\.?|INT\.?\/EXT\.?|EXT\.?\/INT\.?)\b/i.test(b.text)

    if (isHeading) {
      pushCurrent()
      const { intExt, location } = parseHeading(b.text)
      current = {
        heading: b.text,
        intExt,
        location,
        daylight: daylightFrom(b.text),
        action: "",
        characters: [],
      }
    } else if (current) {
      if (b.blockType === "character") {
        // strip parentheticals like "(CONT'D)" / "(O.S.)"
        const name = b.text.replace(/\(.*?\)/g, "").trim()
        if (name && name.length <= 40) {
          current.characters.push(name)
          allCharacters.add(name)
        }
      } else if (b.blockType === "action" || !b.blockType) {
        current.action = current.action ? `${current.action} ${b.text}` : b.text
      }
    }
  }
  pushCurrent()

  return { scenes, characters: [...allCharacters] }
}
