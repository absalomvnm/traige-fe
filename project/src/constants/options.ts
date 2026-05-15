import type { SelectOption } from "../types";

export const STATUS_OPTIONS: SelectOption[] = [
  { v: "Pending transfer", lb: "Pending transfer" },
  { v: "Awaiting urgent review", lb: "Awaiting urgent review" },
  { v: "Awaiting reassessment", lb: "Awaiting reassessment" },
  { v: "Monitoring in waiting area", lb: "Monitoring in waiting area" },
  { v: "Transferred to labour suite", lb: "Transferred to labour suite" },
  { v: "Under medical review", lb: "Under medical review" },
];

export const LOCATION_OPTIONS: SelectOption[] = [
  { v: "Triage room", lb: "Triage room" },
  { v: "Labour suite", lb: "Labour suite" },
  { v: "Waiting area", lb: "Waiting area" },
  { v: "High care", lb: "High care" },
  { v: "Theatre", lb: "Theatre" },
];

export const OUTCOME_OPTIONS: SelectOption[] = [
  { v: "Awaiting clinical outcome", lb: "Awaiting clinical outcome" },
  { v: "Admitted to labour suite", lb: "Admitted to labour suite" },
  { v: "Emergency caesarean section", lb: "Emergency caesarean section" },
  { v: "Vaginal delivery", lb: "Vaginal delivery" },
  { v: "Transferred to higher level care", lb: "Transferred to higher level care" },
  { v: "Discharged home", lb: "Discharged home" },
];

export const STEPS = [
  "Demographics",
  "Signs & Symptoms",
  "Foetal Monitoring",
  "Vaginal Exam",
  "Risk Factors",
];

export const NAV_TABS = [
  { icon: "home", label: "Home", screen: "welcome" as const },
  { icon: "stethoscope", label: "Triage", screen: "triage" as const },
  { icon: "clipboard", label: "Patients", screen: "patients" as const },
  { icon: "siren", label: "Alerts", screen: "alerts" as const },
];
