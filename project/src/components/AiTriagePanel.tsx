/**
 * AiTriagePanel — surfaces the persisted AI classifier output for an
 * assessment. Reads {@code latestAssessment.aiTriage} as produced by the
 * patient-management-service summary endpoint. Renders nothing when the
 * AI block is absent.
 *
 * Shown sections:
 *   - Headline: AI priority code + overall priority confidence
 *   - Priority probabilities (P1..P4 mini bars)
 *   - Top conditions list with name, probability bar, and priority dot
 *   - Optional condition confidence + AI invocation timestamp
 */

import { C, pC } from "../constants/theme";
import type { AiTriageSnapshot } from "../services/Patientservice";

interface AiTriagePanelProps {
  aiTriage?: AiTriageSnapshot | null;
  aiInvokedAt?: string | null;
  /**
   * Optional source label ("AI" | "RULE" | "AI+RULE") as supplied by the BE.
   * Used to render a "did this drive the decision?" hint.
   */
  triageSource?: string | null;
}

function fmtPct(p?: number | null): string {
  if (p == null || Number.isNaN(p)) return "—";
  return `${Math.round(p * 100)}%`;
}

function priorityIdFromCode(code?: string): number | undefined {
  if (!code) return undefined;
  const m = code.match(/^P([1-4])$/i);
  return m ? Number(m[1]) : undefined;
}

export function AiTriagePanel({ aiTriage, aiInvokedAt, triageSource }: AiTriagePanelProps) {
  if (!aiTriage) return null;

  const pid = priorityIdFromCode(aiTriage.priority);
  const headlineColor = pid ? pC(pid) : C.text;
  const overallConfPct = fmtPct(aiTriage.priorityConfidence);

  const probs = aiTriage.priorityProbabilities ?? {};
  const probEntries = (["P1", "P2", "P3", "P4"] as const)
    .map((k) => [k, probs[k]] as const)
    .filter(([, v]) => typeof v === "number");

  const top = (aiTriage.topConditions ?? []).filter((c) => c && (c.code || c.name));

  return (
    <div
      style={{
        background: C.bg,
        border: `1.5px solid ${C.border}`,
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: C.purple,
            letterSpacing: ".12em",
            textTransform: "uppercase",
          }}
        >
          AI Assessment
        </span>
        {aiTriage.priority && (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 800,
              background: headlineColor,
              color: "#fff",
            }}
          >
            {aiTriage.priority}
          </span>
        )}
        <span style={{ fontSize: 12, color: C.textMuted }}>
          confidence {overallConfPct}
        </span>
        {triageSource && triageSource.toUpperCase().includes("AI") && (
          <span style={{ fontSize: 10, color: C.textLight, marginLeft: "auto" }}>
            drove decision
          </span>
        )}
      </div>

      {probEntries.length > 0 && (
        <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          {probEntries.map(([code, v]) => {
            const id = priorityIdFromCode(code);
            const col = id ? pC(id) : C.textMid;
            const w = `${Math.max(2, Math.round((v as number) * 100))}%`;
            return (
              <div key={code} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.textMid, width: 24 }}>
                  {code}
                </span>
                <div
                  style={{
                    flex: 1,
                    background: C.bgSoft,
                    height: 8,
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ width: w, background: col, height: "100%" }} />
                </div>
                <span style={{ fontSize: 11, color: C.textMuted, width: 36, textAlign: "right" }}>
                  {fmtPct(v as number)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {top.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: C.textMuted,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Top conditions
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {top.slice(0, 5).map((c, i) => {
              const dotColor = c.defaultPriorityId ? pC(c.defaultPriorityId) : C.textLight;
              const w = `${Math.max(2, Math.round((c.probability ?? 0) * 100))}%`;
              return (
                <div
                  key={`${c.code}-${i}`}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: C.textMid,
                      flex: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.name || c.code}
                  </span>
                  <div
                    style={{
                      width: 80,
                      background: C.bgSoft,
                      height: 6,
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ width: w, background: dotColor, height: "100%" }} />
                  </div>
                  <span style={{ fontSize: 11, color: C.textMuted, width: 36, textAlign: "right" }}>
                    {fmtPct(c.probability)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(aiTriage.conditionConfidence != null || aiInvokedAt) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: C.textLight,
            marginTop: 10,
            paddingTop: 8,
            borderTop: `1px dashed ${C.border}`,
          }}
        >
          {aiTriage.conditionConfidence != null && (
            <span>Top-condition confidence {fmtPct(aiTriage.conditionConfidence)}</span>
          )}
          {aiInvokedAt && (
            <span>
              {new Date(aiInvokedAt).toLocaleString("en-ZA", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "short",
              })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
