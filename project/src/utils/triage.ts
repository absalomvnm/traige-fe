import type { VitalAlert } from "../types";
import { RISK_FACTORS } from "../constants/riskFactors";
import { CONDITION_LABELS } from "../constants/conditions";

export function calcPriority(f: any): number {
  const bp = parseInt(f.bpS || 0),
    bpd = parseInt(f.bpD || 0),
    hr = parseInt(f.hr || 0);
  const rr = parseInt(f.rr || 0),
    spo = parseInt(f.spo || 100),
    fhr = parseInt(f.fhr || 140);
  const cx = parseInt(f.cx || 0),
    ga = parseInt(f.gestAge || 0),
    cd =
      Array.isArray(f.condKeys) && f.condKeys.length
        ? f.condKeys[0]
        : f.cond || "";
  const p1c = ["eclampsia", "aph", "cord_prolapse", "loc", "mec3"];
  const p2c = ["sev_pec", "preterm", "pprom", "multi_labour", "sob", "plac_praevia"];
  const p3c = ["pre_ec", "gest_dm", "gest_htn", "vbac", "grand_multi", "post_dates"];
  if (
    p1c.includes(cd) ||
    bp >= 160 ||
    bpd >= 110 ||
    hr > 140 ||
    (hr > 0 && hr < 50) ||
    rr > 60 ||
    (rr > 0 && rr < 10) ||
    spo < 85 ||
    (fhr > 0 && fhr < 100) ||
    cx > 8 ||
    (ga > 0 && (ga > 42 || ga < 24))
  )
    return 1;
  if (
    p2c.includes(cd) ||
    bp >= 150 ||
    bpd >= 100 ||
    hr > 120 ||
    rr > 30 ||
    spo < 90 ||
    (fhr > 0 && (fhr < 110 || fhr > 170)) ||
    cx === 8 ||
    (ga >= 41 && ga <= 42)
  )
    return 2;
  if (p3c.includes(cd) || bp >= 140 || bpd >= 90 || hr > 110 || cx >= 6)
    return 3;
  return 4;
}

export function getRealtimeVitalAlerts(
  f: any
): Record<string, VitalAlert> {
  const alerts: Record<string, VitalAlert> = {};
  const toNum = (value: any) => {
    // Treat blank / null / "—" as missing — never produce a spurious 0
    if (value === "" || value === null || value === undefined || value === "—") return NaN;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  const setAlert = (key: string, priority: number, text: string) => {
    if (!alerts[key] || priority < alerts[key].priority)
      alerts[key] = { priority, text };
  };

  const bpS = toNum(f.bpS);
  if (!Number.isNaN(bpS)) {
    if (bpS >= 160)
      setAlert("bpS", 1, "Critical systolic BP (>=160) - emergency response now");
    else if (bpS >= 150)
      setAlert("bpS", 2, "Very high systolic BP (>=150) - urgent review");
    else if (bpS >= 140)
      setAlert("bpS", 3, "Elevated systolic BP (>=140) - monitor closely");
  }

  const bpD = toNum(f.bpD);
  if (!Number.isNaN(bpD)) {
    if (bpD >= 110)
      setAlert("bpD", 1, "Critical diastolic BP (>=110) - emergency response now");
    else if (bpD >= 100)
      setAlert("bpD", 2, "Very high diastolic BP (>=100) - urgent review");
    else if (bpD >= 90)
      setAlert("bpD", 3, "Elevated diastolic BP (>=90) - monitor closely");
  }

  const hr = toNum(f.hr);
  if (!Number.isNaN(hr)) {
    if (hr > 140 || (hr > 0 && hr < 50))
      setAlert(
        "hr",
        1,
        hr > 140
          ? "Critical tachycardia (>140 bpm)"
          : "Critical bradycardia (<50 bpm)"
      );
    else if (hr > 120) setAlert("hr", 2, "Very high heart rate (>120 bpm)");
    else if (hr > 110) setAlert("hr", 3, "Elevated heart rate (>110 bpm)");
  }

  const rr = toNum(f.rr);
  if (!Number.isNaN(rr)) {
    if (rr > 60 || (rr > 0 && rr < 10))
      setAlert(
        "rr",
        1,
        rr > 60
          ? "Critical respiratory rate (>60/min)"
          : "Critical low respiratory rate (<10/min)"
      );
    else if (rr > 30) setAlert("rr", 2, "High respiratory rate (>30/min)");
  }

  const spo = toNum(f.spo);
  if (!Number.isNaN(spo) && spo > 0) {
    if (spo < 85) setAlert("spo", 1, "Critical desaturation (SpO2 <85%)");
    else if (spo < 90) setAlert("spo", 2, "Low oxygen saturation (SpO2 <90%)");
  }

  const fhr = toNum(f.fhr);
  if (!Number.isNaN(fhr)) {
    if (fhr > 0 && fhr < 100)
      setAlert("fhr", 1, "Critical foetal bradycardia (FHR <100 bpm)");
    else if (fhr > 0 && (fhr < 110 || fhr > 170))
      setAlert(
        "fhr",
        2,
        fhr < 110
          ? "Foetal heart rate low (<110 bpm)"
          : "Foetal heart rate high (>170 bpm)"
      );
  }

  const cx = toNum(f.cx);
  if (!Number.isNaN(cx)) {
    if (cx > 8)
      setAlert("cx", 1, "Advanced labour (>8 cm) - immediate escalation");
    else if (cx === 8)
      setAlert("cx", 2, "Active labour at 8 cm - urgent review");
    else if (cx >= 6)
      setAlert("cx", 3, "Labour progression (6-7 cm) - close monitoring");
  }

  const ga = toNum(f.gestAge);
  if (!Number.isNaN(ga) && ga > 0) {
    if (ga > 42)
      setAlert("gestAge", 1, "Post-term (>42 wks) - P1 emergency, immediate delivery planning");
    else if (ga < 24)
      setAlert("gestAge", 1, "Previable / extreme preterm (<24 wks) - emergency assessment");
    else if (ga >= 41)
      setAlert("gestAge", 2, "Post-dates (41-42 wks) - urgent review, consider induction");
    else if (ga < 28)
      setAlert("gestAge", 2, "Very preterm (24-27 wks) - urgent neonatal readiness");
    else if (ga < 34)
      setAlert("gestAge", 3, "Preterm (28-33 wks) - close monitoring required");
  }

  return alerts;
}

export function toNumber(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function normalizeDecisionInput(source: any) {
  const bpParts = String(source?.bp || "").split("/");
  return {
    bpS: source?.bpS ?? bpParts[0] ?? "",
    bpD: source?.bpD ?? bpParts[1] ?? "",
    hr: source?.hr ?? "",
    rr: source?.rr ?? "",
    spo: source?.spo ?? "",
    fhr: source?.fhr ?? "",
    cx: source?.cx && source?.cx !== "—" ? source.cx : "0",
    cond: source?.condKey || source?.cond || "",
    fmov: source?.fmov || "present",
  };
}

export function buildDecisionSummary(
  source: any,
  priority: number
) {
  const input = normalizeDecisionInput(source);
  const liveAlerts = getRealtimeVitalAlerts(input as any);
  const triggeredRules = Object.values(liveAlerts)
    .sort((a, b) => a.priority - b.priority)
    .map((a) => ({ priority: a.priority, text: a.text }));

  const riskHits = RISK_FACTORS.filter((r) => Boolean(source?.[r.k])).map(
    (r) => r.l
  );

  // Derive selected presenting condition labels from signsSymptoms boolean map and/or condKeys array
  const ssObj: Record<string, boolean> =
    (typeof source?.latestAssessment?.signsSymptoms === "object" && source.latestAssessment.signsSymptoms) ||
    (typeof source?.signsSymptoms === "object" && source.signsSymptoms) ||
    {};
  const condKeysArr: string[] = Array.isArray(source?.condKeys) ? source.condKeys : [];
  const customSymptomsArr: string[] = Array.isArray(source?.customSymptoms) ? source.customSymptoms : [];
  const seen = new Set<string>();
  const conditionHits: string[] = [];
  for (const key of [...condKeysArr, ...Object.entries(ssObj).filter(([, v]) => v === true).map(([k]) => k)]) {
    if (!seen.has(key) && CONDITION_LABELS[key]) {
      seen.add(key);
      conditionHits.push(CONDITION_LABELS[key]);
    }
  }
  for (const s of customSymptomsArr) {
    const label = String(s).trim();
    if (label && !seen.has(label.toLowerCase())) {
      seen.add(label.toLowerCase());
      conditionHits.push(label);
    }
  }

  const signsLabel = conditionHits.length
    ? conditionHits.join(", ")
    : (input.cond || "Not selected");

  const dataUsed: [string, string][] = [
    [
      "BP",
      input.bpS && input.bpD ? `${input.bpS}/${input.bpD} mmHg` : "Not captured",
    ],
    ["HR", input.hr ? `${input.hr} bpm` : "Not captured"],
    ["RR", input.rr ? `${input.rr} /min` : "Not captured"],
    ["SpO₂", input.spo ? `${input.spo}%` : "Not captured"],
    ["FHR", input.fhr ? `${input.fhr} bpm` : "Not captured"],
    [
      "Cervix",
      input.cx && input.cx !== "0" ? `${input.cx} cm` : "Not examined / closed",
    ],
    [conditionHits.length > 1 ? "Signs & Symptoms" : "Sign & Symptom", signsLabel],
    ["Foetal Movement", input.fmov || "Not captured"],
  ];

  const missingInputs: string[] = [];
  if (Number.isNaN(toNumber(input.bpS)) || Number.isNaN(toNumber(input.bpD)))
    missingInputs.push("Complete blood pressure");
  if (Number.isNaN(toNumber(input.hr))) missingInputs.push("Heart rate");
  if (Number.isNaN(toNumber(input.rr))) missingInputs.push("Respiratory rate");
  if (Number.isNaN(toNumber(input.spo))) missingInputs.push("Oxygen saturation");
  if (Number.isNaN(toNumber(input.fhr))) missingInputs.push("Foetal heart rate");
  if (!input.cond) missingInputs.push("Presenting condition");

  const shiftHints =
    priority === 1
      ? [
          "Priority could reduce only if current critical findings resolve and are re-measured within safe thresholds.",
          "Maintain escalation pathway until clinician confirms stabilization.",
        ]
      : [
          "Any new critical threshold crossing (for example BP >=160/110, SpO₂ <85, HR >140/<50) may escalate to P1.",
          "Condition deterioration or worsening foetal indicators may escalate priority immediately.",
        ];

  return { triggeredRules, riskHits, dataUsed, missingInputs, shiftHints, conditionHits };
}
