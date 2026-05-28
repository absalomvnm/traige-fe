/**
 * TriageBadge — catalog-driven priority badge.
 *
 * Reads color and label from catalogService (falls back gracefully
 * to hardcoded values if the catalog is not yet loaded).
 *
 * Usage:
 *   <TriageBadge finalPriorityId={summary.finalPriorityId ?? summary.priority} size="lg" />
 */

import { priorityColor, priorityLabel } from "../services/catalogService";

interface TriageBadgeProps {
  /** Catalog priority id (1-4). */
  finalPriorityId: number;
  /** Display size: "sm" | "md" | "lg". Defaults to "md". */
  size?: "sm" | "md" | "lg";
  /** Additional inline style override. */
  style?: React.CSSProperties;
}

const SIZE_MAP = {
  sm: { num: 16, label: 13, pad: "2px 9px", radius: 8 },
  md: { num: 21, label: 14, pad: "4px 12px", radius: 10 },
  lg: { num: 45, label: 17, pad: "6px 18px", radius: 14 },
};

export function TriageBadge({ finalPriorityId: id, size = "md", style }: TriageBadgeProps) {
  const color = priorityColor(id);
  const label = priorityLabel(id);
  const sz = SIZE_MAP[size];

  if (size === "lg") {
    return (
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", ...style }}>
        <div
          style={{
            fontSize: sz.num,
            fontWeight: 900,
            color: "white",
            background: color,
            borderRadius: sz.radius,
            padding: sz.pad,
            letterSpacing: "-.01em",
            lineHeight: 1.15,
            boxShadow: `0 4px 14px ${color}55`,
            minWidth: 64,
            textAlign: "center",
          }}
        >
          P{id}
        </div>
        <div style={{ fontSize: sz.label, fontWeight: 700, color, marginTop: 3, letterSpacing: ".02em" }}>{label}</div>
      </div>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: color,
        color: "white",
        borderRadius: sz.radius,
        padding: sz.pad,
        fontWeight: 800,
        fontSize: sz.num,
        boxShadow: `0 2px 8px ${color}44`,
        letterSpacing: ".01em",
        ...style,
      }}
    >
      P{id}
      {size === "md" && (
        <span style={{ fontSize: sz.label, fontWeight: 600, opacity: 0.9 }}>{label}</span>
      )}
    </span>
  );
}
