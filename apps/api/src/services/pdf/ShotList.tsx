import { Document, Page, Text, View } from "@react-pdf/renderer"
import { pdf, SMPTE_PRINT } from "./theme.js"
import { richTextToPlain } from "../richtext.js"

export interface ShotListData {
  project: { title: string; client: string | null }
  acts: {
    number: number
    title: string | null
    scenes: {
      number: string
      title: string
      daylight: string
      location: { name: string } | null
      shots: {
        shotNumber: string
        shotName: string
        description: unknown
        frameSize: string | null
        lensSize: string | null
        cameraMovements: string[]
        cameraAngle: string | null
        estimatedDuration: number | null
        status: string
        filmed: boolean
        people: { person: { name: string } }[]
        equipment: { equipment: { name: string } }[]
        props: { prop: { name: string } }[]
      }[]
    }[]
  }[]
}

const SmpteStrip = () => (
  <View style={pdf.headerBar}>
    {SMPTE_PRINT.map((c, i) => (
      <View key={i} style={{ flex: 1, backgroundColor: c }} />
    ))}
  </View>
)

export function ShotListDocument({ project, acts }: ShotListData) {
  return (
    <Document title={`Shot List — ${project.title}`}>
      <Page size="A4" orientation="landscape" style={pdf.page}>
        <SmpteStrip />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text style={pdf.brand}>FRAME</Text>
            <Text style={pdf.docTitle}>Shot List</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={pdf.projectTitle}>{project.title}</Text>
            {project.client ? <Text style={{ color: "#555" }}>{project.client}</Text> : null}
          </View>
        </View>

        {acts.map((act) => (
          <View key={act.number} style={pdf.section}>
            <Text style={pdf.sectionTitle}>
              Act {act.number}
              {act.title ? ` — ${act.title}` : ""}
            </Text>
            {act.scenes.map((scene) => (
              <View key={scene.number} style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: "row", gap: 10, paddingVertical: 3, backgroundColor: "#F2F2F2", paddingHorizontal: 4 }}>
                  <Text style={[pdf.mono, { fontFamily: "Courier-Bold" }]}>SC {scene.number}</Text>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{scene.title}</Text>
                  <Text style={{ color: "#666" }}>
                    {scene.location?.name ?? "No location"} · {scene.daylight}
                  </Text>
                </View>
                <View style={pdf.headRow}>
                  <Text style={[pdf.th, { width: "7%" }]}>Shot</Text>
                  <Text style={[pdf.th, { width: "6%" }]}>Size</Text>
                  <Text style={[pdf.th, { width: "8%" }]}>Lens</Text>
                  <Text style={[pdf.th, { width: "12%" }]}>Movement</Text>
                  <Text style={[pdf.th, { width: "27%" }]}>Description</Text>
                  <Text style={[pdf.th, { width: "14%" }]}>Talent</Text>
                  <Text style={[pdf.th, { width: "13%" }]}>Equipment</Text>
                  <Text style={[pdf.th, { width: "6%" }]}>Est.</Text>
                  <Text style={[pdf.th, { width: "7%" }]}>Status</Text>
                </View>
                {scene.shots.map((shot) => (
                  <View key={shot.shotNumber} style={pdf.row} wrap={false}>
                    <Text style={[pdf.mono, { width: "7%", fontFamily: "Courier-Bold" }]}>{shot.shotNumber}</Text>
                    <Text style={[pdf.mono, { width: "6%" }]}>{shot.frameSize ?? "—"}</Text>
                    <Text style={[pdf.mono, { width: "8%" }]}>{shot.lensSize ?? "—"}</Text>
                    <Text style={{ width: "12%" }}>{shot.cameraMovements.join(", ") || "—"}</Text>
                    <Text style={{ width: "27%", paddingRight: 6 }}>
                      {richTextToPlain(shot.description) || shot.shotName}
                    </Text>
                    <Text style={{ width: "14%" }}>{shot.people.map((p) => p.person.name).join(", ") || "—"}</Text>
                    <Text style={{ width: "13%" }}>{shot.equipment.map((e) => e.equipment.name).join(", ") || "—"}</Text>
                    <Text style={[pdf.mono, { width: "6%" }]}>
                      {shot.estimatedDuration ? `${shot.estimatedDuration}s` : "—"}
                    </Text>
                    <Text style={[pdf.mono, { width: "7%", fontSize: 7 }]}>{shot.status.replace("_", " ")}</Text>
                  </View>
                ))}
              </View>
            ))}
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
