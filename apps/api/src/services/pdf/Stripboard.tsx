import { Document, Page, Text, View } from "@react-pdf/renderer"
import { pdf, SMPTE_PRINT } from "./theme.js"

// Classic production stripboard (§1.6): one colored strip per scene,
// color-coded by daylight (INT/EXT day/night), grouped by shoot day.

export interface StripboardData {
  project: { title: string; client: string | null }
  days: {
    date: Date | null
    label: string
    strips: {
      sceneNumber: string
      title: string
      daylight: string
      location: string
      cast: number
      pages: string
    }[]
  }[]
}

// Muted daylight colors (industry stripboard convention, SMPTE-tinted)
const DAYLIGHT_STRIP: Record<string, string> = {
  DAWN: "#E8D9A0",
  MORNING: "#FBF3D0",
  MIDDAY: "#FFFFFF",
  AFTERNOON: "#FBF3D0",
  SUNSET: "#F0C9A0",
  NIGHT: "#B9C4E0",
  DEEP_NIGHT: "#9AA6C8",
  STUDIO: "#D8D8D8",
}

const SmpteStrip = () => (
  <View style={pdf.headerBar}>
    {SMPTE_PRINT.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)}
  </View>
)

const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }) : "Unscheduled"

export function StripboardDocument({ project, days }: StripboardData) {
  return (
    <Document title={`Stripboard — ${project.title}`}>
      <Page size="A4" style={pdf.page}>
        <SmpteStrip />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text style={pdf.brand}>FRAME</Text>
            <Text style={pdf.docTitle}>Stripboard</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={pdf.projectTitle}>{project.title}</Text>
            {project.client ? <Text style={{ color: "#555" }}>{project.client}</Text> : null}
          </View>
        </View>

        {days.map((day, di) => (
          <View key={di} style={pdf.section}>
            <Text style={pdf.sectionTitle}>{day.label} — {fmtDate(day.date)}</Text>
            {day.strips.map((strip, si) => (
              <View
                key={si}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: DAYLIGHT_STRIP[strip.daylight] ?? "#FFFFFF",
                  borderWidth: 0.5,
                  borderColor: "#999",
                  paddingVertical: 3,
                  paddingHorizontal: 5,
                  marginBottom: 1.5,
                }}
                wrap={false}
              >
                <Text style={{ width: "10%", fontFamily: "Courier-Bold", fontSize: 8, color: "#111" }}>{strip.sceneNumber}</Text>
                <Text style={{ width: "12%", fontSize: 7, color: "#333", textTransform: "uppercase" }}>{strip.daylight}</Text>
                <Text style={{ width: "38%", fontSize: 8, color: "#111" }}>{strip.title}</Text>
                <Text style={{ width: "25%", fontSize: 7.5, color: "#333" }}>{strip.location}</Text>
                <Text style={{ width: "8%", fontSize: 7.5, color: "#333", textAlign: "center" }}>{strip.cast || "—"}</Text>
                <Text style={{ width: "7%", fontSize: 7.5, color: "#333", textAlign: "right" }}>{strip.pages}</Text>
              </View>
            ))}
            {day.strips.length === 0 ? (
              <Text style={{ fontSize: 8, color: "#999" }}>No scenes.</Text>
            ) : null}
          </View>
        ))}
        <Text style={{ fontSize: 7, color: "#888", marginTop: 10 }}>
          Strip color = daylight. Cast = number of cast members. Pages = estimated eighths.
        </Text>

        <View style={pdf.footer} fixed>
          <Text>Generated with FRAME — Production Management</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
