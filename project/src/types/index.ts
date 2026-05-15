export interface Patient {
  id: number | string;
  name: string;
  surname: string;
  n: string;
  age: number;
  ga: number;
  gravida: string;
  para: string;
  p: number;
  t: string;
  cond: string;
  condKey: string;
  condKeys?: string[];
  bp: string;
  hr: number | string;
  rr: number | string;
  spo: number | string;
  temp: string;
  fhr: number | string;
  fmov: string;
  cx: number | string;
  ctg: string;
  vitalSignsNotes?: string;
  status: string;
  location: string;
  reassessDue: string;
  acknowledged: boolean;
  handover: string;
  outcome: string;
  outcomeNotes: string;
  managementChecklist: boolean[];
  timeline: TimelineEvent[];
  inQueue?: boolean;
  [key: string]: any;
}

export interface TimelineEvent {
  time: string;
  title: string;
  detail: string;
  tone: string;
}

export interface VitalAlert {
  priority: number;
  text: string;
}

export interface SelectOption {
  v: string;
  lb: string;
}

export interface ConditionOption {
  v: string;
  lb: string;
}

export interface RiskFactor {
  k: string;
  l: string;
}

export interface AssessmentForm {
  id?: number | string;
  name: string;
  surname: string;
  idNumber: string;
  age: string;
  gestAge: string;
  gravida: string;
  para: string;
  condKeys: string[];
  cond: string;
  condKey: string;
  bpS: string;
  bpD: string;
  hr: string;
  rr: string;
  spo: string;
  temp: string;
  fhr: string;
  fmov: string;
  cx: string;
  ctg: string;
  vaginalNotes?: string;
  vitalSignsNotes: string;
  cell?: string;
  customSymptoms?: string[];
  [key: string]: any;
}

export interface AssessmentResult extends AssessmentForm {
  priority: number;
  sourcePatientId?: number | string;
}

export interface DecisionSummary {
  triggeredRules: { priority: number; text: string }[];
  riskHits: string[];
  dataUsed: [string, string][];
  missingInputs: string[];
  shiftHints: string[];
}

export interface StatusBundle {
  status: string;
  location: string;
  reassessDue: string;
}

export type ScreenName =
  | "splash"
  | "register"
  | "welcome"
  | "triage"
  | "result"
  | "patients"
  | "patient-detail"
  | "alerts"
  | "about";

export type AppAction =
  | { type: "SET_SCREEN"; screen: ScreenName }
  | { type: "SET_RESULT"; result: AssessmentResult | null }
  | { type: "SET_SELECTED_PATIENT"; patient: Patient | null }
  | { type: "SET_PATIENTS"; patients: Patient[] }
  | { type: "UPDATE_PATIENT"; patient: Patient }
  | { type: "ADD_PATIENT"; patient: Patient }
  | { type: "SET_TRIAGE_DRAFT"; draft: any }
  | { type: "INCREMENT_TRIAGE_VERSION" }
  | { type: "SET_SEARCH_OPEN"; open: boolean };

export interface AppState {
  screen: ScreenName;
  result: AssessmentResult | null;
  selectedPatient: Patient | null;
  patients: Patient[];
  triageDraft: any;
  triageVersion: number;
  searchOpen: boolean;
}
