import { C, pC, pBg, pLbl } from "../../constants/theme";
import { IconArrowLeft } from "../icons";

export function Btn({
  children,
  variant = "primary",
  full,
  onClick,
  s = {},
  disabled,
}: any) {
  async function handleClick(event: unknown) {
    if (!onClick) return;
    try {
      await onClick(event);
    } catch (error) {
      console.error("[UI] Button click handler failed", error);
    }
  }

  const base = {
    padding: "13px 22px",
    borderRadius: 12,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    fontSize: 14,
    width: full ? "100%" : undefined,
    opacity: disabled ? 0.5 : 1,
    letterSpacing: "0.01em",
  };
  const vs: any = {
    primary: {
      background: C.gradGreen,
      color: "#fff",
      boxShadow: "0 4px 14px rgba(30,123,71,.35)",
    },
    outline: {
      background: "transparent",
      color: C.green,
      border: `2px solid ${C.green}`,
    },
    ghost: {
      background: C.bg,
      color: C.textMid,
      border: `1.5px solid ${C.border}`,
      boxShadow: "0 1px 4px rgba(0,0,0,.06)",
    },
    danger: {
      background: C.p1grd,
      color: "#fff",
      boxShadow: "0 4px 14px rgba(220,38,38,.35)",
    },
    teal: {
      background: C.gradTeal,
      color: "#fff",
      boxShadow: "0 4px 14px rgba(13,148,136,.3)",
    },
    purple: {
      background: C.gradPurple,
      color: "#fff",
      boxShadow: "0 4px 14px rgba(124,58,237,.3)",
    },
  };
  return (
    <button
      disabled={disabled}
      className="btn-press"
      onClick={handleClick}
      style={{ ...base, ...vs[variant], ...s }}
    >
      {children}
    </button>
  );
}

export function Tag({ priority }: any) {
  const col = pC(priority),
    bg = pBg(priority);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: bg,
        border: `1.5px solid ${col}50`,
        borderRadius: 20,
        padding: "4px 10px 4px 7px",
        boxShadow: `0 2px 6px ${col}20`,
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: col,
          flexShrink: 0,
          boxShadow: `0 0 4px ${col}80`,
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: col,
          letterSpacing: "0.06em",
        }}
      >
        P{priority} · {pLbl(priority)}
      </span>
    </div>
  );
}

export function StatusChip({ label, tone = C.green, bg }: any) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 999,
        background: bg || `${tone}12`,
        border: `1px solid ${tone}30`,
        fontSize: 11,
        fontWeight: 700,
        color: tone,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: tone,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

export function Hdr({ title, onBack, gradient = C.gradGreen, right }: any) {
  return (
    <div
      style={{
        background: gradient,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
        boxShadow: "0 4px 16px rgba(0,0,0,.18)",
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          className="btn-press"
          style={{
            border: "none",
            background: "rgba(255,255,255,.18)",
            backdropFilter: "blur(8px)",
            borderRadius: 10,
            width: 36,
            height: 36,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          <IconArrowLeft size={18} color="white" />
        </button>
      )}
      <div
        style={{ flex: 1, fontSize: 17, fontWeight: 800, color: "white", letterSpacing: "-.01em" }}
      >
        {title}
      </div>
      {right}
    </div>
  );
}

export function Card({ children, s = {}, className = "" }: any) {
  return (
    <div
      className={className}
      style={{
        background: C.bg,
        borderRadius: 18,
        padding: "18px 16px",
        boxShadow: "0 2px 12px rgba(0,0,0,.06)",
        border: `1px solid ${C.border}`,
        ...s,
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, color = C.textMuted, mb = 12 }: any) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
        color,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: mb,
      }}
    >
      {children}
    </div>
  );
}
