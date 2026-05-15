import { useEffect, useState } from "react";
import { C, pC, pGrd, pLbl, pTm } from "../constants/theme";
import { Btn, Tag, SectionLabel } from "../components/ui";
import { DecisionExplanation } from "../components/DecisionExplanation";
import { AiTriagePanel } from "../components/AiTriagePanel";
import { TriageDecisionStrip } from "../components/TriageDecisionStrip";
import { ChecklistSkeleton } from "../components/Skeletons";
import { IconArrowLeft, IconCheck } from "../components/icons";
import { priorityColor, priorityLabel, priorityTargetTime, obstetricConditionByCode } from "../services/catalogService";
import { patientService, type ChecklistItem } from "../services/Patientservice";


interface ResultScreenProps {
  onNav: (screen: string) => void;
  result: any;
  onSaveResult: () => void;
  onEditAssessment: () => void;
}

export function ResultScreen({ onNav, result, onSaveResult, onEditAssessment }: ResultScreenProps) {
  if (!result) return null;
  // Debug log for priorities
  console.log("[ResultScreen] priority:", result.priority, "latestAssessment.priority:", result.latestAssessment?.priority);
  // Prefer latestAssessment fields if present (API shape), fallback to result
  const la = result.latestAssessment;
  const legacyPriority: number = (la?.priority || result.priority) as number;
  const finalPriorityId: number = (la?.finalPriorityId || result.finalPriorityId || legacyPriority) as number;
  const name = result.name ?? la?.name ?? "";
  const surname = result.surname ?? la?.surname ?? "";
  const age = result.age ?? la?.age ?? "—";
  const gestAge = result.gestAge ?? la?.gestational_age_weeks ?? la?.ga ?? "—";
  const bpS = result.bpS ?? la?.vitals?.bp_systolic ?? "";
  const bpD = result.bpD ?? la?.vitals?.bp_diastolic ?? "";
  const hr = result.hr ?? la?.vitals?.heart_rate ?? "";
  const rr = result.rr ?? la?.vitals?.respiration_rate ?? "";
  const spo = result.spo ?? la?.vitals?.spo2 ?? "";
  const fhr = result.fhr ?? la?.foetalMonitoring?.foetal_heart_rate ?? "";
  const cx = result.cx ?? la?.vaginalExam?.cervical_dilation ?? "";

  // Catalog-driven color — fallback to legacy pC() if catalog not loaded
  const catColor = priorityColor(finalPriorityId);
  const col = catColor !== "#6B7280" ? catColor : pC(legacyPriority);
  const catLabel = priorityLabel(finalPriorityId);
  const catTarget = priorityTargetTime(finalPriorityId);

  // Fetch management checklist from backend (no more hardcoded MGMT[])
  const assessmentId: number | undefined = result.assessmentId ?? la?.id ?? la?.assessmentId;
  const [checklist, setChecklist] = useState<ChecklistItem[]>(Array.isArray(la?.managementChecklist) ? la.managementChecklist : []);
  const [checklistLoading, setChecklistLoading] = useState<boolean>(!!assessmentId && checklist.length === 0);

  useEffect(() => {
    if (!assessmentId) { setChecklistLoading(false); return; }
    let cancelled = false;
    setChecklistLoading(true);
    patientService.getChecklist(assessmentId)
      .then((items) => {
        if (cancelled) return;
        const arr = Array.isArray(items) ? items : [];
        const sorted = [...arr].sort((a, b) => (a.stepOrder ?? 9999) - (b.stepOrder ?? 9999) || a.id - b.id);
        setChecklist(sorted);
      })
      .catch((err) => console.warn("[ResultScreen] getChecklist failed", err))
      .finally(() => { if (!cancelled) setChecklistLoading(false); });
    return () => { cancelled = true; };
  }, [assessmentId]);

  // Triage summary fields for AI/Rule strip
  const triageSummary = {
    finalPriorityId,
    rulePriorityId: la?.rulePriorityId ?? result.rulePriorityId ?? null,
    aiPriorityId: la?.aiPriorityId ?? result.aiPriorityId ?? null,
    aiPriorityConfidence: la?.aiPriorityConfidence ?? result.aiPriorityConfidence ?? null,
    aiInvokedAt: la?.aiInvokedAt ?? result.aiInvokedAt ?? null,
    priority: legacyPriority,
    triageSource: la?.triageSource ?? result.triageSource ?? null,
    triageMode: la?.triageMode ?? result.triageMode ?? null,
  };
  const aiTriage = la?.aiTriage ?? result.aiTriage ?? null;
  const obstetricConditions = la?.obstetricConditions ?? result.obstetricConditions ?? [];
  void obstetricConditions; // consumed by DecisionExplanation via `source`
  const triggeredRules: Array<{ action: string; obstetric_condition_code?: string | null; obstetricConditionCode?: string | null; ruleName?: string }> =
    la?.triggeredRules ?? result.triggeredRules ?? [];
  const hasAiDetails = triageSummary.aiPriorityId != null || triageSummary.aiPriorityConfidence != null;


  return (
    <div className="fade-in" style={{ minHeight: "100dvh", background: C.bgSoft }}>
      <div style={{ background: pGrd(legacyPriority), padding: "24px 20px 60px", position: "relative", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,.2)" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.08)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <button onClick={() => onNav("welcome")} className="btn-press" style={{ border: "none", background: "rgba(255,255,255,.18)", backdropFilter: "blur(8px)", borderRadius: 10, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 18 }}><IconArrowLeft size={18} color="white" /></button>
          <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,.9)" }}>Triage Result</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>Priority Assessment</div>
        <div style={{ fontSize: 52, fontWeight: 900, color: "white", lineHeight: 1, marginTop: 4, letterSpacing: "-.02em" }}>P{finalPriorityId}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,.92)", marginTop: 2 }}>{catLabel || pLbl(legacyPriority)}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", marginTop: 6, fontWeight: 500 }}>
          Target: {catTarget || pTm(legacyPriority)}
        </div>
      </div>

      <div style={{ padding: "0 14px 100px", marginTop: -28 }}>
        {/* Decision strip — how was priority determined */}
        <div className="fade-up" style={{ marginBottom: 12 }}>
          <TriageDecisionStrip summary={triageSummary} />
        </div>

        {(finalPriorityId === 1 || finalPriorityId === 2) && (
          <div className="fade-up" style={{ background: finalPriorityId === 1 ? C.p1bg : C.p2bg, border: `1.5px solid ${finalPriorityId === 1 ? C.p1b : C.p2b}`, borderRadius: 16, padding: "14px 16px", marginBottom: 14, boxShadow: `0 4px 16px ${col}20` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: col, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Immediate Next Step</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Escalate to labour suite workflow now.</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, lineHeight: 1.6 }}>Emergencies and urgent cases must move quickly to labour suites for advanced midwife management.</div>
          </div>
        )}

        <div className="fade-up" style={{ background: C.bg, borderRadius: 18, padding: "18px 16px", marginBottom: 14, boxShadow: "0 4px 16px rgba(0,0,0,.08)", border: `1px solid ${C.border}` }}>
          <SectionLabel mb={8}>Patient</SectionLabel>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-.01em" }}>{name || "—"} {surname || ""}</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>Age {age || "—"} yrs · GA {gestAge || "—"} weeks</div>
          <div style={{ marginTop: 10 }}><Tag priority={legacyPriority} /></div>
        </div>

        <div className="fade-up" style={{ background: C.bg, borderRadius: 18, padding: "18px 16px", marginBottom: 14, border: `1px solid ${C.border}`, animationDelay: ".05s" }}>
          <SectionLabel mb={12}>Recorded Values</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {([["BP", bpS && bpD ? `${bpS}/${bpD}` : "—", "mmHg"], ["HR", hr || "—", "bpm"], ["RR", rr || "—", "/min"], ["SpO₂", spo || "—", "%"], ["FHR", fhr || "—", "bpm"], ["Cervix", cx && cx !== "0" ? cx : "—", "cm"]] as const).map(([k, v, u]) => (
              <div key={k} style={{ background: C.bgDeep, borderRadius: 12, padding: "11px 12px", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>{k}</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: C.text, marginTop: 2 }}>{v}</div>
                <div style={{ fontSize: 10, color: C.textLight }}>{u}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AI confidence bar */}
        {hasAiDetails && triageSummary.aiPriorityConfidence != null && (
          <div className="fade-up" style={{ background: C.bg, borderRadius: 18, padding: "18px 16px", marginBottom: 14, border: `1px solid ${C.border}`, animationDelay: ".06s" }}>
            <SectionLabel mb={10}>AI Confidence</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, background: C.bgDeep, borderRadius: 6, height: 10, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.round(triageSummary.aiPriorityConfidence * 100)}%`,
                  background: col,
                  borderRadius: 6,
                  transition: "width .5s",
                }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: col, minWidth: 38 }}>
                {Math.round(triageSummary.aiPriorityConfidence * 100)}%
              </span>
            </div>
            {triageSummary.aiInvokedAt && (
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
                AI invoked at {new Date(triageSummary.aiInvokedAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
        )}

        {/* Parsed AI classifier output — priority probabilities and top conditions */}
        {aiTriage && (
          <div className="fade-up" style={{ animationDelay: ".07s" }}>
            <AiTriagePanel
              aiTriage={aiTriage}
              aiInvokedAt={triageSummary.aiInvokedAt}
              triageSource={triageSummary.triageSource}
            />
          </div>
        )}

        {/* Identified obstetric conditions are now shown inside DecisionExplanation
            (driver + secondary chips with source badges and priority colors) */}

        {/* Triggered clinical rules */}
        {triggeredRules.length > 0 && (
          <div className="fade-up" style={{ background: C.bg, borderRadius: 18, padding: "18px 16px", marginBottom: 14, border: `1px solid ${C.border}`, animationDelay: ".08s" }}>
            <SectionLabel mb={10}>Triggered Rules</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {triggeredRules.map((rule, i) => {
                const code = rule.obstetric_condition_code ?? rule.obstetricConditionCode;
                const condName = code
                  ? obstetricConditionByCode(code)?.name ?? rule.ruleName ?? code
                  : rule.ruleName ?? null;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", background: C.bgDeep, borderRadius: 9, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: col, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 2px 6px ${col}35` }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: "white" }}>{i + 1}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{rule.action}</div>
                      {condName && <div style={{ fontSize: 11, color: col, fontWeight: 600, marginTop: 2 }}>{condName}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DecisionExplanation source={result} priority={legacyPriority} />

        <div className="fade-up" style={{ background: C.bg, borderRadius: 18, padding: "18px 16px", border: `1px solid ${C.border}`, borderTop: `3px solid ${col}`, animationDelay: ".1s" }}>
          <SectionLabel color={col} mb={14}>Management Protocol · P{finalPriorityId}</SectionLabel>
          {checklistLoading && checklist.length === 0 ? (
            <ChecklistSkeleton count={4} />
          ) : checklist.length === 0 ? (
            <div style={{ fontSize: 12, color: C.textMuted, padding: "8px 0", lineHeight: 1.6 }}>
              No management checklist returned for this assessment.
            </div>
          ) : (
            checklist.map((step, i) => (
              <div key={step.id ?? i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: pGrd(legacyPriority), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 2px 6px ${col}35` }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: "white" }}>{i + 1}</span>
                </div>
                <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.65, paddingTop: 4 }}>{step.item}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.bg, borderTop: `1px solid ${C.border}`, padding: "14px 16px", display: "flex", gap: 10, maxWidth: 480, margin: "0 auto", boxShadow: "0 -4px 20px rgba(0,0,0,.08)" }}>
        <Btn variant="ghost" onClick={onEditAssessment} s={{ flex: 1, padding: "13px 0" }}>Edit</Btn>
        <Btn onClick={onSaveResult} s={{ flex: 2, padding: "13px 0" }}><IconCheck size={14} color="white" style={{ marginRight: 6 }} /> Save &amp; Open Patient</Btn>
      </div>
    </div>
  );
}
