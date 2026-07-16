// Extracts plain text from a TipTap JSON document for PDF/CSV output.
export function richTextToPlain(doc: unknown): string {
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
  return parts.join("").replace(/\n+$/, "").trim()
}
