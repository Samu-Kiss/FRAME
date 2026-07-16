import { Document, Page, Text, View } from "@react-pdf/renderer"
import { pdf, SMPTE_PRINT } from "./theme.js"
import { richTextToPlain } from "../richtext.js"

// Data shape mirrors productionDayRouter.get's include tree.
export interface CallSheetData {
  project: { title: string; client: string | null; type: string }
  day: {
    date: Date
    generalCallTime: string
    status: string
    generalNotes: unknown
    locations: { location: { name: string; address: string | null; contactName: string | null; contactPhone: string | null } }[]
    scheduleBlocks: {
      startTime: string
      endTime: string
      type: string
      label: string
      parallel: boolean
      parallelGroupId: string | null
      notes: string | null
      location: { name: string } | null
      shots: { shot: { shotNumber: string; shotName: string } }[]
    }[]
    crewCalls: { callTime: string; department: string | null; person: { name: string; role: string } | null }[]
    talentCalls: {
      callTime: string
      makeupCallTime: string | null
      onSetTime: string | null
      wrapTime: string | null
      person: { name: string; role: string }
    }[]
  }
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

export function CallSheetDocument({ project, day }: CallSheetData) {
  const notes = richTextToPlain(day.generalNotes)
  // Group parallel blocks so simultaneous activities print side by side (§4.13)
  const groups: { key: string; blocks: CallSheetData["day"]["scheduleBlocks"] }[] = []
  for (const block of day.scheduleBlocks) {
    const key = block.parallel && block.parallelGroupId ? `g:${block.parallelGroupId}` : `s:${groups.length}`
    const existing = block.parallel && block.parallelGroupId ? groups.find((g) => g.key === key) : undefined
    if (existing) existing.blocks.push(block)
    else groups.push({ key, blocks: [block] })
  }

  return (
    <Document title={`Call Sheet — ${project.title}`}>
      <Page size="A4" style={pdf.page}>
        <SmpteStrip />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text style={pdf.brand}>FRAME</Text>
            <Text style={pdf.docTitle}>Call Sheet</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={pdf.projectTitle}>{project.title}</Text>
            {project.client ? <Text style={{ color: "#555" }}>{project.client}</Text> : null}
          </View>
        </View>

        <View style={[pdf.metaRow, { marginTop: 10 }]}>
          <Text style={pdf.mono}>{fmtDate(day.date)}</Text>
          <Text style={pdf.mono}>GENERAL CALL {day.generalCallTime}</Text>
          <Text style={pdf.mono}>{day.status}</Text>
        </View>

        {/* Locations */}
        <View style={pdf.section}>
          <Text style={pdf.sectionTitle}>Locations</Text>
          {day.locations.map(({ location }, i) => (
            <View key={i} style={pdf.row}>
              <Text style={{ width: "35%", fontFamily: "Helvetica-Bold" }}>{location.name}</Text>
              <Text style={{ width: "35%", color: "#444" }}>{location.address ?? "—"}</Text>
              <Text style={{ width: "30%", color: "#444" }}>
                {location.contactName ? `${location.contactName} · ${location.contactPhone ?? ""}` : "—"}
              </Text>
            </View>
          ))}
        </View>

        {/* Schedule */}
        <View style={pdf.section}>
          <Text style={pdf.sectionTitle}>Schedule</Text>
          <View style={pdf.headRow}>
            <Text style={[pdf.th, { width: "16%" }]}>Time</Text>
            <Text style={[pdf.th, { width: "84%" }]}>Activity</Text>
          </View>
          {groups.map((group, gi) => {
            const first = group.blocks[0]!
            return (
              <View key={gi} style={pdf.row} wrap={false}>
                <Text style={[pdf.mono, { width: "16%" }]}>
                  {first.startTime}–{first.endTime}
                </Text>
                <View style={{ width: "84%", flexDirection: "row", gap: 8 }}>
                  {group.blocks.map((block, bi) => (
                    <View
                      key={bi}
                      style={{
                        flex: 1,
                        ...(group.blocks.length > 1
                          ? { borderLeftWidth: 2, borderLeftColor: "#888", paddingLeft: 5 }
                          : {}),
                      }}
                    >
                      <Text style={{ fontFamily: "Helvetica-Bold" }}>{block.label}</Text>
                      <Text style={{ color: "#666", fontSize: 7.5 }}>
                        {block.type}
                        {block.location ? ` · ${block.location.name}` : ""}
                        {block.shots.length
                          ? ` · Shots: ${block.shots.map((s) => s.shot.shotNumber).join(", ")}`
                          : ""}
                      </Text>
                      {block.notes ? <Text style={{ color: "#666", fontSize: 7.5 }}>{block.notes}</Text> : null}
                    </View>
                  ))}
                </View>
              </View>
            )
          })}
        </View>

        {/* Crew calls */}
        <View style={pdf.section}>
          <Text style={pdf.sectionTitle}>Crew Call Times</Text>
          <View style={pdf.headRow}>
            <Text style={[pdf.th, { width: "20%" }]}>Call</Text>
            <Text style={[pdf.th, { width: "80%" }]}>Department / Person</Text>
          </View>
          {day.crewCalls.map((call, i) => (
            <View key={i} style={pdf.row}>
              <Text style={[pdf.mono, { width: "20%" }]}>{call.callTime}</Text>
              <Text style={{ width: "80%" }}>
                {call.person ? `${call.person.name} — ${call.person.role}` : (call.department ?? "—")}
              </Text>
            </View>
          ))}
        </View>

        {/* Talent calls */}
        <View style={pdf.section}>
          <Text style={pdf.sectionTitle}>Talent</Text>
          <View style={pdf.headRow}>
            <Text style={[pdf.th, { width: "34%" }]}>Talent</Text>
            <Text style={[pdf.th, { width: "16%" }]}>Call</Text>
            <Text style={[pdf.th, { width: "16%" }]}>HMU</Text>
            <Text style={[pdf.th, { width: "17%" }]}>On Set</Text>
            <Text style={[pdf.th, { width: "17%" }]}>Wrap</Text>
          </View>
          {day.talentCalls.map((call, i) => (
            <View key={i} style={pdf.row}>
              <Text style={{ width: "34%", fontFamily: "Helvetica-Bold" }}>
                {call.person.name}
                <Text style={{ fontFamily: "Helvetica", color: "#666" }}> — {call.person.role}</Text>
              </Text>
              <Text style={[pdf.mono, { width: "16%" }]}>{call.callTime}</Text>
              <Text style={[pdf.mono, { width: "16%" }]}>{call.makeupCallTime ?? "—"}</Text>
              <Text style={[pdf.mono, { width: "17%" }]}>{call.onSetTime ?? "—"}</Text>
              <Text style={[pdf.mono, { width: "17%" }]}>{call.wrapTime ?? "—"}</Text>
            </View>
          ))}
        </View>

        {notes ? (
          <View style={pdf.section}>
            <Text style={pdf.sectionTitle}>General Notes</Text>
            <Text style={{ lineHeight: 1.5 }}>{notes}</Text>
          </View>
        ) : null}

        <View style={pdf.footer} fixed>
          <Text>Generated with FRAME — Production Management</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
