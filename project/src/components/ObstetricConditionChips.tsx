/**
 * ObstetricConditionChips — renders the obstetricConditions[] array from a TriageSummary.
 *
 * Each chip shows:
 *   - condition name (from catalog)
 *   - source badge (AI / RULE / MANUAL)
 *   - probability % if present (AI source)
 */

import { obstetricConditionById } from "../services/catalogService";
import type { ObstetricConditionResult } from "../services/Patientservice";

interface ObstetricConditionChipsProps {
  items: ObstetricConditionResult[];
}

const SOURCE_STYLES = {
  AI:     { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" },
  RULE:   { bg: "#FAFAE8", border: "#E8E48E", text: "#5B5A0D" },
  MANUAL: { bg: "#F3F4F6", border: "#D1D5DB", text: "#374151" },
};

export function ObstetricConditionChips({ items }: ObstetricConditionChipsProps) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {items.map((item, i) => {
        const cond = obstetricConditionById(item.obstetricConditionId);
        const name = cond?.name ?? (item as any).name ?? `Condition #${item.obstetricConditionId}`;
        const src = (item.source ?? "RULE") as "AI" | "RULE" | "MANUAL";
        const style = SOURCE_STYLES[src] ?? SOURCE_STYLES.MANUAL;
        const probPct = item.probability != null ? Math.round(item.probability * 100) : null;

        return (
          <div
            key={`${item.obstetricConditionId}-${i}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: style.bg,
              border: `1px solid ${style.border}`,
              borderRadius: 8,
              padding: "5px 10px",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: style.text }}>{name}</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: style.text,
                background: style.border,
                borderRadius: 5,
                padding: "1px 5px",
                letterSpacing: ".05em",
              }}
            >
              {src}
            </span>
            {probPct != null && (
              <span style={{ fontSize: 10, color: style.text, opacity: 0.8 }}>{probPct}%</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
