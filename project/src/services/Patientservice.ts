import { PATIENT_API_BASE_URL } from "../config/env";

const BASE_URL = PATIENT_API_BASE_URL;

/** Prefix relative API asset paths (e.g. "/patient-files/1/ctg-scans/1/image") with the API origin
 *  so the browser doesn't try to load them from the Vite dev server. */
export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Fetch an image from an authenticated API endpoint and return an object-URL
 * that can be used directly in <img src>. The caller is responsible for
 * revoking the URL when the component unmounts (URL.revokeObjectURL).
 *
 * Falls back gracefully: if the fetch fails (404, 401, network) returns null.
 */
export async function fetchImageAsBlobUrl(absoluteUrl: string): Promise<string | null> {
  const token = localStorage.getItem("obsa.auth.token");
  try {
    const res = await fetch(absoluteUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// ─── Core fetcher ─────────────────────────────────────────────────────────────

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  token?: string,
  options?: { silentStatuses?: number[] },
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  // Fall back to localStorage token so callers don't need to thread it explicitly.
  const effectiveToken = token ?? localStorage.getItem("obsa.auth.token") ?? undefined;
  console.log(`[PATIENT API] ${method} ${path}`, { hasAuth: !!effectiveToken, body: body ?? "(no body)" });

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const message = await res.text();
    const isSilent = options?.silentStatuses?.includes(res.status);
    if (isSilent) {
      console.log(`[PATIENT API] ${method} ${path} returned ${res.status} (expected, silent)`);
    } else {
      console.error(`[PATIENT API] ${method} ${path} failed (${res.status})`, message);
    }
    const err = new Error(`[${res.status}] ${path} — ${message}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const result = contentType.includes("application/json")
    ? await res.json()
    : await res.text() || undefined;

  console.log(`[PATIENT API] ${method} ${path} succeeded (${res.status})`);
  return result as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

// Patients
export interface CreatePatientPayload {
  name: string;
  surname: string;
  id_number: string;
  contact: string;
  dob?: string;
  gestational_age_weeks?: number;
  gravida?: number;
  para?: number;
}

export interface PatientResponse {
  id: number;
  patientFileId: number;
  name: string;
  surname: string;
  id_number: string;
  contact: string;
  gestational_age_weeks?: number;
  gravida?: number;
  para?: number;
  createdAt?: string;
}

export interface PatientListItem {
  id: number;
  patientFileId: number;
  name: string;
  surname: string;
  latestAssessment?: {
    id: number;
    priority: number;
    status: string;
    condition: string;
    assessedAt: string;
    acknowledged: boolean;
  };
}

export interface PatientSummary extends PatientResponse {
  latestAssessment?: AssessmentResponse;
  notes?: NoteResponse[];
  ctgScans?: CtgScanResponse[];
  timeline?: TimelineEntry[];
  assessmentHistory?: { id: number; priority: number; assessedAt: string }[];
}

// File Entries
export interface CreateFileEntryPayload {
  patientFileId: number;
  recordedByUserId: number;
  category: "obstetric_history" | "urinalysis" | "risk_factors" | string;
  fieldKey: string;
  fieldValue: string;
}

// Signs & Symptoms
export interface SignsSymptoms {
  proteinuria_2plus?: boolean;
  fitting_seizures?: boolean;
  generalized_oedema?: boolean;
  visual_disturbances?: boolean;
  epigastric_pain?: boolean;
  active_vaginal_bleeding?: boolean;
  prolapse_cord?: boolean;
  ruptured_membranes?: boolean;
  stridor?: boolean;
  cervical_shortening?: boolean;
  altered_mental_status?: boolean;
  diffuse_crackles?: boolean;
  glycosuria?: boolean;
  mild_regular_contractions?: boolean;
  moderate_regular_contractions?: boolean;
  severe_regular_contractions?: boolean;
  irregular_contractions?: boolean;
}

export interface Vitals {
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  heart_rate?: number | null;
  respiration_rate?: number | null;
  spo2?: number | null;
  /** Body temperature in °C (spec field name: `temp`). */
  temp?: number | null;
  pregnant?: boolean;
  notes?: string;
}

export interface FoetalMonitoring {
  foetal_heart_rate?: number | null;
  foetal_movement?: "present" | "decreased" | "absent";
  ctg_notes?: string;
}

export interface VaginalExam {
  cervical_dilation?: number;
  vaginal_bleeding?: boolean;
  cord_prolapse?: boolean;
  examination_notes?: string;
}

export interface RiskFactors {
  previous_caesarean?:    boolean;
  chronic_hypertension?:  boolean;
  diabetes_mellitus?:     boolean;
  grand_multiparity?:     boolean;
  advanced_maternal_age?: boolean;
  multiple_pregnancy?:    boolean;
  rhesus_incompatibility?:boolean;
  hiv_positive?:          boolean;
  severe_anaemia?:        boolean;
  previous_pph?:          boolean;
}

// Assessments
export interface CreateAssessmentPayload {
  patientId: number;
  patientFileId?: number;
  userId: number;
  gestationWeeks?: number;
  status: "in_progress" | "completed";
  signsSymptoms?: SignsSymptoms;
  vitals?: Vitals;
  foetalMonitoring?: FoetalMonitoring;
  vaginalExam?: VaginalExam;
  riskFactors?: RiskFactors;
  urinaryAnalysis?: { protein?: string; leukocytes?: string; haematuria?: string; blood?: string; nitrite?: string; glucose?: string; sg?: string; bilirubin?: string; pH?: string };
}

export interface ChecklistItem {
  id: number;
  item: string;
  completed: boolean;
  templateId?: number;
  stepOrder?: number;
}

export interface AssessmentAlert {
  id: number;
  assessmentId?: number;
  patientId?: number;
  patientName?: string;
  priority: number;
  finalPriorityId?: number | null;
  obstetric_condition_code?: string | null;
  type?: string;
  condition?: string;
  message?: string;
  status?: string;
  triggeredAt?: string;
  createdAt?: string;
  acknowledged: boolean;
  acknowledgedByUserId?: number | null;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  resolved?: boolean;
  resolvedAt?: string | null;
}

export interface CreateAlertPayload {
  assessmentId: number;
  type: string;
  priority: number;
  message: string;
  status: string;
}

export interface TriggeredRule {
  ruleId: string;
  ruleName: string;
  priority: string | number;
  action: string;
}

/**
 * One entry of {@link AiTriageSnapshot.topConditions}. The backend resolves
 * the condition code against the catalog and emits both the enum-style
 * {@code code} and a human-readable {@code name}.
 */
export interface AiTriageTopCondition {
  code: string;
  name?: string;
  probability?: number | null;
  /** Default priority id for this condition in the catalog (1 = P1). */
  defaultPriorityId?: number;
}

/**
 * Parsed AI classifier response persisted on the assessment. Surfaced by the
 * patient summary endpoint as {@code latestAssessment.aiTriage} so the UI
 * never has to parse the raw {@code aiConditionsJson} blob.
 */
export interface AiTriageSnapshot {
  priority?: string;
  condition?: string;
  conditionName?: string;
  priorityConfidence?: number | null;
  conditionConfidence?: number | null;
  priorityProbabilities?: Record<string, number>;
  topConditions?: AiTriageTopCondition[];
}

/**
 * Top-level primary condition exposed on the patient summary — derived
 * from the most urgent persisted {@link ObstetricConditionResult}.
 */
export interface PrimaryCondition {
  code?: string;
  name?: string;
  source?: "AI" | "RULE" | "MANUAL";
  probability?: number | null;
}

export interface AssessmentResponse {
  id: number;
  assessmentId?: number;
  patientId: number;
  patientFileId?: number;
  userId?: number;
  priority: number;
  /** Catalog-driven final priority (rule + AI merged). Prefer over legacy `priority`. */
  finalPriorityId?: number;
  rulePriorityId?: number | null;
  aiPriorityId?: number | null;
  aiPriorityConfidence?: number | null;
  aiInvokedAt?: string | null;
  /** "P1".."P4" derived from aiPriorityId. */
  aiPriorityCode?: string | null;
  /** Which engine actually drove the final priority for this run. */
  triageSource?: "AI" | "RULE" | "AI+RULE" | "UNKNOWN";
  /** Configured triage mode (AI | RULE | BOTH). */
  triageMode?: "AI" | "RULE" | "BOTH";
  /** Whether the AI classifier was enabled when this assessment was scored. */
  aiEnabled?: boolean;
  /** Structured snapshot of the persisted AI response. */
  aiTriage?: AiTriageSnapshot;
  /** Most urgent persisted obstetric condition (resolved name + source). */
  primaryCondition?: PrimaryCondition;
  obstetricConditions?: ObstetricConditionResult[];
  priorityColor?: string;
  status: string;
  triggered?: boolean;
  location?: string;
  outcome?: string | null;
  outcomeNotes?: string | null;
  reassessDue?: string;
  assessedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  timelineEventId?: number;
  signsSymptoms?: SignsSymptoms | string;
  vitals?: Vitals | string;
  foetalMonitoring?: FoetalMonitoring | string;
  vaginalExam?: VaginalExam | string;
  riskFactors?: RiskFactors | string;
  triggeredRules?: TriggeredRule[];
  managementChecklist?: ChecklistItem[];
  alerts?: AssessmentAlert[];
  actions?: string[];
  message?: string;
  doctorAcknowledgment?: DoctorSignature | null;
  dischargeAuthorization?: DoctorSignature | null;
}

export interface EvaluatePayload {
  signsSymptoms?: SignsSymptoms;
  vitals?: Vitals;
  foetalMonitoring?: FoetalMonitoring;
  vaginalExam?: VaginalExam;
  riskFactors?: RiskFactors;
}

export interface EvaluateResponse {
  priority: number;
  priorityColor: string;
  tone: string;
  triggered: boolean;
  riskHits: string[];
  missingInputs: string[];
  shiftHints: string[];
  actions: string[];
  triggeredRules: TriggeredRule[];
  message: string;
}

// ─── Catalog types (read-only, seeded on boot) ────────────────────────────────

export interface CatalogPriority {
  id: number;
  label: string;
  colorCode: string;
  targetTime?: string;
  description?: string;
}

export interface CatalogSymptom {
  id: number;
  name: string;
  aiFeatureKey: string;
  dataType: "BOOLEAN" | "NUMBER" | "ENUM";
  enumValues?: string[];
  section?: string;
}

export interface CatalogPresentingCondition {
  id: number;
  name: string;
  code: string;
}

export interface CatalogObstetricCondition {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface ObstetricConditionResult {
  obstetricConditionId: number;
  /** Inline name from backend response (may differ from catalog name) */
  name?: string;
  /** Inline catalog code */
  code?: string;
  probability: number | null;
  source: "AI" | "RULE" | "MANUAL";
  priorityIdAtCapture: number;
}

export interface ManagementProcedure {
  id: number;
  templateId?: number;
  stepOrder: number;
  // title may arrive under several field names depending on backend version
  title?: string;
  name?: string;         // alias for title
  step?: string;         // alias for title
  action?: string;       // alias for title
  label?: string;        // alias for title
  description?: string;
  instructions?: string; // alias for description
  conditionId?: number;
  condition_id?: number;
  priorityId?: number;
  priority_id?: number;
}

/** Response shape for real-time section endpoints and POST /assessments/{id}/section */
export interface SectionResponse {
  assessmentId: number;
  patientId: number;
  section?: string;
  sectionData?: unknown;
  status: string;
  priority: number;
  priorityColor: string;
  triggered: boolean;
  actions: string[];
  triggeredRules: TriggeredRule[];
  message: string;
  newAlerts?: AssessmentAlert[];
  alerts?: AssessmentAlert[];
  managementChecklist?: ChecklistItem[];
  sectionPriority?: number;
  sectionPriorityColor?: string;
  overallPriority?: number;
  overallPriorityColor?: string;
  currentSections?: Record<string, string | null>;
}

export interface FinalizePayload {
  outcome?: string;
  status?: string;
}

export interface SectionSubmitPayload {
  patientId: number;
  userId: number;
  signsSymptoms?: SignsSymptoms;
  vitals?: Vitals;
  foetalMonitoring?: FoetalMonitoring;
  vaginalExam?: VaginalExam;
  riskFactors?: RiskFactors;
}

// Disposition
export interface DispositionPayload {
  status?: string;
  location?: string;
  outcome?: string;
  outcomeNotes?: string;
  reassessDue?: string;
  doctorAcknowledgment?: DoctorSignature | null;
  dischargeAuthorization?: DoctorSignature | null;
}

export interface DoctorSignature {
  doctorName?: string;
  hpcsaNumber?: string;
  /** New spec field: data URL of the signature image. */
  signature?: string;
  /** ISO timestamp of the signing event. */
  signedAt?: string;
  /** Priority label of the assessment when signed (e.g. "P1"). */
  assessmentPriority?: string | number;
  /** @deprecated legacy field, kept for backward compatibility */
  signatureData?: string;
  acknowledgedBy?: string;
  /** @deprecated use `signedAt` */
  acknowledgedAt?: string;
  notes?: string;
}

/** POST /assessments/:id/doctor-acknowledgment body */
export interface DoctorAcknowledgmentPayload {
  doctorName: string;
  hpcsaNumber: string;
  signature: string;
  /** Priority label, e.g. "P1". */
  assessmentPriority: string;
}

/** GET /assessments/:id/doctor-acknowledgment response */
export interface DoctorAcknowledgmentResponse {
  doctorName?: string;
  hpcsaNumber?: string;
  signature?: string;
  assessmentPriority?: string;
  signedAt?: string;
}

/** POST /assessments/:id/discharge-authorization body */
export interface DischargeAuthorizationPayload {
  doctorName: string;
  hpcsaNumber: string;
  signature: string;
  dischargeReason: string;
}

/** GET /assessments/:id/discharge-authorization response */
export interface DischargeAuthorizationResponse {
  doctorName?: string;
  hpcsaNumber?: string;
  signature?: string;
  dischargeReason?: string;
  signedAt?: string;
}

// Patient Files
export interface PatientFileResponse {
  id: number;
  patientId: number;
  createdAt: string;
  updatedAt: string;
  notes?: NoteResponse[];
  assessments?: AssessmentResponse[];
}

export interface PatientFilePayload {
  patientId: number;
  createdAt?: string;
  updatedAt?: string;
}

// File Entry
export interface FileEntryResponse {
  id: number;
  patientFileId: number;
  recordedByUserId: number;
  recordedAt: string;
  category: string;
  fieldKey: string;
  fieldValue: string;
  active: boolean;
  sourceAssessmentId?: number | null;
}

export interface UpdateFileEntryPayload {
  recordedByUserId?: number;
  fieldValue?: string;
}

// Assessment Conditions / Symptoms
export interface AssessmentCondition {
  id: number;
  assessmentId: number;
  conditionId: number;
}

export interface AssessmentSymptom {
  id: number;
  assessmentId: number;
  symptomId: number;
}

// Notes
export type NoteType = "vital_signs" | "ctg_monitoring" | "handover" | "outcome_progress";

export interface CreateNotePayload {
  patientFileId: number;
  content: string;
  userId: number;
  noteType: NoteType;
}

export interface UpdateNotePayload {
  content?: string;
  noteType?: NoteType;
  userId: number;
}

export interface NoteResponse {
  id: number;
  patientFileId: number;
  content: string;
  userId?: number;
  /** Some backends still return the original creator's display name. */
  addedBy?: string;
  noteType: NoteType;
  createdAt: string;
  updatedAt?: string;
}

// CTG Scans
export interface CtgScanResponse {
  id: number;
  patientFileId: number;
  fileName: string;
  /** MIME type returned by the backend, e.g. "image/jpeg". */
  contentType?: string;
  /** Relative URL to stream the bytes, e.g. "/patient-files/1/ctg-scans/1/image". */
  fileUrl: string;
  comment?: string;
  /** User id of the uploader (spec: numeric). */
  uploadedBy: number | string;
  uploadedAt: string;
  /** Backend-reported file health: "ok" | "missing" (file row exists but bytes are gone). */
  fileStatus?: "ok" | "missing" | string;
}

// Timeline (for PatientSummary)
export interface TimelineEntry {
  id?: number;
  title: string;
  detail: string;
  tone: string;
  time: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const patientService = {

  // ── Patients ──────────────────────────────────────────────────────────────

  /** POST /patients — create patient from Step 1 demographics */
  createPatient: (payload: CreatePatientPayload): Promise<PatientResponse> =>
    request<PatientResponse>("POST", "/patients", payload),

  /** POST /assessments/demographics — persist full demographics against an assessment */
  submitDemographics: (payload: {
    patientId: number;
    userId?: number;
    name: string;
    surname: string;
    contact?: string;
    id_number?: string;
    gestational_age_weeks?: number;
    gravida?: number;
    para?: number;
  }): Promise<SectionResponse> =>
    request<SectionResponse>("POST", "/assessments/demographics", payload),

  /** GET /patients — triage queue list with latest assessment */
  getAllPatients: (): Promise<PatientListItem[]> =>
    request<PatientListItem[]>("GET", "/patients"),

  /** GET /patients/:id — single patient demographics */
  getPatient: (id: number): Promise<PatientResponse> =>
    request<PatientResponse>("GET", `/patients/${id}`),

  /** GET /patients/:id/summary — full denormalized view for PatientDetailsScreen */
  getPatientSummary: (id: number): Promise<PatientSummary> =>
    request<PatientSummary>("GET", `/patients/${id}/summary`),

  /** PUT /patients/:id — update demographic fields */
  updatePatient: (id: number, payload: Partial<CreatePatientPayload>): Promise<PatientResponse> =>
    request<PatientResponse>("PUT", `/patients/${id}`, payload),

  /** DELETE /patients/:id */
  deletePatient: (id: number): Promise<void> =>
    request<void>("DELETE", `/patients/${id}`),

  // ── Patient File Entries ───────────────────────────────────────────────────

  /** POST /patient-file-entries — persist obstetric history, urinalysis, risk factors */
  createFileEntry: (payload: CreateFileEntryPayload): Promise<FileEntryResponse> =>
    request<FileEntryResponse>("POST", "/patient-file-entries", payload),

  /** GET /patient-file-entries */
  getAllFileEntries: (): Promise<FileEntryResponse[]> =>
    request<FileEntryResponse[]>("GET", "/patient-file-entries"),

  /** GET /patient-file-entries/by-file/:patientFileId */
  getFileEntries: (patientFileId: number): Promise<FileEntryResponse[]> =>
    request<FileEntryResponse[]>("GET", `/patient-file-entries/by-file/${patientFileId}`),

  /** GET /patient-file-entries/{id} */
  getFileEntry: (id: number): Promise<FileEntryResponse> =>
    request<FileEntryResponse>("GET", `/patient-file-entries/${id}`),

  /** GET /patient-file-entries/by-file/:patientFileId/category/:category */
  getFileEntriesByCategory: (patientFileId: number, category: string): Promise<FileEntryResponse[]> =>
    request<FileEntryResponse[]>("GET", `/patient-file-entries/by-file/${patientFileId}/category/${category}`),

  /** PUT /patient-file-entries/:id */
  updateFileEntry: (id: number, payload: UpdateFileEntryPayload): Promise<FileEntryResponse> =>
    request<FileEntryResponse>("PUT", `/patient-file-entries/${id}`, payload),

  /** DELETE /patient-file-entries/:id */
  deleteFileEntry: (id: number): Promise<{ message: string; id: number }> =>
    request<{ message: string; id: number }>("DELETE", `/patient-file-entries/${id}`),

  // ── Patient Files ──────────────────────────────────────────────────────────

  /** GET /patient-files */
  getAllPatientFiles: (): Promise<PatientFileResponse[]> =>
    request<PatientFileResponse[]>("GET", "/patient-files"),

  /** GET /patient-files/:id */
  getPatientFile: (id: number): Promise<PatientFileResponse> =>
    request<PatientFileResponse>("GET", `/patient-files/${id}`),

  /** POST /patient-files */
  createPatientFile: (payload: PatientFilePayload): Promise<PatientFileResponse> =>
    request<PatientFileResponse>("POST", "/patient-files", payload),

  /** PUT /patient-files/:id */
  updatePatientFile: (id: number, payload: Record<string, unknown>): Promise<PatientFileResponse> =>
    request<PatientFileResponse>("PUT", `/patient-files/${id}`, payload),

  /** DELETE /patient-files/:id */
  deletePatientFile: (id: number): Promise<void> =>
    request<void>("DELETE", `/patient-files/${id}`),

  // ── Assessments ───────────────────────────────────────────────────────────

  /** POST /assessments/evaluate — dry-run priority calculation, no persistence */
  evaluate: (payload: EvaluatePayload): Promise<EvaluateResponse> =>
    request<EvaluateResponse>("POST", "/assessments/evaluate", payload),

  /** POST /assessments — create and persist full assessment */
  createAssessment: (payload: CreateAssessmentPayload): Promise<AssessmentResponse> =>
    request<AssessmentResponse>("POST", "/assessments", payload),

  /** GET /assessments — raw assessment entity list */
  getAllAssessments: (): Promise<AssessmentResponse[]> =>
    request<AssessmentResponse[]>("GET", "/assessments"),

  /** GET /assessments/:id */
  getAssessment: (id: number): Promise<AssessmentResponse> =>
    request<AssessmentResponse>("GET", `/assessments/${id}`),

  /** GET /assessments/by-patient/:patientId */
  getAssessmentsByPatient: (patientId: number): Promise<AssessmentResponse[]> =>
    request<AssessmentResponse[]>("GET", `/assessments/by-patient/${patientId}`),

  /** POST /assessments/:id/section — update one or more sections, triggers rule evaluation */
  updateAssessmentSection: (
    id: number,
    payload: Partial<Pick<SectionSubmitPayload, "signsSymptoms" | "vitals" | "foetalMonitoring" | "vaginalExam" | "riskFactors">>
  ): Promise<SectionResponse> =>
    request<SectionResponse>("POST", `/assessments/${id}/section`, payload),

  /** POST /assessments/section/submit — submit multiple sections together */
  submitSections: (payload: SectionSubmitPayload): Promise<SectionResponse> =>
    request<SectionResponse>("POST", "/assessments/section/submit", payload),

  /** POST /assessments/:id/finalize — lock assessment with outcome */
  finalizeAssessment: (id: number, payload: FinalizePayload): Promise<AssessmentResponse> =>
    request<AssessmentResponse>("POST", `/assessments/${id}/finalize`, payload),

  /** PUT /assessments/:id/disposition — update status, location, outcome, signatures */
  updateDisposition: (id: number, payload: DispositionPayload): Promise<AssessmentResponse> =>
    request<AssessmentResponse>("PUT", `/assessments/${id}/disposition`, payload),

  /** POST /assessments/:id/doctor-acknowledgment — doctor signs off on triage decision */
  submitDoctorAcknowledgment: (id: number, payload: DoctorAcknowledgmentPayload): Promise<AssessmentResponse> =>
    request<AssessmentResponse>("POST", `/assessments/${id}/doctor-acknowledgment`, payload),

  /** GET /assessments/:id/doctor-acknowledgment — retrieve persisted acknowledgment (if any) */
  getDoctorAcknowledgment: (id: number): Promise<DoctorAcknowledgmentResponse> =>
    request<DoctorAcknowledgmentResponse>("GET", `/assessments/${id}/doctor-acknowledgment`, undefined, undefined, { silentStatuses: [404] }),

  /** POST /assessments/:id/discharge-authorization — doctor authorizes discharge home */
  submitDischargeAuthorization: (id: number, payload: DischargeAuthorizationPayload): Promise<AssessmentResponse> =>
    request<AssessmentResponse>("POST", `/assessments/${id}/discharge-authorization`, payload),

  /** GET /assessments/:id/discharge-authorization — retrieve persisted authorization (if any) */
  getDischargeAuthorization: (id: number): Promise<DischargeAuthorizationResponse> =>
    request<DischargeAuthorizationResponse>("GET", `/assessments/${id}/discharge-authorization`, undefined, undefined, { silentStatuses: [404] }),

  // ── Real-time section endpoints (called during each triage step) ──────────

  /**
   * POST /assessments/{id}/vitals
   *
   * The backend has been observed to accept the vitals fields either flat at the
   * payload root or nested under a `vitals` key (depending on environment / version).
   * To make persistence reliable across both shapes we include the flat fields AND
   * the nested envelope, plus `patientId` / `userId` (which other section endpoints
   * require). Backends that read flat will pick the root fields; backends that
   * expect `{ vitals: { ... } }` will pick the nested object.
   */
  submitVitals: (
    assessmentId: number,
    vitals: Vitals,
    extras?: { patientId?: number; userId?: number },
  ): Promise<SectionResponse> =>
    request<SectionResponse>("POST", `/assessments/${assessmentId}/vitals`, {
      ...(extras?.patientId !== undefined ? { patientId: extras.patientId } : {}),
      ...(extras?.userId !== undefined ? { userId: extras.userId } : {}),
      ...vitals,
      vitals,
    }),

  /** PUT /assessments/{id}/vitals — update existing vitals on re-triage (same dual shape) */
  updateVitals: (
    assessmentId: number,
    vitals: Vitals,
    extras?: { patientId?: number; userId?: number },
  ): Promise<SectionResponse> =>
    request<SectionResponse>("PUT", `/assessments/${assessmentId}/vitals`, {
      ...(extras?.patientId !== undefined ? { patientId: extras.patientId } : {}),
      ...(extras?.userId !== undefined ? { userId: extras.userId } : {}),
      ...vitals,
      vitals,
    }),

  /** POST /assessments/{id}/urinary-analysis — fire on Step 2 urinalysis entry */
  submitUrinaryAnalysis: (assessmentId: number, payload: { protein?: string; leukocytes?: string; haematuria?: string; blood?: string; nitrite?: string; glucose?: string; sg?: string; bilirubin?: string; pH?: string }): Promise<SectionResponse> =>
    request<SectionResponse>("POST", `/assessments/${assessmentId}/urinary-analysis`, payload),

  /** GET /assessments/{id}/urinary-analysis — load existing urinalysis for pre-population */
  getUrinaryAnalysis: (assessmentId: number): Promise<{ urinaryAnalysis: { protein?: string; leukocytes?: string; haematuria?: string; blood?: string; nitrite?: string; glucose?: string; sg?: string; bilirubin?: string; pH?: string } }> =>
    request("GET", `/assessments/${assessmentId}/urinary-analysis`),

  /** PUT /assessments/{id}/urinary-analysis — update existing urinalysis on re-triage */
  updateUrinaryAnalysis: (assessmentId: number, payload: { protein?: string; leukocytes?: string; haematuria?: string; blood?: string; nitrite?: string; glucose?: string; sg?: string; bilirubin?: string; pH?: string }): Promise<SectionResponse> =>
    request<SectionResponse>("PUT", `/assessments/${assessmentId}/urinary-analysis`, payload),

  /** POST /assessments/foetal — fire on Step 3 foetal monitoring entry */
  submitFoetal: (payload: { assessmentId?: number; patientId: number; userId?: number } & FoetalMonitoring): Promise<SectionResponse> =>
    request<SectionResponse>("POST", "/assessments/foetal", payload),

  /** POST /assessments/vaginal — fire on Step 4 vaginal exam entry */
  submitVaginal: (payload: { assessmentId?: number; patientId: number; userId?: number } & VaginalExam): Promise<SectionResponse> =>
    request<SectionResponse>("POST", "/assessments/vaginal", payload),

  /** POST /assessments/signs-symptoms — fire on Step 2 condition selection */
  submitSignsSymptoms: (payload: { assessmentId?: number; patientId: number; userId?: number } & SignsSymptoms): Promise<SectionResponse> =>
    request<SectionResponse>("POST", "/assessments/signs-symptoms", payload),

  /** POST /assessments/{id}/risk-factors — fire on Step 5 risk factor toggles */
  submitRiskFactors: (
    assessmentId: number,
    payload: { riskFactors: RiskFactors; patientId?: number; userId?: number },
  ): Promise<SectionResponse> =>
    request<SectionResponse>("POST", `/assessments/${assessmentId}/risk-factors`, payload),

  /** POST /assessments/urinary-analysis — inline section submission with rule evaluation (no assessment id in path) */
  submitInlineUrinaryAnalysis: (
    payload: { patientId: number; userId?: number; protein?: string; leukocytes?: string; haematuria?: string;blood?: string; nitrite?: string; glucose?: string; sg?: string; bilirubin?: string; pH?: string },
  ): Promise<SectionResponse> =>
    request<SectionResponse>("POST", "/assessments/urinary-analysis", payload),

  // ── Assessment Alerts ─────────────────────────────────────────────────────

  /** POST /assessment-alerts — manually create an alert */
  createAlert: (payload: CreateAlertPayload): Promise<AssessmentAlert> =>
    request<AssessmentAlert>("POST", "/assessment-alerts", payload),

  /** GET /assessment-alerts — all active alerts (for AlertsScreen polling) */
  getAlerts: (): Promise<AssessmentAlert[]> =>
    request<AssessmentAlert[]>("GET", "/assessment-alerts"),

  /** GET /assessment-alerts/:id */
  getAlert: (id: number): Promise<AssessmentAlert> =>
    request<AssessmentAlert>("GET", `/assessment-alerts/${id}`),

  /** GET /assessment-alerts/by-assessment/:assessmentId */
  getAlertsByAssessment: (assessmentId: number): Promise<AssessmentAlert[]> =>
    request<AssessmentAlert[]>("GET", `/assessment-alerts/by-assessment/${assessmentId}`),

  /** PUT /assessment-alerts/:id/acknowledge */
  acknowledgeAlert: (id: number, userId: number): Promise<AssessmentAlert> =>
    request<AssessmentAlert>("PUT", `/assessment-alerts/${id}/acknowledge`, { userId: String(userId) }),

  /** PUT /assessment-alerts/:id/resolve */
  resolveAlert: (id: number): Promise<AssessmentAlert> =>
    request<AssessmentAlert>("PUT", `/assessment-alerts/${id}/resolve`),

  /** DELETE /assessment-alerts/:id */
  deleteAlert: (id: number): Promise<void> =>
    request<void>("DELETE", `/assessment-alerts/${id}`),

  // ── Assessment Conditions ─────────────────────────────────────────────────

  /** POST /assessment-conditions */
  createAssessmentCondition: (payload: { assessmentId: number; conditionId: number }): Promise<AssessmentCondition> =>
    request<AssessmentCondition>("POST", "/assessment-conditions", payload),

  /** GET /assessment-conditions */
  getAllAssessmentConditions: (): Promise<AssessmentCondition[]> =>
    request<AssessmentCondition[]>("GET", "/assessment-conditions"),

  /** GET /assessment-conditions/:id */
  getAssessmentCondition: (id: number): Promise<AssessmentCondition> =>
    request<AssessmentCondition>("GET", `/assessment-conditions/${id}`),

  /** GET /assessment-conditions/by-assessment/:assessmentId */
  getConditionsByAssessment: (assessmentId: number): Promise<AssessmentCondition[]> =>
    request<AssessmentCondition[]>("GET", `/assessment-conditions/by-assessment/${assessmentId}`),

  /** DELETE /assessment-conditions/:id */
  deleteAssessmentCondition: (id: number): Promise<void> =>
    request<void>("DELETE", `/assessment-conditions/${id}`),

  // ── Assessment Symptoms ───────────────────────────────────────────────────

  /** POST /assessment-symptoms */
  createAssessmentSymptom: (payload: { assessmentId: number; symptomId: number }): Promise<AssessmentSymptom> =>
    request<AssessmentSymptom>("POST", "/assessment-symptoms", payload),

  /** GET /assessment-symptoms */
  getAllAssessmentSymptoms: (): Promise<AssessmentSymptom[]> =>
    request<AssessmentSymptom[]>("GET", "/assessment-symptoms"),

  /** GET /assessment-symptoms/:id */
  getAssessmentSymptom: (id: number): Promise<AssessmentSymptom> =>
    request<AssessmentSymptom>("GET", `/assessment-symptoms/${id}`),

  /** GET /assessment-symptoms/by-assessment/:assessmentId */
  getSymptomsByAssessment: (assessmentId: number): Promise<AssessmentSymptom[]> =>
    request<AssessmentSymptom[]>("GET", `/assessment-symptoms/by-assessment/${assessmentId}`),

  /** DELETE /assessment-symptoms/:id */
  deleteAssessmentSymptom: (id: number): Promise<void> =>
    request<void>("DELETE", `/assessment-symptoms/${id}`),

  // ── Management Checklists ─────────────────────────────────────────────────

  /** POST /management-checklists */
  createChecklistItem: (payload: { assessmentId: number; item: string; completed?: boolean }): Promise<ChecklistItem> =>
    request<ChecklistItem>("POST", "/management-checklists", payload),

  /** GET /management-checklists */
  getAllChecklistItems: (): Promise<ChecklistItem[]> =>
    request<ChecklistItem[]>("GET", "/management-checklists"),

  /** GET /management-checklists/:id */
  getChecklistItem: (id: number): Promise<ChecklistItem> =>
    request<ChecklistItem>("GET", `/management-checklists/${id}`),

  /** GET /management-checklists/by-assessment/:assessmentId */
  getChecklist: (assessmentId: number): Promise<ChecklistItem[]> =>
    request<ChecklistItem[]>("GET", `/management-checklists/by-assessment/${assessmentId}`),

  /** PUT /management-checklists/:id/toggle */
  toggleChecklistItem: (id: number): Promise<ChecklistItem> =>
    request<ChecklistItem>("PUT", `/management-checklists/${id}/toggle`),

  /** DELETE /management-checklists/:id */
  deleteChecklistItem: (id: number): Promise<void> =>
    request<void>("DELETE", `/management-checklists/${id}`),

  // ── Notes ─────────────────────────────────────────────────────────────────

  /** POST /notes */
  createNote: (payload: CreateNotePayload): Promise<NoteResponse> =>
    request<NoteResponse>("POST", "/notes", payload),

  /** PUT /notes/:id — partial update; only sent fields are applied */
  updateNote: (id: number, payload: UpdateNotePayload): Promise<NoteResponse> =>
    request<NoteResponse>("PUT", `/notes/${id}`, payload),

  /** GET /notes */
  getAllNotes: (): Promise<NoteResponse[]> =>
    request<NoteResponse[]>("GET", "/notes"),

  /** GET /notes/:id */
  getNote: (id: number): Promise<NoteResponse> =>
    request<NoteResponse>("GET", `/notes/${id}`),

  /** GET /notes/by-file/:patientFileId  (optionally filtered by noteType) */
  getNotesByFile: (patientFileId: number, noteType?: NoteType): Promise<NoteResponse[]> => {
    const qs = noteType ? `?noteType=${encodeURIComponent(noteType)}` : "";
    return request<NoteResponse[]>("GET", `/notes/by-file/${patientFileId}${qs}`);
  },

  /** DELETE /notes/:id */
  deleteNote: (id: number): Promise<void> =>
    request<void>("DELETE", `/notes/${id}`),

  // ── Assessment Schema ─────────────────────────────────────────────────────

  /** GET /assessment-schema — full JSON attribute schema */
  getAssessmentSchema: (): Promise<unknown> =>
    request<unknown>("GET", "/assessment-schema"),

  /** GET /assessment-schema/:section — schema for a single section */
  getAssessmentSchemaSection: (section: string): Promise<unknown> =>
    request<unknown>("GET", `/assessment-schema/${section}`),

  // ── CTG Scan Uploads ──────────────────────────────────────────────────────

  /** POST /patient-files/:patientFileId/ctg-scans (multipart/form-data) */
  uploadCtgScan: async (patientFileId: number, file: File, comment: string, uploadedBy: number | string): Promise<CtgScanResponse> => {
    const url = `${BASE_URL}/patient-files/${patientFileId}/ctg-scans`;
    console.log(`[PATIENT API] POST /patient-files/${patientFileId}/ctg-scans`, { file: file.name, comment });

    const form = new FormData();
    form.append("file", file);
    form.append("comment", comment);
    form.append("uploadedBy", String(uploadedBy));

    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) {
      const message = await res.text();
      console.error(`[PATIENT API] CTG scan upload failed (${res.status})`, message);
      throw new Error(`[${res.status}] CTG scan upload — ${message}`);
    }
    console.log(`[PATIENT API] CTG scan uploaded (${res.status})`);
    return res.json() as Promise<CtgScanResponse>;
  },

  /** GET /patient-files/:patientFileId/ctg-scans */
  getCtgScans: (patientFileId: number): Promise<CtgScanResponse[]> =>
    request<CtgScanResponse[]>("GET", `/patient-files/${patientFileId}/ctg-scans`),

  /** DELETE /patient-files/:patientFileId/ctg-scans/:scanId */
  deleteCtgScan: (patientFileId: number, scanId: number): Promise<{ deleted: CtgScanResponse }> =>
    request<{ deleted: CtgScanResponse }>("DELETE", `/patient-files/${patientFileId}/ctg-scans/${scanId}`),

  /** GET /profile/report/{userId} — fetch profile stats for doctor/midwife */
  getProfileReport: (userId: number): Promise<{
    acknowledgementsApproved: number;
    triagedCount: number;
    notesAdded: number;
    checklistsCompleted: number;
    timelineEventsLogged: number;
  }> =>
    request("GET", `/profile/report/${userId}`),

  // ── Catalog endpoints (read-only, seeded on boot) ─────────────────────────

  /** GET /catalog/priorities */
  getCatalogPriorities: (): Promise<CatalogPriority[]> =>
    request<CatalogPriority[]>("GET", "/catalog/priorities"),

  /** GET /catalog/symptoms */
  getCatalogSymptoms: (): Promise<CatalogSymptom[]> =>
    request<CatalogSymptom[]>("GET", "/catalog/symptoms"),

  /** GET /catalog/presenting-conditions */
  getCatalogPresentingConditions: (): Promise<CatalogPresentingCondition[]> =>
    request<CatalogPresentingCondition[]>("GET", "/catalog/presenting-conditions"),

  /** GET /catalog/obstetric-conditions */
  getCatalogObstetricConditions: (): Promise<CatalogObstetricCondition[]> =>
    request<CatalogObstetricCondition[]>("GET", "/catalog/obstetric-conditions"),

  /** GET /management-procedures?priorityId=&conditionId=&gestationWeeks= */
  getProcedures: (params: { priorityId?: number; conditionId?: number; gestationWeeks?: number }): Promise<ManagementProcedure[]> => {
    const qs = new URLSearchParams();
    if (params.priorityId != null) qs.set("priorityId", String(params.priorityId));
    if (params.conditionId != null) qs.set("conditionId", String(params.conditionId));
    if (params.gestationWeeks != null) qs.set("gestationWeeks", String(params.gestationWeeks));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<ManagementProcedure[]>("GET", `/management-procedures${query}`);
  },
};



// --- Safe profile report fetcher (outside patientService)
export function getProfileReportSafe(userId: number): Promise<{
  acknowledgementsApproved: number;
  triagedCount: number;
  notesAdded: number;
  checklistsCompleted: number;
  timelineEventsLogged: number;
} | null> {
  return patientService.getProfileReport(userId)
    .catch((err) => {
      if (typeof window !== "undefined") {
        console.error("Failed to fetch profile report:", err);
      }
      return null;
    });
}