import { StyleSheet } from "@react-pdf/renderer"

// Print documents are light — the SMPTE dark theme belongs to the app UI.
// Structure and hierarchy carry over: mono for production data, tight rules.

export const pdf = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111",
  },
  headerBar: {
    flexDirection: "row",
    height: 4,
    marginBottom: 14,
  },
  brand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    letterSpacing: 4,
  },
  docTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#555",
  },
  projectTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
    color: "#444",
  },
  mono: {
    fontFamily: "Courier",
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#666",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingBottom: 3,
    marginBottom: 5,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#CCC",
    paddingVertical: 3.5,
    alignItems: "flex-start",
  },
  headRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingVertical: 3,
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#555",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#999",
  },
})

// Muted print versions of the SMPTE bar for the header strip.
export const SMPTE_PRINT = ["#B5B5B5", "#C9A400", "#00A8B0", "#00963E", "#A0008A", "#C22824", "#1D48C2"]
