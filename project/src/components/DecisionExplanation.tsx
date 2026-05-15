import { useState } from "react";
import { C, pC, pLbl } from "../constants/theme";
import { SectionLabel, StatusChip } from "./ui";
import { buildDecisionSummary } from "../utils/triage";
import { obstetricConditionById, obstetricConditionByCode, priorityColor } from "../services/catalogService";
import type { ObstetricConditionResult } from "../services/Patientservice";

interface DecisionExplanationProps {
  source: any;
  priority: number;
}

const SOURCE_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  AI:     { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", label: "AI" },
  RULE:   { bg: "#FAFAE8", border: "#E8E48E", text: "#5B5A0D", label: "RULE" },
  MANUAL: { bg: "#F3F4F6", border: "#D1D5DB", text: "#374151", label: "MANUAL" },
};

function conditionNameOf(item: ObstetricConditionResult): string {
  return obstetricConditionById(item.obstetricConditionId)?.name
    ?? (item as any).name
    ?? `Condition #${item.obstetricConditionId}`;
}

export function DecisionExplanation({ source, priority }: DecisionExplanationProps) {
  const [expanded, setExpanded] = useState(false);
  const summary = buildDecisionSummary(source, priority);
  const condColor = priorityColor(priority) !== "#6B7280" ? priorityColor(priority) : pC(priority);

  // Extract obstetric conditions list — try every shape the API/state may use
  const la = source?.latestAssessment ?? source;
  const obstetricConditions: ObstetricConditionResult[] = (() => {
    if (Array.isArray(la?.obstetricConditions) && la.obstetricConditions.length) return la.obstetricConditions;
    if (Array.isArray(source?.obstetricConditions) && source.obstetricConditions.length) return source.obstetricConditions;
    if (Array.isArray(source?.latestAssessment?.obstetricConditions) && source.latestAssessment.obstetricConditions.length) return source.latestAssessment.obstetricConditions;
    // Fallback: synthesize from triggeredRules[] codes (older API responses)
    const rules: any[] = la?.triggeredRules ?? source?.triggeredRules ?? [];
    if (Array.isArray(rules) && rules.length) {
      const seen = new Set<string>();
      const synth: ObstetricConditionResult[] = [];
      for (const r of rules) {
        const code: string | undefined = r?.obstetric_condition_code ?? r?.obstetricConditionCode;
        if (!code || seen.has(code)) continue;
        seen.add(code);
        const cat = obstetricConditionByCode(code);
        synth.push({
          obstetricConditionId: cat?.id ?? 0,
          code,
          name: cat?.name ?? r?.ruleName ?? code,
          probability: null,
          source: "RULE",
          priorityIdAtCapture: priority,
        } as any);
      }
      if (synth.length) return synth;
    }
    return [];
  })();
  // Driver = the condition whose priorityIdAtCapture matches the final priority,
  // preferring MANUAL > RULE > AI when ties exist. Falls back to first in list.
  const driver: ObstetricConditionResult | undefined = (() => {
    if (obstetricConditions.length === 0) return undefined;
    const ranked = [...obstetricConditions].sort((a, b) => {
      const matchA = a.priorityIdAtCapture === priority ? 0 : 1;
      const matchB = b.priorityIdAtCapture === priority ? 0 : 1;
      if (matchA !== matchB) return matchA - matchB;
      const srcRank = (s: string) => (s === "MANUAL" ? 0 : s === "RULE" ? 1 : 2);
      return srcRank(a.source) - srcRank(b.source);
    });
    return ranked[0];
  })();
  const others = obstetricConditions.filter((c) => c !== driver);

  const topDrivers = [
    ...summary.triggeredRules
      .slice(0, 3)
      .map((r) => r.text),
    ...(summary.riskHits.length
      ? [`${summary.riskHits.length} risk factor(s) selected`]
      : []),
  ].slice(0, 3);

  return (
    <div
      className="fade-up"
      style={{
        background: C.bg,
        borderRadius: 18,
        padding: "18px 16px",
        marginBottom: 14,
        border: `1px solid ${C.border}`,
        boxShadow: "0 3px 12px rgba(0,0,0,.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <SectionLabel color={C.teal} mb={0}>
          Decision Explanation
        </SectionLabel>
        <StatusChip label={`P${priority} ${pLbl(priority)}`} tone={pC(priority)} />
      </div>
      <div
        style={{
          fontSize: 13,
          color: C.textMid,
          lineHeight: 1.65,
          marginBottom: 10,
        }}
      >
        Priority was generated using clinical thresholds and selected assessment
        factors. Expand this section to review the full trace.
      </div>
      {obstetricConditions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: ".12em",
              }}
            >
              Obstetric Condition{obstetricConditions.length > 1 ? "s" : ""}
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: condColor,
                background: `${condColor}15`,
                border: `1px solid ${condColor}40`,
                borderRadius: 999,
                padding: "2px 8px",
                letterSpacing: ".04em",
              }}
            >
              {obstetricConditions.length} identified
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[driver, ...others].filter(Boolean).map((item, i) => {
              const it = item as ObstetricConditionResult;
              const s = SOURCE_STYLES[it.source] ?? SOURCE_STYLES.MANUAL;
              const isDriver = it === driver;
              const accent = isDriver ? condColor : s.border;
              return (
                <div
                  key={`${it.obstetricConditionId}-${i}`}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: isDriver ? `${condColor}0D` : "#FAFBFC",
                    border: `1px solid ${isDriver ? `${condColor}66` : C.border}`,
                    borderLeft: `4px solid ${accent}`,
                    borderRadius: 10,
                    padding: "9px 12px",
                    boxShadow: isDriver ? `0 2px 8px ${condColor}20` : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: C.text,
                        letterSpacing: "-.005em",
                        lineHeight: 1.3,
                      }}
                    >
                      {conditionNameOf(it)}
                    </span>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: C.textMuted,
                        marginTop: 3,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>Captured at <strong style={{ color: pC(it.priorityIdAtCapture) }}>P{it.priorityIdAtCapture}</strong></span>
                      {it.probability != null && (
                        <span>· {Math.round(it.probability * 100)}% confidence</span>
                      )}
                      {it.code && <span style={{ fontFamily: "ui-monospace, monospace", opacity: .65 }}>· {it.code}</span>}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 900,
                      color: s.text,
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                      borderRadius: 5,
                      padding: "3px 7px",
                      letterSpacing: ".06em",
                      flexShrink: 0,
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {topDrivers.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {topDrivers.map((driver: string, i: number) => (
            <span
              key={`${driver}-${i}`}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.textMid,
                background: C.bgDeep,
                border: `1px solid ${C.border}`,
                borderRadius: 999,
                padding: "5px 10px",
              }}
            >
              {driver}
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        className="btn-press"
        onClick={() => setExpanded((v) => !v)}
        style={{
          border: `1px solid ${C.border}`,
          background: C.bgSoft,
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 12,
          fontWeight: 700,
          color: C.textMid,
          cursor: "pointer",
          width: "100%",
        }}
      >
        {expanded ? "Hide Detailed Trace" : "Show Detailed Trace"}
      </button>
      {expanded && (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div
            style={{
              background: C.bgDeep,
              borderRadius: 12,
              padding: "10px 12px",
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 6,
              }}
            >
              Triggered Rules
            </div>
            <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.7 }}>
              {summary.triggeredRules.length
                ? summary.triggeredRules
                    .map((rule) => `P${rule.priority}: ${rule.text}`)
                    .join(" · ")
                : "No critical threshold rules triggered from current inputs."}
            </div>
          </div>
          <div
            style={{
              background: C.bgDeep,
              borderRadius: 12,
              padding: "10px 12px",
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 6,
              }}
            >
              Clinical Inputs Used
            </div>
            <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.7 }}>
              {summary.dataUsed.map(([k, v]) => `${k}: ${v}`).join(" · ")}
            </div>
          </div>
          <div
            style={{
              background: C.bgDeep,
              borderRadius: 12,
              padding: "10px 12px",
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 6,
              }}
            >
              Missing / Low Confidence Inputs
            </div>
            <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.7 }}>
              {summary.missingInputs.length
                ? summary.missingInputs.join(" · ")
                : "No major missing input fields detected."}
            </div>
          </div>
          <div
            style={{
              background: C.bgDeep,
              borderRadius: 12,
              padding: "10px 12px",
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: C.textMuted,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 6,
              }}
            >
              How Priority Could Change
            </div>
            <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.7 }}>
              {summary.shiftHints.join(" · ")}
            </div>
          </div>
          {(() => {
            const src = (la?.triageSource ?? source?.triageSource ?? "").toString().toUpperCase();
            const mode = (la?.triageMode ?? source?.triageMode ?? "").toString().toUpperCase();
            const sourceLabel = src === "AI+RULE"
              ? "AI + Rule engine"
              : src === "AI"
                ? "AI classifier"
                : src === "RULE"
                  ? "Rule engine"
                  : "Rule engine";
            return (
              <div style={{ fontSize: 11, color: C.textLight }}>
                Decision source: {sourceLabel}
                {mode && ` · Mode: ${mode}`}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
