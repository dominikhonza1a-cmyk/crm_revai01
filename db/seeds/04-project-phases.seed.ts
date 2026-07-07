/**
 * Referenční sady fází (kopírují se do ProjectPhase při instanciaci projektu — snapshot).
 * On-hold NENÍ fáze (je to status projektu).
 */
export const oneOffPhases = [
  { key: "kickoff", name: "Kickoff", position: 1 },
  { key: "discovery", name: "Discovery", position: 2 },
  { key: "build", name: "Build", position: 3 },
  { key: "test_uat", name: "Test / UAT", position: 4 },
  { key: "deploy", name: "Deploy", position: 5 },
  { key: "hypercare", name: "Hypercare", position: 6 },
  { key: "closed", name: "Closed", position: 7 },
] as const;

export const retainerPhases = [
  { key: "kickoff", name: "Kickoff", position: 1 },
  { key: "ongoing", name: "Ongoing", position: 2 },
  { key: "closed", name: "Closed", position: 3 },
] as const;
