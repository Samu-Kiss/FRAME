import { Document, Page, Text, View } from "@react-pdf/renderer"

// Industry-standard screenplay format (§4.3): Courier 12pt on US Letter,
// 1.5in left margin, block-specific indents measured from that margin.

export interface ScriptBlock {
  blockType: string
  text: string
}

const IN = 72 // points per inch

const BLOCK_STYLE: Record<string, object> = {
  sceneHeading: { textTransform: "uppercase", marginTop: 12, fontFamily: "Courier-Bold" },
  action: { marginTop: 12 },
  character: { marginLeft: 2.2 * IN, textTransform: "uppercase", marginTop: 12 },
  parenthetical: { marginLeft: 1.6 * IN, maxWidth: 2.4 * IN },
  dialogue: { marginLeft: 1 * IN, maxWidth: 3.5 * IN },
  transition: { textAlign: "right", textTransform: "uppercase", marginTop: 12 },
}

export function ScriptDocument({ title, blocks }: { title: string; blocks: ScriptBlock[] }) {
  return (
    <Document title={`Script — ${title}`}>
      <Page
        size="LETTER"
        style={{
          paddingTop: 1 * IN,
          paddingBottom: 1 * IN,
          paddingLeft: 1.5 * IN,
          paddingRight: 1 * IN,
          fontFamily: "Courier",
          fontSize: 12,
          lineHeight: 1,
        }}
      >
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontFamily: "Courier-Bold", textAlign: "center", textTransform: "uppercase" }}>
            {title}
          </Text>
        </View>
        {blocks.map((block, i) => (
          <Text key={i} style={{ marginBottom: 0, ...(BLOCK_STYLE[block.blockType] ?? BLOCK_STYLE.action!) }}>
            {block.text || " "}
          </Text>
        ))}
        <Text
          fixed
          render={({ pageNumber }) => (pageNumber > 1 ? `${pageNumber}.` : "")}
          style={{ position: "absolute", top: 0.5 * IN, right: 1 * IN, fontSize: 12 }}
        />
      </Page>
    </Document>
  )
}

// Flattens the TipTap screenplay doc into printable blocks.
export function scriptDocToBlocks(doc: unknown): ScriptBlock[] {
  if (!doc || typeof doc !== "object") return []
  const d = doc as { content?: { type?: string; attrs?: { blockType?: string }; content?: { text?: string }[] }[] }
  return (d.content ?? []).map((node) => ({
    blockType: node.attrs?.blockType ?? "action",
    text: (node.content ?? []).map((c) => c.text ?? "").join(""),
  }))
}
