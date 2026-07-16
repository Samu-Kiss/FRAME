// Plain-text bridge for TipTap JSON documents. The core MVP edits notes
// as plain text; the TipTap editor (MVP+) reads the same structure.

export function toRichText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  return {
    type: "doc",
    content: trimmed.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  }
}

export function fromRichText(doc: unknown): string {
  if (!doc || typeof doc !== "object") return ""
  const parts: string[] = []
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return
    const n = node as { type?: string; text?: string; content?: unknown[] }
    if (n.type === "text" && n.text) parts.push(n.text)
    if (Array.isArray(n.content)) {
      n.content.forEach(walk)
      if (n.type === "paragraph") parts.push("\n")
    }
  }
  walk(doc)
  return parts.join("").replace(/\n+$/, "")
}
