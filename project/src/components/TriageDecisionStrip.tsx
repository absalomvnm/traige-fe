/**
 * TriageDecisionStrip — shows how the final priority was determined.
 *
 * Prefers the backend-computed {@code triageSource} when present (added in
 * the 2026-05 summary enrichment). Falls back to deriving the mode locally
 * from {@code aiPriorityId} vs {@code rulePriorityId} for older payloads.
 *
 * Modes:
 *   - "rule-only"     — AI not invoked / disabled / failed
 *   - "ai-agrees"     — AI and rule engine produced the same priority
 *   - "ai-escalated"  — AI bumped severity higher than the rule engine
 *   - "rule-overrides"— Rule engine kept severity higher than AI suggested
 */

import { priorityLabel } from "../services/catalogService";

interface TriageDecisionStripProps {
  summary: {
    finalPriorityId?: number | null;
    rulePriorityId?: number | null;
    aiPriorityId?: number | null;
    aiPriorityConfidence?: number | null;
    aiInvokedAt?: string | null;
    priority?: number;
    /** BE-supplied source string: "AI" | "RULE" | "AI+RULE" | "UNKNOWN". */
    triageSource?: string | null;
    /** Configured mode (AI | RULE | BOTH). Used only for tooltip/label hinting. */
    triageMode?: string | null;
  };
}

type Mode = "rule-only" | "ai-agrees" | "ai-escalated" | "rule-overrides";

function resolveMode(s: TriageDecisionStripProps["summary"]): Mode {
  // Prefer BE-supplied triageSource when present.
  const src = (s.triageSource ?? "").toUpperCase();
  if (src === "RULE") return "rule-only";
  if (src === "AI+RULE") return "ai-agrees";
  if (src === "AI") {
    // AI drove the decision. If we can compare against the rule priority,
    // refine to escalated vs overrides; otherwise treat as agrees.
    const ai = s.aiPriorityId;
    const rule = s.rulePriorityId;
    if (ai != null && rule != null) {
      if (ai === rule) return "ai-agrees";
      return ai < rule ? "ai-escalated" : "rule-overrides";
    }
    return "ai-agrees";
  }

  // Legacy / UNKNOWN fallback: infer from ids.
  if (s.aiPriorityId == null) return "rule-only";
  const rule = s.rulePriorityId ?? s.priority ?? 4;
  const ai = s.aiPriorityId;
  if (rule === ai) return "ai-agrees";
  if (ai < rule) return "ai-escalated";
  return "rule-overrides";
}

const MODE_CONFIG = {
  "rule-only": { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", icon: "⚙️", label: "Rule Engine" },
  "ai-agrees":  { bg: "#ECFDF5", border: "#6EE7B7", text: "#065F46", icon: "✓", label: "Rule + AI Agree" },
  "ai-escalated": { bg: "#FAFAE8", border: "#E8E48E", text: "#5B5A0D", icon: "⚠️", label: "AI Escalated" },
  "rule-overrides": { bg: "#F3F4F6", border: "#D1D5DB", text: "#374151", icon: "🔒", label: "Rule Overrides AI" },
};

export function TriageDecisionStrip({ summary }: TriageDecisionStripProps) {
  const mode = resolveMode(summary);
  const cfg = MODE_CONFIG[mode];

  const finalId = summary.finalPriorityId ?? summary.priority ?? 4;
  const ruleId = summary.rulePriorityId;
  const aiId = summary.aiPriorityId;
  const conf = summary.aiPriorityConfidence;

  const detail = (() => {
    if (mode === "rule-only") return `Final: ${priorityLabel(finalId)}`;
    if (mode === "ai-agrees" && conf != null)
      return `Both agree · AI confidence ${Math.round(conf * 100)}%`;
    if (mode === "ai-escalated" && aiId != null && ruleId != null)
      return `Rule → P${ruleId}, AI → P${aiId} (escalated)`;
    if (mode === "rule-overrides" && aiId != null && ruleId != null)
      return `Rule → P${ruleId}, AI → P${aiId}`;
    return "";
  })();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 10,
        padding: "7px 12px",
      }}
    >
      <span style={{ fontSize: 17 }}>{cfg.icon}</span>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: cfg.text, letterSpacing: ".04em" }}>
          {cfg.label}
        </span>
        {detail && (
          <span style={{ fontSize: 14, color: cfg.text, opacity: 0.75, marginLeft: 6 }}>
            {detail}
          </span>
        )}
      </div>
    </div>
  );
}
