import { Document, Page, Text, View } from "@react-pdf/renderer"
import { pdf, SMPTE_PRINT } from "./theme.js"

// Generic tabular list — powers Props List and Equipment List PDFs (§1.6).

export interface ListData {
  project: { title: string; client: string | null }
  docTitle: string
  columns: { label: string; width: string }[]
  rows: string[][]
}

const SmpteStrip = () => (
  <View style={pdf.headerBar}>
    {SMPTE_PRINT.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)}
  </View>
)

export function SimpleListDocument({ project, docTitle, columns, rows }: ListData) {
  return (
    <Document title={`${docTitle} — ${project.title}`}>
      <Page size="A4" style={pdf.page}>
        <SmpteStrip />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text style={pdf.brand}>FRAME</Text>
            <Text style={pdf.docTitle}>{docTitle}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={pdf.projectTitle}>{project.title}</Text>
            {project.client ? <Text style={{ color: "#555" }}>{project.client}</Text> : null}
          </View>
        </View>

        <View style={[pdf.headRow, { marginTop: 14 }]}>
          {columns.map((c) => (
            <Text key={c.label} style={[pdf.th, { width: c.width }]}>{c.label}</Text>
          ))}
        </View>
        {rows.map((row, i) => (
          <View key={i} style={pdf.row} wrap={false}>
            {row.map((cell, j) => (
              <Text key={j} style={[j === 0 ? { fontFamily: "Helvetica-Bold" } : {}, { width: columns[j]?.width ?? "auto", paddingRight: 6 }]}>
                {cell || "—"}
              </Text>
            ))}
          </View>
        ))}
        {rows.length === 0 ? (
          <Text style={{ fontSize: 9, color: "#999", paddingVertical: 8 }}>No entries.</Text>
        ) : null}

        <View style={pdf.footer} fixed>
          <Text>Generated with FRAME — Production Management</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
