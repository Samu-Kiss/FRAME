import { Document, Page, Text, View } from "@react-pdf/renderer"
import { pdf, SMPTE_PRINT } from "./theme.js"

// Per-scene breakdown of everything that must be on set (§1.6):
// cast, props, styling looks and equipment, grouped by scene.

export interface BreakdownData {
  project: { title: string; client: string | null }
  scenes: {
    number: string
    title: string
    daylight: string
    location: { name: string } | null
    cast: string[]
    props: string[]
    styling: string[]
    equipment: string[]
  }[]
}

const SmpteStrip = () => (
  <View style={pdf.headerBar}>
    {SMPTE_PRINT.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)}
  </View>
)

const Col = ({ label, items }: { label: string; items: string[] }) => (
  <View style={{ width: "25%", paddingRight: 8 }}>
    <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7, textTransform: "uppercase", letterSpacing: 0.8, color: "#666", marginBottom: 3 }}>
      {label}
    </Text>
    {items.length ? (
      items.map((it, i) => <Text key={i} style={{ fontSize: 8, marginBottom: 1.5 }}>{it}</Text>)
    ) : (
      <Text style={{ fontSize: 8, color: "#999" }}>—</Text>
    )}
  </View>
)

export function SceneBreakdownDocument({ project, scenes }: BreakdownData) {
  return (
    <Document title={`Scene Breakdown — ${project.title}`}>
      <Page size="A4" style={pdf.page}>
        <SmpteStrip />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text style={pdf.brand}>FRAME</Text>
            <Text style={pdf.docTitle}>Scene Breakdown</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={pdf.projectTitle}>{project.title}</Text>
            {project.client ? <Text style={{ color: "#555" }}>{project.client}</Text> : null}
          </View>
        </View>

        {scenes.map((scene) => (
          <View key={scene.number} style={[pdf.section, { marginTop: 12 }]} wrap={false}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "baseline", backgroundColor: "#F2F2F2", paddingHorizontal: 5, paddingVertical: 3 }}>
              <Text style={[pdf.mono, { fontFamily: "Courier-Bold" }]}>SC {scene.number}</Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{scene.title}</Text>
              <Text style={{ color: "#666", fontSize: 8 }}>
                {scene.location?.name ?? "No location"} · {scene.daylight}
              </Text>
            </View>
            <View style={{ flexDirection: "row", marginTop: 6 }}>
              <Col label="Cast" items={scene.cast} />
              <Col label="Props" items={scene.props} />
              <Col label="Styling" items={scene.styling} />
              <Col label="Equipment" items={scene.equipment} />
            </View>
          </View>
        ))}

        <View style={pdf.footer} fixed>
          <Text>Generated with FRAME — Production Management</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
