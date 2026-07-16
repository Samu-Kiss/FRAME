import { Document, Page, Text, View } from "@react-pdf/renderer"
import { pdf, SMPTE_PRINT } from "./theme.js"

// Full-project timeline (§1.6): one section per production day, parallel
// blocks rendered side by side like the call sheet (§4.13).

export interface ScheduleDay {
  date: Date
  generalCallTime: string
  status: string
  locations: { location: { name: string } }[]
  scheduleBlocks: {
    startTime: string
    endTime: string
    type: string
    label: string
    parallel: boolean
    parallelGroupId: string | null
    notes: string | null
    location: { name: string } | null
    shots: { shot: { shotNumber: string } }[]
  }[]
}

const SmpteStrip = () => (
  <View style={pdf.headerBar}>
    {SMPTE_PRINT.map((c, i) => (
      <View key={i} style={{ flex: 1, backgroundColor: c }} />
    ))}
  </View>
)

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })

function groupBlocks(blocks: ScheduleDay["scheduleBlocks"]) {
  const groups: ScheduleDay["scheduleBlocks"][] = []
  for (const block of blocks) {
    if (block.parallel && block.parallelGroupId) {
      const g = groups.find((grp) => grp[0]?.parallel && grp[0]?.parallelGroupId === block.parallelGroupId)
      if (g) { g.push(block); continue }
    }
    groups.push([block])
  }
  return groups
}

export function ProductionScheduleDocument({
  project,
  days,
}: {
  project: { title: string; client: string | null }
  days: ScheduleDay[]
}) {
  return (
    <Document title={`Production Schedule — ${project.title}`}>
      <Page size="A4" style={pdf.page}>
        <SmpteStrip />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text style={pdf.brand}>FRAME</Text>
            <Text style={pdf.docTitle}>Production Schedule</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={pdf.projectTitle}>{project.title}</Text>
            {project.client ? <Text style={{ color: "#555" }}>{project.client}</Text> : null}
          </View>
        </View>

        {days.map((day, di) => (
          <View key={di} style={pdf.section}>
            <View
              style={{
                flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
                borderBottomWidth: 1, borderBottomColor: "#111", paddingBottom: 4, marginBottom: 5,
              }}
            >
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>
                DAY {di + 1} — {fmtDate(day.date)}
              </Text>
              <Text style={[pdf.mono, { fontSize: 8, color: "#555" }]}>
                CALL {day.generalCallTime} · {day.status} · {day.locations.map((l) => l.location.name).join(" / ") || "—"}
              </Text>
            </View>

            {groupBlocks(day.scheduleBlocks).map((group, gi) => {
              const first = group[0]!
              return (
                <View key={gi} style={pdf.row} wrap={false}>
                  <Text style={[pdf.mono, { width: "14%" }]}>
                    {first.startTime}–{first.endTime}
                  </Text>
                  <View style={{ width: "86%", flexDirection: "row", gap: 8 }}>
                    {group.map((block, bi) => (
                      <View
                        key={bi}
                        style={{
                          flex: 1,
                          ...(group.length > 1
                            ? { borderLeftWidth: 2, borderLeftColor: "#888", paddingLeft: 5 }
                            : {}),
                        }}
                      >
                        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8.5 }}>{block.label}</Text>
                        <Text style={{ color: "#666", fontSize: 7 }}>
                          {block.type}
                          {block.location ? ` · ${block.location.name}` : ""}
                          {block.shots.length ? ` · ${block.shots.map((s) => s.shot.shotNumber).join(", ")}` : ""}
                        </Text>
                        {block.notes ? <Text style={{ color: "#666", fontSize: 7 }}>{block.notes}</Text> : null}
                      </View>
                    ))}
                  </View>
                </View>
              )
            })}
            {day.scheduleBlocks.length === 0 ? (
              <Text style={{ color: "#999", fontSize: 8, paddingVertical: 4 }}>No schedule blocks planned.</Text>
            ) : null}
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
