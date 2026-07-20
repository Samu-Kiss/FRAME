import { Document, Page, Text, View } from "@react-pdf/renderer"
import { pdf, SMPTE_PRINT } from "./theme.js"

// Per-talent call schedule across all shoot days (§1.6).

export interface TalentScheduleData {
  project: { title: string; client: string | null }
  talents: {
    name: string
    characterName: string | null
    calls: {
      date: Date
      callTime: string
      makeupCallTime: string | null
      onSetTime: string | null
      wrapTime: string | null
    }[]
  }[]
}

const SmpteStrip = () => (
  <View style={pdf.headerBar}>
    {SMPTE_PRINT.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)}
  </View>
)

const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })

export function TalentScheduleDocument({ project, talents }: TalentScheduleData) {
  return (
    <Document title={`Talent Schedule — ${project.title}`}>
      <Page size="A4" style={pdf.page}>
        <SmpteStrip />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text style={pdf.brand}>FRAME</Text>
            <Text style={pdf.docTitle}>Talent Schedule</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={pdf.projectTitle}>{project.title}</Text>
            {project.client ? <Text style={{ color: "#555" }}>{project.client}</Text> : null}
          </View>
        </View>

        {talents.map((t) => (
          <View key={t.name} style={pdf.section} wrap={false}>
            <Text style={pdf.sectionTitle}>
              {t.name}{t.characterName ? ` — as "${t.characterName}"` : ""}
            </Text>
            <View style={pdf.headRow}>
              <Text style={[pdf.th, { width: "28%" }]}>Day</Text>
              <Text style={[pdf.th, { width: "18%" }]}>Call</Text>
              <Text style={[pdf.th, { width: "18%" }]}>HMU</Text>
              <Text style={[pdf.th, { width: "18%" }]}>On Set</Text>
              <Text style={[pdf.th, { width: "18%" }]}>Wrap</Text>
            </View>
            {t.calls.length ? (
              t.calls.map((c, i) => (
                <View key={i} style={pdf.row}>
                  <Text style={{ width: "28%" }}>{fmtDate(c.date)}</Text>
                  <Text style={[pdf.mono, { width: "18%" }]}>{c.callTime}</Text>
                  <Text style={[pdf.mono, { width: "18%" }]}>{c.makeupCallTime ?? "—"}</Text>
                  <Text style={[pdf.mono, { width: "18%" }]}>{c.onSetTime ?? "—"}</Text>
                  <Text style={[pdf.mono, { width: "18%" }]}>{c.wrapTime ?? "—"}</Text>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 8, color: "#999", paddingVertical: 3 }}>No call times scheduled.</Text>
            )}
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
