import { CONDITIONS, CONDITION_LABELS } from "../constants/conditions";
import { MGMT } from "../constants/management";
import { RISK_FACTORS } from "../constants/riskFactors";
import { C, pC, pLbl } from "../constants/theme";
import { formatConditionCode, parseAiConditions } from "../services/catalogService";
import type { AssessmentForm, Patient, StatusBundle, TimelineEvent } from "../types";

export function fullName(patient: any): string {
  return (
    patient?.n ||
    [patient?.name, patient?.surname].filter(Boolean).join(" ") ||
    "Unidentified Patient"
  );
}

export function splitName(value = ""): { name: string; surname: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return { name: parts[0] || "", surname: parts.slice(1).join(" ") };
}

export function getStatusBundle(priority: number): StatusBundle {
  if (priority === 1)
    return { status: "Pending transfer", location: "Triage room", reassessDue: "Immediate" };
  if (priority === 2)
    return { status: "Awaiting urgent review", location: "Labour suite", reassessDue: "10 min" };
  if (priority === 3)
    return { status: "Awaiting reassessment", location: "Waiting area", reassessDue: "30 min" };
  return { status: "Monitoring in waiting area", location: "Waiting area", reassessDue: "1 hr" };
}

/**
 * Parse an SA ID or passport number.
 * For a 13-digit SA ID: extracts DOB and age from YYMMDD prefix.
 * For a passport: accepts 5–12 alphanumeric characters, skips age extraction.
 * Only validates length — no checksum.
 */
export function parseSAID(id: string | undefined | null): { valid: boolean; dob: string; age: number; error?: string } {
  const clean = (id ?? "").replace(/\s/g, "");
  if (clean === "") return { valid: false, dob: "", age: 0 };

  // Passport: 5–12 alphanumeric characters
  if (/^[A-Z0-9]{5,12}$/i.test(clean) && clean.length < 13) {
    return { valid: true, dob: "", age: 0 };
  }

  // SA ID: must be exactly 13 digits
  if (!/^\d{13}$/.test(clean)) {
    return { valid: false, dob: "", age: 0, error: "SA ID must be 13 digits, or enter a valid passport number" };
  }

  const yy = parseInt(clean.substring(0, 2));
  const mm = parseInt(clean.substring(2, 4));
  const dd = parseInt(clean.substring(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return { valid: false, dob: "", age: 0, error: "Invalid date of birth encoded in SA ID" };

  const currentYY = new Date().getFullYear() % 100;
  const century = yy > currentYY ? 1900 : 2000;
  const dob = `${century + yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return { valid: false, dob: "", age: 0, error: "Invalid date of birth encoded in SA ID" };

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const notYet = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  return { valid: true, dob, age: notYet ? age - 1 : age };
}

export function timeStamp(): string {
  return new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Format a raw string into a South African cell number: +27 XX XXX XXXX
 * Works progressively as the user types.
 */
export function formatCellNumber(raw: string): string {
  // 1. If the user cleared the input or is deleting the prefix, let them.
  if (raw.length < 4 && (raw === "+" || raw === "+2" || raw === "")) {
    return raw;
  }

  // 2. Extract digits only
  const digits = raw.replace(/\D/g, "");

  // 3. Normalise: strip country code prefix (27) or local prefix (0)
  let local = digits;
  if (local.startsWith("27")) {
    local = local.slice(2);
  } else if (local.startsWith("0")) {
    local = local.slice(1);
  }

  local = local.slice(0, 9); // cap at 9 significant digits

  if (local.length === 0) return "+27 ";

  // 4. Progressive format: +27 XX XXX XXXX
  let result = "+27";
  if (local.length >= 1) result += " " + local.slice(0, Math.min(2, local.length));
  if (local.length > 2) result += " " + local.slice(2, Math.min(5, local.length));
  if (local.length > 5) result += " " + local.slice(5);

  return result;
}

/**
 * Validate a SA cell number.
 * Returns an error string when invalid, or null when valid (or empty).
 */
export function validateCellNumber(value: string): string | null {
  if (!value || value.trim() === "") return null;
  const digits = value.replace(/\D/g, "");

  let nineDigits: string;
  if (digits.startsWith("27") && digits.length === 11) {
    nineDigits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 10) {
    nineDigits = digits.slice(1);
  } else if (digits.length === 9) {
    nineDigits = digits;
  } else {
    return "Enter a valid SA cell number (e.g. +27 82 000 0000)";
  }

  // SA mobiles start with 6, 7, or 8 after the country/area prefix
  if (!/^[678]/.test(nineDigits)) {
    return "Enter a valid SA mobile number";
  }

  return null;
}

export function timelineEntry(
  title: string,
  detail: string,
  tone = C.green,
  time = timeStamp()
): TimelineEvent {
  return { time, title, detail, tone };
}

export function buildAssessmentForm(initialData: any = {}): AssessmentForm {
  const safeInitialData = initialData || {};
  const fallbackName = splitName(safeInitialData.n || "");
  const bpParts = String(safeInitialData.bp || "").split("/");
  const baseRiskFactors = Object.fromEntries(RISK_FACTORS.map((r) => [r.k, false]));

  let condKeys = safeInitialData.condKeys || [];

  if (safeInitialData.condKey && !condKeys.length) {
    condKeys = [safeInitialData.condKey];
  }

  if (!condKeys.length && safeInitialData.cond) {
    const foundCondition = CONDITIONS.find((c) => c.lb === safeInitialData.cond);
    if (foundCondition && foundCondition.v) {
      condKeys = [foundCondition.v];
    }
  }

  return {
    id: safeInitialData.id,
    // Preserve API IDs so re-triage skips patient + assessment creation
    patientId: safeInitialData.patientId ?? undefined,
    patientFileId: safeInitialData.patientFileId ?? undefined,
    assessmentId: safeInitialData.assessmentId ?? undefined,
    name: safeInitialData.name || fallbackName.name,
    surname: safeInitialData.surname || fallbackName.surname,
    idNumber: safeInitialData.idNumber || safeInitialData.id_number || "",
    age: safeInitialData.age ? String(safeInitialData.age) : "",
    gestAge: safeInitialData.ga ? String(safeInitialData.ga) : "",
    gravida: safeInitialData.gravida ? String(safeInitialData.gravida) : "1",
    para: safeInitialData.para ? String(safeInitialData.para) : "0",
    otherSymptoms: safeInitialData?.otherSymptoms || "",
    customSymptoms: Array.isArray(safeInitialData?.customSymptoms)
      ? safeInitialData.customSymptoms
      : Array.isArray(safeInitialData?.custom_symptoms)
        ? safeInitialData.custom_symptoms
        : (typeof safeInitialData?.other_symptoms === "string" && safeInitialData.other_symptoms.trim())
          ? [safeInitialData.other_symptoms.trim()]
          : [],
    condKeys: condKeys,
    cond:
      safeInitialData.cond ||
      (condKeys.length ? CONDITION_LABELS[condKeys[0]] : ""),
    condKey: condKeys.length ? condKeys[0] : "",
    bpS:
      safeInitialData.bpS && safeInitialData.bpS !== "—"
        ? String(safeInitialData.bpS)
        : bpParts[0] && bpParts[0] !== "—" ? String(bpParts[0]) : "",
    bpD:
      safeInitialData.bpD && safeInitialData.bpD !== "—"
        ? String(safeInitialData.bpD)
        : bpParts[1] && bpParts[1] !== "—" ? String(bpParts[1]) : "",
    hr:
      safeInitialData.hr && safeInitialData.hr !== "—"
        ? String(safeInitialData.hr)
        : "",
    rr:
      safeInitialData.rr && safeInitialData.rr !== "—"
        ? String(safeInitialData.rr)
        : "",
    spo:
      safeInitialData.spo && safeInitialData.spo !== "—"
        ? String(safeInitialData.spo)
        : "",
    temp:
      safeInitialData.temp && safeInitialData.temp !== "—"
        ? String(safeInitialData.temp)
        : "",
    fhr:
      safeInitialData.fhr && safeInitialData.fhr !== "—"
        ? String(safeInitialData.fhr)
        : "",
    fmov: safeInitialData.fmov || "present",
    cx:
      safeInitialData.cx && safeInitialData.cx !== "—"
        ? String(safeInitialData.cx)
        : "0",
    ctg: safeInitialData.ctg || "",
    vaginalNotes: safeInitialData.vaginalNotes || safeInitialData.examination_notes || "",
    vitalSignsNotes: safeInitialData.vitalSignsNotes || "",
    cell: safeInitialData.cell || safeInitialData.contact || "+27",
    // Risk factors always start unchecked — the clinician must explicitly
    // select them for each triage / re-triage encounter rather than having
    // stale flags carried over from a prior assessment or patient record.
    ...baseRiskFactors,
  };
}

export function buildPatientFromAssessment(
  result: any,
  current?: any
): Patient {
  const priority = result.priority;
  const nextState = getStatusBundle(priority);
  const nextTime = timeStamp();
  const preservedChecklist =
    current?.p === priority &&
    current?.managementChecklist?.length === MGMT[priority].length
      ? current.managementChecklist
      : Array(MGMT[priority].length).fill(false);

  const primaryCondKey =
    result.condKeys && result.condKeys.length
      ? result.condKeys[0]
      : result.condKey || "";
  // Prefer obstetric condition name from API response over sign/symptom labels.
  // Resolution order: obstetricConditions[] -> triggeredRules[] code -> aiConditionsJson -> condKey -> result.cond
  const la = result.latestAssessment ?? result;
  const obstetricConditions = la?.obstetricConditions ?? result.obstetricConditions ?? [];
  let obstetricName = "";
  if (Array.isArray(obstetricConditions) && obstetricConditions.length > 0) {
    const first = obstetricConditions[0];
    obstetricName = first?.name || (first?.code ? formatConditionCode(first.code) : "");
  }
  if (!obstetricName) {
    const tr = Array.isArray(la?.triggeredRules) ? la.triggeredRules : [];
    for (const r of tr) {
      const code = r?.obstetric_condition_code ?? r?.obstetricConditionCode;
      if (code) { obstetricName = formatConditionCode(code); break; }
    }
  }
  if (!obstetricName) {
    const ai = parseAiConditions(la?.aiConditionsJson ?? result.aiConditionsJson);
    const code = ai?.condition || ai?.topConditions?.[0]?.condition;
    if (code) obstetricName = formatConditionCode(code);
  }
  const conditionLabel = obstetricName
    || (primaryCondKey ? CONDITION_LABELS[primaryCondKey] : "")
    || result.cond
    || "General review";

  return {
    ...(current || {}),
    // Preserve latestAssessment (with obstetricConditions, finalPriorityId, etc.) on the patient object
    latestAssessment: result.latestAssessment ?? current?.latestAssessment,
    id: current?.id || result.patientId || result.id || Date.now(),
    // Always carry forward API IDs — critical for re-triage to link new assessments to the same patient
    patientId: result.patientId ?? current?.patientId,
    patientFileId: result.patientFileId ?? current?.patientFileId,
    assessmentId: result.assessmentId ?? current?.assessmentId,
    name: result.name || current?.name || "",
    surname: result.surname || current?.surname || "",
    n:
      `${result.name || current?.name || ""} ${
        result.surname || current?.surname || ""
      }`.trim() || current?.n || "Unidentified Patient",
    age: result.idNumber || result.id_number ? parseSAID(result.idNumber || result.id_number).age : Number(result.age || current?.age || 0),
    ga: Number(result.gestAge ?? result.gestational_age_weeks ?? current?.ga ?? 0),
    gravida: result.gravida !== undefined && result.gravida !== "" ? String(result.gravida) : (current?.gravida || "1"),
    para: result.para !== undefined && result.para !== "" ? String(result.para) : (current?.para || "0"),
    id_number: result.idNumber || result.id_number || current?.id_number || "",
    p: priority,
    t: nextTime,
    cond: conditionLabel,
    condKey: primaryCondKey,
    condKeys: result.condKeys || (primaryCondKey ? [primaryCondKey] : []),
    bpS: result.bpS && result.bpS !== "—" ? String(result.bpS) : (current?.bpS ?? ""),
    bpD: result.bpD && result.bpD !== "—" ? String(result.bpD) : (current?.bpD ?? ""),
    bp: (() => {
      const s = result.bpS && result.bpS !== "—" ? String(result.bpS) : (current?.bpS ?? "");
      const d = result.bpD && result.bpD !== "—" ? String(result.bpD) : (current?.bpD ?? "");
      return s && d ? `${s}/${d}` : (current?.bp || "—");
    })(),
    hr: result.hr && result.hr !== "—" ? result.hr : (current?.hr || "—"),
    rr: result.rr && result.rr !== "—" ? result.rr : (current?.rr || "—"),
    spo: result.spo && result.spo !== "—" ? result.spo : (current?.spo || "—"),
    temp: result.temp && result.temp !== "—" ? result.temp : (current?.temp || "—"),
    fhr: result.fhr && result.fhr !== "—" ? result.fhr : (current?.fhr || "—"),
    fmov: result.fmov || current?.fmov || "present",
    cx: result.cx && result.cx !== "0" ? result.cx : "—",
    ctg: result.ctg || current?.ctg || "",
    vitalSignsNotes: result.vitalSignsNotes || current?.vitalSignsNotes || "",
    status:
      current?.location === "Labour suite"
        ? current.status
        : nextState.status,
    location:
      current?.location === "Labour suite"
        ? current.location
        : nextState.location,
    reassessDue: nextState.reassessDue,
    acknowledged: false,
    handover: current?.handover || "",
    outcome: current?.outcome || "Awaiting clinical outcome",
    outcomeNotes: current?.outcomeNotes || "",
    managementChecklist: preservedChecklist,
    timeline: [
      timelineEntry(
        current ? "Re-triaged" : "Triaged",
        `${current ? "Updated" : "Assigned"} to P${priority} ${pLbl(priority)}`,
        pC(priority),
        nextTime
      ),
      ...(current?.timeline || [
        timelineEntry(
          "Routing",
          `${nextState.status} · ${nextState.location}`,
          C.green,
          nextTime
        ),
      ]),
    ],
    ...Object.fromEntries(
      RISK_FACTORS.map((r) => [r.k, Boolean(result[r.k])])
    ),
  };
}
