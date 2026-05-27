import { useEffect, useRef, useState } from "react";
import { MultiConditionSelect } from "../components/MultiConditionSelect";
import { IconArrowLeft, IconArrowRight, IconBolt, IconCheck, IconHeartPulse, IconPill, IconSiren, IconStethoscope, IconTestTube, IconUser, IconWarning } from "../components/icons";
import { Btn, Card, ComboSel, Hdr, Inp, SectionLabel, Sel, Txt } from "../components/ui";
import { STEPS } from "../constants/options";
import { C, pBg, pC } from "../constants/theme";
import { patientService } from "../services/Patientservice";
import { buildAssessmentForm, formatCellNumber, parseSAID, validateCellNumber } from "../utils/helpers";
import { calcPriority, getRealtimeVitalAlerts } from "../utils/triage";
import { MultiRiskFactorSelect } from "../components/MultiRiskFactorSelect";

// Signs & symptoms condition keys — used in both step-2 persist and go()-fallback
const SS_KEYS = [
  "proteinuria_2plus", "fitting_seizures", "generalized_oedema",
  "visual_disturbances", "epigastric_pain", "active_vaginal_bleeding",
  "prolapse_cord", "ruptured_membranes", "stridor", "cervical_shortening",
  "altered_mental_status", "diffuse_crackles", "glycosuria",
  "mild_regular_contractions", "moderate_regular_contractions",
  "severe_regular_contractions", "irregular_contractions",
] as const;

interface TriageScreenProps {
  onNav: (screen: string) => void;
  onResult: (assessment: any) => void;
  initialData?: any;
  currentUser?: any;
  toast?: { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void; warning: (m: string) => void };
}

export function TriageScreen({ onNav, onResult, initialData, currentUser, toast }: TriageScreenProps) {
  const [step, setStep] = useState(1);
  const [f, sf] = useState(() => buildAssessmentForm(initialData));
  const s = (k: string) => (e: any) => sf((p: any) => ({ ...p, [k]: e.target.value }));
  const pct = (step / STEPS.length) * 100;
  const vitalAlerts = getRealtimeVitalAlerts(f);
  const activeAlertList = Object.values(vitalAlerts);
  const p1LiveCount = activeAlertList.filter((a: any) => a.priority === 1).length;
  const [idError, setIdError] = useState<string | null>(null);
  const [cellError, setCellError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState(false);
  // Triage generation progress — drives the full-screen overlay so the
  // operator can see that the "Generate Triage" pipeline is running
  // (risk-factor save → vitals confirm → evaluate → AI classifier →
  // fetch authoritative result). The AI classifier call alone can take
  // several seconds, so a silent button leaves the UI feeling unresponsive.
  const [generating, setGenerating] = useState(false);
  const [genStage, setGenStage] = useState<string>("");
  const urinalysisExists = useRef(false);

  // Pre-populate urinalysis fields when re-triaging an existing assessment
  useEffect(() => {
    const assessmentId = (initialData as any)?.assessmentId as number | undefined;
    if (!assessmentId) return;
    patientService.getUrinaryAnalysis(assessmentId)
      .then((resp) => {
        const u = resp?.urinaryAnalysis;
        if (!u) return;
        urinalysisExists.current = true;
        const fromApi = (v?: string) => (v && v !== "none" ? v.replace("+", "") : "");
        sf((p: any) => ({
          ...p,
          Protein: fromApi(u.protein),
          Leukocytes: fromApi(u.leukocytes),
          Haematuria: fromApi(u.haematuria),
          Blood: fromApi(u.blood),
          Nitrite: fromApi(u.nitrite),
          Glucose: fromApi(u.glucose),
          SG: fromApi(u.sg),
          Bilirubin: fromApi(u.bilirubin),
          ph: fromApi(u.ph),
        }));
      })
      .catch(() => { /* no urinalysis yet — leave fields blank */ });
  }, []);

  // Fire-and-forget wrapper: logs start, success, and failure
  function fireApi(promise: Promise<any>, label: string) {
    console.log(`[TRIAGE API] Firing: ${label}`);
    promise
      .then(() => {
        console.log(`[TRIAGE API] ${label} — persisted`);
        toast?.success(`${label} saved`);
      })
      .catch((err: any) => {
        console.warn(`[TRIAGE API] ${label} — failed (non-blocking):`, err);
        toast?.error(`Could not save ${label}`);
      });
  }

  // Step 1 → 2: create patient record (new) or reuse existing (re-triage) + open an in-progress assessment
  // Returns true on success, false on failure (caller should block step advance on false)
  async function saveStep1(): Promise<boolean> {
    setSaveError(null);
    setSavingStep(true);
    try {
      let patientId = (f as any).patientId as number | undefined;
      let patientFileId = (f as any).patientFileId as number | undefined;
      let assessmentId = (f as any).assessmentId as number | undefined;

      if (!patientId) {
        console.log("[TRIAGE] Step 1 — creating new patient", { name: f.name, surname: f.surname });
        const data = await patientService.createPatient({
          name: f.name,
          surname: f.surname,
          id_number: f.idNumber,
          contact: f.cell || "",
          gestational_age_weeks: f.gestAge !== "" && f.gestAge !== undefined ? Number(f.gestAge) : undefined,
          gravida: f.gravida !== "" && f.gravida !== undefined ? Number(f.gravida) : undefined,
          para: f.para !== "" && f.para !== undefined ? Number(f.para) : undefined,
        });
        patientId = data.id;
        patientFileId = data.patientFileId;
        console.log("[TRIAGE] Patient created — id:", data.id, "patientFileId:", data.patientFileId);
      } else {
        console.log("[TRIAGE] Step 1 — re-triage for existing patientId:", patientId, "patientFileId:", patientFileId);
      }

      const userId = currentUser?.id ? Number(currentUser.id) : 0;

      if (!assessmentId) {
        console.log("[TRIAGE] Creating in-progress assessment for patientId:", patientId);
        const aResp = await patientService.createAssessment({
          patientId: patientId!,
          patientFileId,
          userId,
          gestationWeeks: f.gestAge !== "" && f.gestAge !== undefined ? Number(f.gestAge) : undefined,
          status: "in_progress",
        });
        assessmentId = aResp.id;
        console.log("[TRIAGE] Initial assessment created — assessmentId:", aResp.id);
      } else {
        console.log("[TRIAGE] Re-triage — reusing existing assessmentId:", assessmentId);
      }

      sf((p: any) => ({ ...p, patientId, patientFileId, assessmentId }));

      // Persist demographics to dedicated endpoint now that assessmentId is known
      if (patientId && assessmentId) {
        fireApi(
          patientService.submitDemographics({
            patientId,
            userId,
            name: f.name,
            surname: f.surname,
            contact: f.cell || undefined,
            id_number: f.idNumber || undefined,
            gestational_age_weeks: f.gestAge !== "" && f.gestAge !== undefined ? Number(f.gestAge) : undefined,
            gravida: f.gravida !== "" && f.gravida !== undefined ? Number(f.gravida) : undefined,
            para: f.para !== "" && f.para !== undefined ? Number(f.para) : undefined,
          }),
          "demographics"
        );
      }

      toast?.success("Patient record saved");
      return true;
    } catch (e: any) {
      const msg = e?.message?.includes("Failed to fetch")
        ? "Could not reach the patient service (port 8081). Record saved locally — sync when service is back online."
        : (e?.message ?? "Failed to save patient record.");
      console.error("[TRIAGE] Step 1 failed:", e);
      setSaveError(msg);
      toast?.error("Could not save patient — check connection");
      return false;
    } finally {
      setSavingStep(false);
    }
  }

  // Step 2 → 3: persist signs/symptoms + vitals + urinalysis file entries.
  // Calls are serialised on purpose: each one opens a JTA transaction on the
  // backend that holds a row lock on the Assessment row while the AI HTTP
  // call runs. Firing them in parallel races the lock and hits H2's
  // LOCK_TIMEOUT in dev. Sequential keeps the lock contention to zero.
  async function persistStep2() {
    const aId = (f as any).assessmentId as number | undefined;
    const pId = (f as any).patientId as number | undefined;
    if (!aId || !pId) {
      console.warn("[TRIAGE] Step 2 persist skipped — no assessmentId/patientId (Step 1 may have failed)");
      return;
    }
    console.log("[TRIAGE] Step 2 — persisting signs/symptoms, vitals, urinalysis (sequential)", { assessmentId: aId, patientId: pId });
    const userId = currentUser?.id ? Number(currentUser.id) : 0;
    const condKeySet = new Set<string>((f.condKeys as string[]) || []);
    const signsSymptoms = {
      ...Object.fromEntries(SS_KEYS.map((k) => [k, condKeySet.has(k)])),
    };
    const vitalsPayload = {
      bp_systolic: f.bpS !== "" && f.bpS !== undefined ? Number(f.bpS) : undefined,
      bp_diastolic: f.bpD !== "" && f.bpD !== undefined ? Number(f.bpD) : undefined,
      heart_rate: f.hr !== "" && f.hr !== undefined ? Number(f.hr) : undefined,
      respiration_rate: f.rr !== "" && f.rr !== undefined ? Number(f.rr) : undefined,
      spo2: f.spo !== "" && f.spo !== undefined ? Number(f.spo) : undefined,
      temp: f.temp !== "" && f.temp !== undefined ? Number(f.temp) : undefined,
      pregnant: true,
      notes: f.vitalSignsNotes || undefined,
    };
    
    const toUrineVal = (raw: any) => {
      if (raw === "Neg") return "Neg";
      if (raw === "Pos") return "Pos";
      if (raw) return `${raw}+`;
      return "none";
    };


    const urinePayload = {
      protein: toUrineVal(f.Protein),
      leukocytes: toUrineVal(f.Leukocytes),
      haematuria: toUrineVal(f.Haematuria),
      blood: toUrineVal(f.Blood),
      nitrite: toUrineVal(f.Nitrite),
      glucose: toUrineVal(f.Glucose),
      sg: f.SG ? String(f.SG) : undefined,
      bilirubin: toUrineVal(f.Bilirubin),
      ph: f.ph ? String(f.ph) : undefined,
    };

    // Run each persist in order; swallow + log individual failures so a later
    // call still gets a chance to land (matches old fire-and-forget semantics).
    const runOne = async (label: string, p: Promise<any>) => {
      try {
        await p;
        console.log(`[TRIAGE API] ${label} — persisted`);
        toast?.success(`${label} saved`);
      } catch (err) {
        console.warn(`[TRIAGE API] ${label} — failed (non-blocking):`, err);
        toast?.error(`Could not save ${label}`);
      }
    };

    await runOne("signs & symptoms",
      patientService.submitSignsSymptoms({ assessmentId: aId, patientId: pId, userId, ...signsSymptoms }));
    await runOne("vitals",
      patientService.submitVitals(aId, vitalsPayload, { patientId: pId, userId }));
    await runOne("urinalysis",
      urinalysisExists.current
        ? patientService.updateUrinaryAnalysis(aId, urinePayload)
        : patientService.submitUrinaryAnalysis(aId, urinePayload));
  }

  // Step 3 → 4: persist foetal monitoring data
  function persistStep3() {
    const aId = (f as any).assessmentId as number | undefined;
    const pId = (f as any).patientId as number | undefined;
    if (!aId || !pId) {
      console.warn("[TRIAGE] Step 3 persist skipped — no assessmentId/patientId");
      return;
    }
    console.log("[TRIAGE] Step 3 — persisting foetal monitoring", { assessmentId: aId, fhr: f.fhr, fmov: f.fmov });
    const userId = currentUser?.id ? Number(currentUser.id) : 0;
    fireApi(
      patientService.submitFoetal({
        assessmentId: aId, patientId: pId, userId,
        foetal_heart_rate: f.fhr ? Number(f.fhr) : undefined,
        foetal_movement: (f.fmov as any) || undefined,
        ctg_notes: f.ctg || undefined,
      }),
      "foetal monitoring"
    );
  }

  // Step 4 → 5: persist vaginal exam
  function persistStep4() {
    const aId = (f as any).assessmentId as number | undefined;
    const pId = (f as any).patientId as number | undefined;
    if (!aId || !pId) {
      console.warn("[TRIAGE] Step 4 persist skipped — no assessmentId/patientId");
      return;
    }
    console.log("[TRIAGE] Step 4 — persisting vaginal exam", { assessmentId: aId, cx: f.cx });
    const userId = currentUser?.id ? Number(currentUser.id) : 0;
    fireApi(
      patientService.submitVaginal({
        assessmentId: aId, patientId: pId, userId,
        cervical_dilation: f.cx !== undefined && f.cx !== "" ? Number(f.cx) : undefined,        examination_notes: f.vaginalNotes || undefined,      }),
      "vaginal exam"
    );
  }

  async function go() {
    setGenerating(true);
    setGenStage("Preparing assessment…");
    try {
      await runGo();
    } finally {
      setGenerating(false);
      setGenStage("");
    }
  }

  async function runGo() {
    const localPriority = calcPriority(f);
    let finalPriority = localPriority;
    let assessmentId = (f as any).assessmentId as number | undefined;
    const userId = currentUser?.id ? Number(currentUser.id) : 0;

    const selectedRiskFactors = new Set<string>((f.riskCondKeys as string[]) || []);

    const riskFactorsPayload = {
      previous_caesarean: selectedRiskFactors.has("previous_caesarean"),
      chronic_hypertension: selectedRiskFactors.has("chronic_hypertension"),
      diabetes_mellitus: selectedRiskFactors.has("diabetes_mellitus"),
      grand_multiparity: selectedRiskFactors.has("grand_multiparity"),
      advanced_maternal_age: selectedRiskFactors.has("advanced_maternal_age"),
      multiple_pregnancy: selectedRiskFactors.has("multiple_pregnancy"),
      rhesus_incompatibility: selectedRiskFactors.has("rhesus_incompatibility"),
      hiv_positive: selectedRiskFactors.has("hiv_positive"),
      severe_anaemia: selectedRiskFactors.has("severe_anaemia"),
      previous_pph: selectedRiskFactors.has("previous_pph"),
    };

    if (assessmentId && f.patientId) {
      setGenStage("Saving risk factors…");
      console.log("[TRIAGE] Step 5 — persisting risk factors", { assessmentId, riskFactors: riskFactorsPayload });
      // Persist risk factors (non-blocking)
      fireApi(
        patientService.submitRiskFactors(assessmentId, { patientId: Number(f.patientId), userId, riskFactors: riskFactorsPayload }),
        "risk factors"
      );

      // Defensive: ensure vitals are persisted (awaited) before evaluate so the
      // backend rule engine sees them AND so the assessment row has them stored
      // regardless of whether the fire-and-forget Step 2 call landed.
      const finalVitals = {
        bp_systolic: f.bpS !== "" && f.bpS !== undefined ? Number(f.bpS) : undefined,
        bp_diastolic: f.bpD !== "" && f.bpD !== undefined ? Number(f.bpD) : undefined,
        heart_rate: f.hr !== "" && f.hr !== undefined ? Number(f.hr) : undefined,
        respiration_rate: f.rr !== "" && f.rr !== undefined ? Number(f.rr) : undefined,
        spo2: f.spo !== "" && f.spo !== undefined ? Number(f.spo) : undefined,
        temp: f.temp !== "" && f.temp !== undefined ? Number(f.temp) : undefined,
        pregnant: true,
        notes: f.vitalSignsNotes || undefined,
      };
      try {
        setGenStage("Confirming vital signs…");
        console.log("[TRIAGE] Step 5 — confirming vitals persistence", { assessmentId, finalVitals });
        await patientService.submitVitals(assessmentId, finalVitals, { patientId: Number(f.patientId), userId });
        console.log("[TRIAGE] Vitals confirmed persisted");
      } catch (err: any) {
        // If POST fails with 409/already-exists, try PUT for re-triage updates
        console.warn("[TRIAGE] Vitals POST failed, attempting PUT update:", err?.status, err?.message);
        try {
          await patientService.updateVitals(assessmentId, finalVitals, { patientId: Number(f.patientId), userId });
          console.log("[TRIAGE] Vitals updated via PUT");
        } catch (putErr) {
          console.error("[TRIAGE] Both vitals POST and PUT failed:", putErr);
        }
      }

      // Ask server for the authoritative priority via evaluate
      try {
        setGenStage("Running AI + rule engine…");
        console.log("[TRIAGE] Calling evaluate for server priority", { patientId: f.patientId });
        const condKeySet = new Set<string>((f.condKeys as string[]) || []);
        const evalResp = await patientService.evaluate({
          signsSymptoms: {
            ...Object.fromEntries(SS_KEYS.map((k) => [k, condKeySet.has(k)])),
          },
          vitals: {
            bp_systolic: f.bpS ? Number(f.bpS) : undefined,
            bp_diastolic: f.bpD ? Number(f.bpD) : undefined,
            heart_rate: f.hr ? Number(f.hr) : undefined,
            respiration_rate: f.rr ? Number(f.rr) : undefined,
            spo2: f.spo ? Number(f.spo) : undefined,
            temp: f.temp ? Number(f.temp) : undefined,
            pregnant: true,
          },
          riskFactors: riskFactorsPayload,
        });
        if (evalResp.priority) {
          finalPriority = evalResp.priority;
          console.log("[TRIAGE] Server priority:", finalPriority, "| triggered:", evalResp.triggeredRules?.length ?? 0, "rule(s)");
        }
      } catch (err) {
        console.warn("[TRIAGE] Evaluate failed — using local calcPriority:", localPriority, err);
      }

      // Set clinical disposition status based on priority now that triage is complete
      const postTriageStatus = finalPriority <= 2 ? "Awaiting urgent review" : "Monitoring in waiting area";
      fireApi(
        patientService.updateDisposition(assessmentId, { status: postTriageStatus }),
        `finalize assessment (status → ${postTriageStatus})`
      );
    } else if (f.patientId) {
      // Fallback: no assessmentId (step-1 API call failed) — create full assessment now
      console.warn("[TRIAGE] No assessmentId from step 1 — creating full assessment as fallback");
      try {
        const condKeySet = new Set<string>((f.condKeys as string[]) || []);
        const resp = await patientService.createAssessment({
          patientId: Number(f.patientId),
          patientFileId: (f as any).patientFileId ? Number((f as any).patientFileId) : undefined,
          userId,
          gestationWeeks: f.gestAge !== "" && f.gestAge !== undefined ? Number(f.gestAge) : undefined,
          status: "completed",
          signsSymptoms: {
            ...Object.fromEntries(SS_KEYS.map((k) => [k, condKeySet.has(k)])),
          },
          vitals: {
            bp_systolic: f.bpS ? Number(f.bpS) : undefined,
            bp_diastolic: f.bpD ? Number(f.bpD) : undefined,
            heart_rate: f.hr ? Number(f.hr) : undefined,
            respiration_rate: f.rr ? Number(f.rr) : undefined,
            spo2: f.spo ? Number(f.spo) : undefined,
            temp: f.temp ? Number(f.temp) : undefined,
            pregnant: true,
            notes: f.vitalSignsNotes || undefined,
          },
          foetalMonitoring: {
            foetal_heart_rate: f.fhr ? Number(f.fhr) : undefined,
            foetal_movement: (f.fmov as any) || undefined,
            ctg_notes: f.ctg || undefined,
          },
          vaginalExam: {
            cervical_dilation: f.cx !== undefined && f.cx !== "" ? Number(f.cx) : undefined,
            examination_notes: f.vaginalNotes || undefined,
          },
          riskFactors: riskFactorsPayload,
        });
        assessmentId = resp.id;
        if (resp.priority) finalPriority = resp.priority;
        console.log("[TRIAGE] Fallback assessment created — id:", resp.id, "priority:", resp.priority);
      } catch (err) {
        console.warn("[TRIAGE] Fallback assessment failed — using local priority:", localPriority, err);
      }
    } else {
      console.warn("[TRIAGE] No patientId — all API calls skipped, using local priority only");
    }

    console.log("[TRIAGE] Complete — priority:", finalPriority, "assessmentId:", assessmentId);
    toast?.success("Triage assessment complete");
    // Fetch the latest assessment from the backend to ensure UI is in sync with backend-calculated priority
    try {
      if (!assessmentId) {
        toast?.error("No assessmentId available for fetching latest assessment.");
        return;
      }
      setGenStage("Fetching final result…");
      const latestAssessment = await patientService.getAssessment(assessmentId);
      // Parse JSON fields if needed (depends on your API)
      if (typeof latestAssessment.signsSymptoms === "string") latestAssessment.signsSymptoms = JSON.parse(latestAssessment.signsSymptoms);
      if (typeof latestAssessment.vitals === "string") latestAssessment.vitals = JSON.parse(latestAssessment.vitals);
      if (typeof latestAssessment.foetalMonitoring === "string") latestAssessment.foetalMonitoring = JSON.parse(latestAssessment.foetalMonitoring);
      if (typeof latestAssessment.vaginalExam === "string") latestAssessment.vaginalExam = JSON.parse(latestAssessment.vaginalExam);
      if (typeof latestAssessment.riskFactors === "string") latestAssessment.riskFactors = JSON.parse(latestAssessment.riskFactors);
      if ('urinaryAnalysis' in latestAssessment && typeof (latestAssessment as any).urinaryAnalysis === "string") {
        (latestAssessment as any).urinaryAnalysis = JSON.parse((latestAssessment as any).urinaryAnalysis);
      }
      // If getAssessment did not return obstetricConditions[], try patient summary as fallback
      // (some BE endpoints only populate them on the summary view).
      if (!Array.isArray((latestAssessment as any).obstetricConditions) || (latestAssessment as any).obstetricConditions.length === 0) {
        try {
          const patientIdForSummary = (latestAssessment as any).patientId ?? f.patientId;
          if (patientIdForSummary) {
            const summary: any = await patientService.getPatientSummary(Number(patientIdForSummary));
            const summaryConds = summary?.latestAssessment?.obstetricConditions;
            if (Array.isArray(summaryConds) && summaryConds.length) {
              (latestAssessment as any).obstetricConditions = summaryConds;
            }
          }
        } catch (sumErr) {
          console.warn("[TRIAGE] Patient summary fallback for obstetricConditions failed", sumErr);
        }
      }
      onResult({
        ...f,
        priority: latestAssessment.priority,
        assessmentId,
        sourcePatientId: initialData?.id,
        latestAssessment
      });
    } catch (err) {
      console.error("[TRIAGE] Failed to fetch latest assessment, falling back to local result", err);
      onResult({
        ...f,
        priority: finalPriority,
        assessmentId,
        sourcePatientId: initialData?.id,
        latestAssessment: {
          ...(f.latestAssessment || {}),
          priority: finalPriority,
          status: finalPriority <= 2 ? "Awaiting urgent review" : "Monitoring in waiting area",
          vitals: {
            bp_systolic: f.bpS ? Number(f.bpS) : undefined,
            bp_diastolic: f.bpD ? Number(f.bpD) : undefined,
            heart_rate: f.hr ? Number(f.hr) : undefined,
            respiration_rate: f.rr ? Number(f.rr) : undefined,
            spo2: f.spo ? Number(f.spo) : undefined,
            temp: f.temp ? Number(f.temp) : undefined,
            pregnant: true,
            notes: f.vitalSignsNotes || undefined,
          },
          foetalMonitoring: {
            foetal_heart_rate: f.fhr ? Number(f.fhr) : undefined,
            foetal_movement: f.fmov || undefined,
            ctg_notes: f.ctg || undefined,
          },
          vaginalExam: {
            cervical_dilation: f.cx !== undefined && f.cx !== "" ? Number(f.cx) : undefined,
            examination_notes: f.vaginalNotes || undefined,
          },
          assessedAt: new Date().toISOString(),
        },
      });
    }
    onNav("result");
  }

  const stepIcons = [
    <IconUser size={14} />,
    <IconPill size={14} />,
    <IconHeartPulse size={14} />,
    <IconTestTube size={14} />,
    <IconWarning size={14} />,
  ];

const IMPRESSION_MAP: Record<string, string> = {
  eclampsia: "Impression: Eclampsia / Seizures",
  imminent_eclampsia: "Impression: Imminent Eclampsia",
  aph: "Impression: Active Antepartum Haemorrhage (APH)",
  cord_prolapse: "Impression: Cord Prolapse",
  loc: "Impression: Loss of Consciousness / Maternal Collapse",
  mec3: "Impression: PROM with Meconium-Stained Liquor Grade 3",
  prev_csection_twice: "Impression: Previous C-Section ×2 or More in Labour",
  fresh_scar_labour: "Impression: Fresh Uterine Scar in Labour",
  absent_fetal_movement: "Impression: Absent / Decreased Foetal Movements — Foetal Distress",
  advanced_labour: "Impression: Advanced Stage of Labour / Prolonged 2nd Stage",
  cephalopelvic: "Impression: Possible Cephalopelvic Disproportion",
  sev_pec: "Impression: Severe Pre-Eclampsia",
  preterm: "Impression: Preterm Labour",
  pprom: "Impression: Preterm Prelabour Rupture of Membranes (PPROM)",
  multi_labour: "Impression: Multiple Pregnancy in Labour",
  sob: "Impression: Acute Shortness of Breath / Respiratory Distress",
  msl_grade1_2: "Impression: PROM with Meconium-Stained Liquor Grade 1 or 2",
  plac_praevia: "Impression: Placenta Praevia",
  pre_ec: "Impression: Pre-Eclampsia (not severe)",
  gest_htn: "Impression: Gestational Hypertension",
  gest_dm: "Impression: Gestational Diabetes — Poor Control",
  vbac: "Impression: VBAC in Labour",
  grand_multi: "Impression: Grand Multiparity in Labour",
  multigravida_latent: "Impression: Multigravida in Latent-Active Phase of Labour",
  post_dates: "Impression: Post-Dates Pregnancy (>42 weeks)",
  false_labour: "Impression: False Labour / Braxton Hicks",
  uti: "Impression: Urinary Tract Infection in Pregnancy",
  nv: "Impression: Nausea / Vomiting / Diarrhoea",
  mild_cx: "Impression: Mild Irregular Contractions",
  routine: "Impression: Routine Antenatal Visit",
};

  function deriveImpression(condKeys: string[]): string[] {
    if (!condKeys?.length) return [];
    return condKeys
      .map((k) => IMPRESSION_MAP[k])
      .filter(Boolean);
  }

  return (
    <div className="fade-in" style={{ minHeight: "100dvh", background: C.bgSoft, display: "flex", flexDirection: "column" }}>
      <Hdr title={`Step ${step} of ${STEPS.length} · ${STEPS[step - 1]}`} onBack={() => (step > 1 ? setStep((s) => s - 1) : onNav("welcome"))} />
      <div style={{ background: C.borderMid, height: 4, flexShrink: 0 }}>
        <div style={{ background: C.gradGreen, height: "100%", width: `${pct}%`, transition: "width .4s cubic-bezier(.22,1,.36,1)", borderRadius: "0 4px 4px 0", boxShadow: "0 0 8px rgba(30,123,71,.4)" }} />
      </div>
      <div style={{ background: C.bg, padding: "10px 12px", display: "flex", gap: 6, overflowX: "auto", flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        {STEPS.map((st, i) => (
          <div key={st} onClick={() => setStep(i + 1)} style={{
            padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", transition: "all .15s",
            background: step === i + 1 ? C.gradGreen : step > i + 1 ? C.greenL : "transparent",
            color: step === i + 1 ? "white" : step > i + 1 ? C.green : C.textMuted,
            border: `1.5px solid ${step === i + 1 ? C.green : step > i + 1 ? C.greenL : C.border}`,
            boxShadow: step === i + 1 ? "0 2px 8px rgba(30,123,71,.3)" : "none",
          }}>
            {stepIcons[i]} {st}
          </div>
        ))}
      </div>

      <div className="fade-in" style={{ flex: 1, padding: "16px 14px 100px", overflowY: "auto" }}>
        {initialData?.id && (
          <div className="fade-up" style={{ background: C.purpleL, border: `1.5px solid ${C.purpleM}30`, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.purple, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Re-triage in Progress</div>
            <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6 }}>Updating existing assessment. Adjust findings and regenerate priority.</div>
          </div>
        )}

        {step === 1 && (
          <div className="fade-up">
            <Card>
              <SectionLabel color={C.green} mb={16}>Patient Demographics</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Inp label="Name" placeholder="Nomsa" value={f.name} onChange={s("name")} />
                <Inp label="Surname" placeholder="Khumalo" value={f.surname} onChange={s("surname")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <Inp label="Contact" placeholder="+27 81 674 3322" value={f.cell} type="tel"
                    onChange={(e: any) => {
                      const formatted = formatCellNumber(e.target.value);
                      sf((p: any) => ({ ...p, cell: formatted }));
                      setCellError(validateCellNumber(formatted));
                    }}
                  />
                  {cellError && <div style={{ fontSize: 11, color: "#DC2626", marginTop: -10, marginBottom: 8, paddingLeft: 2 }}>{cellError}</div>}
                </div>
                <div>
                  <Inp label="ID / Passport Number" placeholder="9205146710904 or AB123456" value={f.idNumber} onChange={(e: any) => { const val = e.target.value; sf((p: any) => ({ ...p, idNumber: val })); const clean = val.replace(/\s/g, ""); if (clean.length >= 5) { const r = parseSAID(val); setIdError(r.valid ? null : (r.error ?? "Invalid ID / Passport")); } else { setIdError(null); } }} maxLength={13} />
                  {idError && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 4, paddingLeft: 2 }}>{idError}</div>}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Inp label="Gestational Age (wks)" type="number" placeholder="38" value={f.gestAge} onChange={s("gestAge")} alert={vitalAlerts.gestAge} />
                <ComboSel label="Gravida" opts={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((v) => ({ v: String(v), lb: `G${v}` }))} value={f.gravida} onChange={s("gravida")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <ComboSel label="Para" opts={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((v) => ({ v: String(v), lb: `P${v}` }))} value={f.para} onChange={s("para")} />
                {(parseInt(f.para) >= 5) && (
                  <div style={{ background: C.p1bg, border: `1.5px solid ${C.p1b}`, borderRadius: 12, padding: "12px 14px", fontSize: 13, color: C.p1, fontWeight: 700, marginBottom: 12, boxShadow: `0 2px 8px ${C.p1}25` }}>
                    {"Multi GrandPara"}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="fade-up">
            <Card s={{ marginBottom: 14 }}>
              <SectionLabel color={C.green} mb={6}>Presenting Condition(s)</SectionLabel>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
                Select all relevant presenting conditions. Priority will be based on the most urgent condition.
              </div>
              {(() => {
                const PRESENTING_CONDITIONS: { k: string; lb: string }[] = [
                  { k: "false_labour", lb: "False labour" },
                  { k: "urinary_tract_infections", lb: "Urinary tract infections" },
                  { k: "vomiting", lb: "Vomiting" },
                  { k: "diarrhoea", lb: "Diarrhoea" },
                  { k: "low_risk_pregnancies", lb: "Low risk pregnancies" },
                ];
                const pc = (f.presentingConditions || {}) as Record<string, boolean>;
                const togglePC = (k: string) => sf((p: any) => ({
                  ...p,
                  presentingConditions: { ...(p.presentingConditions || {}), [k]: !(p.presentingConditions || {})[k] },
                }));
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, justifyContent: "center" }}>
                    {PRESENTING_CONDITIONS.map(({ k, lb }) => {
                      const active = !!pc[k];
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => togglePC(k)}
                          aria-pressed={active}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 14px",
                            borderRadius: 999,
                            border: `1.5px solid ${active ? C.green : C.border}`,
                            background: active ? `${C.green}15` : C.bg,
                            color: active ? C.green : C.textMid,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all .15s",
                            boxShadow: active ? `0 0 0 3px ${C.green}10` : "none",
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 4,
                              border: `1.5px solid ${active ? C.green : C.border}`,
                              background: active ? C.green : "transparent",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 900,
                              lineHeight: 1,
                            }}
                            aria-hidden
                          >
                            {active ? "✓" : ""}
                          </span>
                          {lb}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              {/* Separator between Presenting Conditions and Signs & Symptoms */}
              <div
                aria-hidden
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  margin: "18px 0 14px",
                  color: C.textMuted,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${C.border}, ${C.border})` }} />
                <span>and</span>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${C.border}, ${C.border})` }} />
              </div>
              <MultiConditionSelect
                selectedKeys={[
                  ...((f.condKeys || []).filter((k: string) => !k.startsWith("custom:") && !k.startsWith("custom_"))),
                  ...((Array.isArray(f.customSymptoms) ? f.customSymptoms : []) as string[]).map((s: string) => `custom:${s}`),
                ]}
                signsSymptomsObj={f.signsSymptoms || undefined}
                onChange={(keys: string[]) => {
                  const stripCustom = (k: string) => k.replace(/^custom[:_]/, "");
                  const std = keys.filter((k) => !k.startsWith("custom:") && !k.startsWith("custom_"));
                  const custom = keys.filter((k) => k.startsWith("custom:") || k.startsWith("custom_"))
                    .map(stripCustom);
                  sf((prev) => ({ ...prev, condKeys: std, customSymptoms: custom }));
                }}
                placeholder="Select presenting signs and symptoms..."
              />
                   {/* Impression block — shown once conditions are selected */}
      {(() => {
        const impressions = deriveImpression(f.condKeys || []);
        const customList: string[] = Array.isArray(f.customSymptoms) ? f.customSymptoms.filter((s: string) => s && s.trim()) : [];
        const hasOther = customList.length > 0;
        if (!impressions.length && !hasOther) return null;
        return (
          <div style={{
            marginTop: 16,
            background: C.purpleL || "#F5F3FF",
            border: `1.5px solid ${C.purpleM || "#7C3AED"}30`,
            borderRadius: 14,
            padding: "14px 16px",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 800, color: C.purple || "#7C3AED",
              textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10,
            }}>
              Clinical Impression
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, lineHeight: 1.6 }}>
              Based on the captured signs and symptoms, the following impression(s) are indicated. This is not a definitive diagnosis — clinical judgement applies.
            </div>
            {impressions.map((imp) => (
              <div key={imp} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", marginBottom: 6,
                background: "rgba(124,58,237,.08)",
                borderRadius: 10,
                border: `1px solid ${C.purpleM || "#7C3AED"}20`,
              }}>
                <IconStethoscope size={14} color={C.purple || "#7C3AED"} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.purple || "#7C3AED" }}>
                 {imp}
                </span>
              </div>
            ))}
            {hasOther && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "9px 12px", marginBottom: 6,
                background: "rgba(124,58,237,.05)",
                borderRadius: 10,
                border: `1px solid ${C.purpleM || "#7C3AED"}20`,
              }}>
                <IconWarning size={14} color={C.purple || "#7C3AED"} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.purple || "#7C3AED", lineHeight: 1.6 }}>
                  <strong>Other:</strong> {customList.join(", ")}
                </span>
              </div>
            )}
          </div>
        );
      })()}
            </Card>
            <Card>
              <SectionLabel color={C.green} mb={14}>Vital Signs</SectionLabel>
              {activeAlertList.length > 0 && (
                <div style={{ background: p1LiveCount > 0 ? C.p1bg : C.p2bg, border: `1.5px solid ${p1LiveCount > 0 ? C.p1b : C.p2b}`, borderRadius: 12, padding: "10px 12px", fontSize: 12, color: p1LiveCount > 0 ? C.p1 : C.p2, fontWeight: 700, marginBottom: 12, boxShadow: `0 2px 8px ${p1LiveCount > 0 ? C.p1 : C.p2}25` }}>
                  {p1LiveCount > 0 ? <IconSiren size={14} /> : <IconBolt size={14} />} Live Alert: {p1LiveCount > 0 ? `${p1LiveCount} critical threshold${p1LiveCount > 1 ? "s" : ""} crossed` : `${activeAlertList.length} abnormal vital value${activeAlertList.length > 1 ? "s" : ""} detected`}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Inp label="BP Systolic (mmHg)" type="number" placeholder="120" value={f.bpS} onChange={s("bpS")} alert={vitalAlerts.bpS} />
                <Inp label="BP Diastolic (mmHg)" type="number" placeholder="80" value={f.bpD} onChange={s("bpD")} alert={vitalAlerts.bpD} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Inp label="Heart Rate (bpm)" type="number" placeholder="88" value={f.hr} onChange={s("hr")} alert={vitalAlerts.hr} />
                <Inp label="Resp. Rate (/min)" type="number" placeholder="18" value={f.rr} onChange={s("rr")} alert={vitalAlerts.rr} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Inp label="SpO₂ (%)" type="number" placeholder="98" value={f.spo} onChange={s("spo")} alert={vitalAlerts.spo} />
                <Inp label="Temperature (°C)" type="number" placeholder="36.6" value={f.temp} onChange={s("temp")} />
              </div>

              {/* Divider between Vital Signs and Urinalysis */}
              <div aria-hidden style={{ height: 1.5, background: `linear-gradient(to right, transparent, ${C.borderMid || "#CBD5E1"} 15%, ${C.borderMid || "#CBD5E1"} 85%, transparent)`, margin: "24px 0 18px" }} />
              <SectionLabel color={C.green} mb={14}>Urinalysis</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <ComboSel label="Protein" opts={[1, 2, 3].map((v) => ({ v: String(v), lb: `${v}+` }))} value={f.Protein} onChange={s("Protein")} />
                <ComboSel label="Leukocytes" opts={[1, 2, 3].map((v) => ({ v: String(v), lb: `${v}+` }))} value={f.Leukocytes} onChange={s("Leukocytes")} />
                <ComboSel label="Haematuria" opts={[1, 2, 3].map((v) => ({ v: String(v), lb: `${v}+` }))} value={f.Haematuria} onChange={s("Haematuria")} />
                <ComboSel label="Blood" opts={['Neg',1, 2, 3].map((v) => ({ v: String(v), lb: v === 'Neg' ? 'Neg' : `${v}+` }))} value={f.Blood} onChange={s("Blood")} /> 
                <ComboSel label="Nitrite" opts={['Neg','Pos'].map((v) => ({ v: String(v), lb: `${v}` }))} value={f.Nitrite} onChange={s("Nitrite")} />   
                <ComboSel label="Glucose" opts={[1, 2, 3].map((v) => ({ v: String(v), lb: `${v}+` }))} value={f.Glucose} onChange={s("Glucose")} />
                <ComboSel label="SG" opts={['1.000', '1.005', '1.010', '1.015'].map((v) => ({ v: String(v), lb: `${v}` }))} value={f.SG} onChange={s("SG")} />  
                <ComboSel label="Bilirubin" opts={['Neg',1, 2, 3].map((v) => ({ v: String(v), lb: v === 'Neg' ? 'Neg' : `${v}+` }))} value={f.Bilirubin} onChange={s("Bilirubin")} />
                <ComboSel label="pH" opts={['5', '6', '6.5', '7'].map((v) => ({ v: String(v), lb: `${v}` }))} value={f.ph} onChange={s("ph")} />         
              </div>

              {/* Divider between Urinalysis and Vital Signs Notes */}
              <div aria-hidden style={{ height: 1.5, background: `linear-gradient(to right, transparent, ${C.borderMid || "#CBD5E1"} 15%, ${C.borderMid || "#CBD5E1"} 85%, transparent)`, margin: "24px 0 18px" }} />
              <div style={{ marginTop: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Vital Signs Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Document any additional observations, concerns, or notes about vital signs..."
                  value={f.vitalSignsNotes || ""}
                  onChange={(e) => sf((prev) => ({ ...prev, vitalSignsNotes: e.target.value }))}
                  style={{
                    width: "100%", padding: "12px 15px", border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 14, color: C.text, background: C.bg,
                    resize: "vertical", transition: "all .15s", boxShadow: "0 1px 3px rgba(0,0,0,.04)", lineHeight: 1.7, fontFamily: "'Outfit', 'DM Sans'",
                  }}
                />
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, paddingLeft: 2 }}>
                  Add clinical notes, trends, or additional context about vital signs
                </div>
              </div>
              <div style={{ background: C.bgDeep, borderRadius: 12, padding: "12px 14px", fontSize: 12, lineHeight: 1.85, color: C.textMid, marginTop: 6, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 800, marginBottom: 6, color: C.text, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>SATS 2012 Reference</div>
                <div><span style={{ color: C.p1, fontWeight: 700 }}>P1 ·</span> BP ≥160/110 · HR &gt;140 or &lt;50 · RR &gt;60 · SpO₂ &lt;85%</div>
                <div><span style={{ color: C.p2, fontWeight: 700 }}>P2 ·</span> BP 150/100 · HR &gt;120 · RR &gt;30 · SpO₂ &lt;90%</div>
                <div><span style={{ color: C.p3, fontWeight: 700 }}>P3 ·</span> BP 140/90 · HR &gt;110</div>
                <div><span style={{ color: C.p4, fontWeight: 700 }}>P4 ·</span> BP 110–139/60–89 · HR 60–110 · RR 16–24</div>
              </div>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="fade-up">
            <Card>
              <SectionLabel color={C.green} mb={14}>Foetal Monitoring</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Inp label="Foetal Heart Rate (bpm)" type="number" placeholder="145" value={f.fhr} onChange={s("fhr")} alert={vitalAlerts.fhr} />
                <Sel label="Foetal Movement" opts={[{ v: "present", lb: "Present / Normal" }, { v: "decreased", lb: "Decreased" }, { v: "absent", lb: "Absent" }]} value={f.fmov} onChange={s("fmov")} />
              </div>
              {(f.fmov === "decreased" || f.fmov === "absent") && (
                <div style={{ background: C.p1bg, border: `1.5px solid ${C.p1b}`, borderRadius: 12, padding: "12px 14px", fontSize: 13, color: C.p1, fontWeight: 700, marginBottom: 12, boxShadow: `0 2px 8px ${C.p1}25` }}>
                  <IconSiren size={14} style={{ display: "inline-block", verticalAlign: "middle" }} /> {f.fmov === "absent" ? "Absent foetal movement — P1 EMERGENCY" : "Decreased foetal movement — escalate priority"}
                </div>
              )}
              <div style={{ background: C.bgDeep, borderRadius: 12, padding: "12px 14px", fontSize: 12, lineHeight: 1.9, color: C.textMid, marginTop: 8, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 800, color: C.text, marginBottom: 6, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>FHR Reference</div>
                <div><span style={{ color: C.p4, fontWeight: 700 }}>Normal ·</span> 140–160 bpm with good variability</div>
                <div><span style={{ color: C.p1, fontWeight: 700 }}>P1 ·</span> FHR &lt;100 bpm or absent movement</div>
                <div><span style={{ color: C.p2, fontWeight: 700 }}>P2 ·</span> FHR &lt;110 bpm or &gt;170 bpm</div>
              </div>
              <div style={{ marginTop: 14 }}>
                <Txt label="CTG Monitoring Notes" rows={4} placeholder="Document variability, decelerations, contractions, or any trace concerns" value={f.ctg} onChange={s("ctg")} />
              </div>
            </Card>
          </div>
        )}

        {step === 4 && (
          <div className="fade-up">
            <Card>
              <SectionLabel color={C.green} mb={14}>Vaginal Examination</SectionLabel>
              <Sel label="Cervical Dilation (cm)" opts={[{ v: "-1", lb: "Not examined" }, { v: "0", lb: "Closed" }, ...Array.from({ length: 10 }, (_, i) => ({ v: String(i + 1), lb: `${i + 1} cm` }))]} value={f.cx} onChange={s("cx")} style={vitalAlerts.cx ? { borderColor: pC(vitalAlerts.cx.priority), boxShadow: `0 0 0 3px ${pC(vitalAlerts.cx.priority)}20` } : {}} />
              {vitalAlerts.cx && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: -4, marginBottom: 12, padding: "5px 10px", borderRadius: 999, background: pBg(vitalAlerts.cx.priority), border: `1px solid ${pC(vitalAlerts.cx.priority)}40`, fontSize: 11, fontWeight: 700, color: pC(vitalAlerts.cx.priority) }}>
                  <span>{vitalAlerts.cx.priority === 1 ? <IconSiren size={12} /> : vitalAlerts.cx.priority === 2 ? <IconBolt size={12} /> : <IconWarning size={12} />}</span>
                  <span>{vitalAlerts.cx.text}</span>
                </div>
              )}
              {parseInt(f.cx) > 0 && (() => {
                const cx = parseInt(f.cx);
                const [bg, brd, col, msg] = cx > 8
                  ? [C.p1bg, C.p1b, C.p1, "P1 — Imminent delivery or advanced labour"]
                  : cx === 8
                    ? [C.p2bg, C.p2b, C.p2, "P2 — Active labour, close monitoring required"]
                    : cx >= 5
                      ? [C.p3bg, C.p3b, C.p3, "P3 — Labour in progress / Active Phase"]
                      : cx < 5
                        ? [C.p4bg, C.p4b, C.p4, "P4 — Early / Latent Phase"]
                        : ["#F9FAFB", C.border, C.textMuted, "Cervical dilation recorded"];
                return (
                  <div style={{ background: bg, border: `1.5px solid ${brd}`, borderRadius: 12, padding: "12px 14px", fontSize: 13, color: col, fontWeight: 700, marginBottom: 12, boxShadow: `0 2px 8px ${col}20` }}>{msg}</div>
                );
              })()}
              <div style={{ marginTop: 14 }}>
                <Txt label="Vaginal Examination Notes" rows={4} placeholder="Document any observations while cervical examination is conducted" value={f.vaginalNotes || ""} onChange={s("vaginalNotes")} />
              </div>
              <div style={{ background: C.bgDeep, borderRadius: 12, padding: "12px 14px", fontSize: 12, lineHeight: 1.9, color: C.textMid, marginTop: 8, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 800, color: C.text, marginBottom: 6, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Dilation Reference</div>
                <div><span style={{ color: C.p1, fontWeight: 700 }}>P1 ·</span> &gt;8 cm — Immediate</div>
                <div><span style={{ color: C.p2, fontWeight: 700 }}>P2 ·</span> 8 cm — ≤10 minutes</div>
                <div><span style={{ color: C.p3, fontWeight: 700 }}>P3 ·</span> 5–7 cm — ≤30 minutes</div>
                <div><span style={{ color: C.p4, fontWeight: 700 }}>P4 ·</span> 1–4 cm — ≤1 hour</div>
              </div>
            </Card>
          </div>
        )}

        {step === 5 && (
          <div className="fade-up">
            <Card>
              <SectionLabel color={C.green} mb={6}>Risk Factors</SectionLabel>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
                Select all relevant risk factors. Priority will be adjusted based on the selections made.
              </div>
              <MultiRiskFactorSelect
                selectedKeys={[
                  ...((f.riskCondKeys || []).filter((k: string) => !k.startsWith("custom:") && !k.startsWith("custom_"))),
                  ...((Array.isArray(f.rfCustom) ? f.rfCustom : []) as string[]).map((s: string) => `custom:${s}`),
                ]}
                riskFactorsObj={f.riskFactorsObj || undefined}
                onChange={(keys: string[]) => {
                  const stripCustom = (k: string) => k.replace(/^custom[:_]/, "");
                  const std = keys.filter((k) => !k.startsWith("custom:") && !k.startsWith("custom_"));
                  const custom = keys.filter((k) => k.startsWith("custom:") || k.startsWith("custom_")).map(stripCustom);
                  sf((prev) => ({
                    ...prev,
                    riskCondKeys: std,
                    rfCustom: custom,
                    riskFactorsObj: {
                      previous_caesarean: std.includes("previous_caesarean"),
                      chronic_hypertension: std.includes("chronic_hypertension"),
                      diabetes_mellitus: std.includes("diabetes_mellitus"),
                      grand_multiparity: std.includes("grand_multiparity"),
                      advanced_maternal_age: std.includes("advanced_maternal_age"),
                      multiple_pregnancy: std.includes("multiple_pregnancy"),
                      rhesus_incompatibility: std.includes("rhesus_incompatibility"),
                      hiv_positive: std.includes("hiv_positive"),
                      severe_anaemia: std.includes("severe_anaemia"),
                      previous_pph: std.includes("previous_pph"),
                    },
                  }));
                }}
              />
            </Card>
          </div>
        )}
      </div>

      {saveError && (
        <div style={{ position: "fixed", bottom: 76, left: 0, right: 0, width: "100%", margin: "0 auto", padding: "0 14px", zIndex: 10 }}>
          <div style={{ background: "#FFF7ED", border: "1.5px solid #F97316", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#9A3412", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ flexShrink: 0, fontSize: 14 }}>⚠️</span>
            <span style={{ lineHeight: 1.6 }}>{saveError}<br /><strong>You can continue — data will be re-synced when the service is available.</strong></span>
          </div>
        </div>
      )}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.bg, borderTop: `1px solid ${C.border}`, padding: "14px 16px", display: "flex", gap: 10, width: "100%", margin: "0 auto", boxShadow: "0 -4px 20px rgba(0,0,0,.08)" }}>
        {step > 1 && <Btn variant="ghost" onClick={() => setStep((x) => x - 1)} s={{ flex: 1, padding: "13px 0" }}><IconArrowLeft size={14} style={{ marginRight: 4 }} /> Back</Btn>}
        {step < STEPS.length
          ? <Btn
              onClick={async () => {
                if (step === 1) {
                  const ok = await saveStep1();
                  if (!ok) return;
                } else if (step === 2) {
                  void persistStep2();
                } else if (step === 3) {
                  persistStep3();
                } else if (step === 4) {
                  persistStep4();
                }
                setStep((x) => x + 1);
              }}
              s={{ flex: 2, padding: "13px 0", opacity: savingStep ? 0.7 : 1 }}
              disabled={savingStep}
            >
              {savingStep ? "Saving…" : <>Next Step <IconArrowRight size={14} style={{ marginLeft: 4 }} /></>}
            </Btn>
          : <Btn
              onClick={go}
              disabled={generating}
              s={{ flex: 2, padding: "13px 0", background: C.p1grd, fontSize: 15, opacity: generating ? 0.75 : 1 }}
            >
              <IconStethoscope size={16} color="white" style={{ marginRight: 6 }} />
              {generating ? "Generating…" : "Generate Triage Result"}
            </Btn>
        }
      </div>

      {/* Generation progress overlay — surfaces multi-second AI classifier
          + evaluate round-trip so the operator sees the pipeline running. */}
      {generating && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: C.bg,
              borderRadius: 18,
              padding: "26px 28px",
              width: "100%", 
              margin: "0 auto",
              textAlign: "center",
              boxShadow: "0 12px 40px rgba(0,0,0,.3)",
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: `4px solid ${C.greenL}`,
                borderTopColor: C.green,
                margin: "0 auto 16px",
                animation: "spin 0.9s linear infinite",
              }}
            />
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 6 }}>
              Generating triage result
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, minHeight: 32 }}>
              {genStage || "Preparing assessment…"}
            </div>
            <div style={{ fontSize: 10, color: C.textLight, marginTop: 10 }}>
              The AI classifier can take a few seconds — please don't navigate away.
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
