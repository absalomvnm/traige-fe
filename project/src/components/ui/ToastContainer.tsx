import { C } from "../../constants/theme";
import type { Toast, ToastVariant } from "../../state/useToast";

const ICONS: Record<ToastVariant, string> = {
  success: "✓",
  error:   "✕",
  warning: "!",
  info:    "i",
};

const COLORS: Record<ToastVariant, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: "#F0FDF4", border: "#22C55E", icon: "#16A34A", text: C.text },
  error:   { bg: "#FFF1F2", border: "#EF4444", icon: "#DC2626", text: C.text },
  warning: { bg: "#FAFAE8", border: "#D8D365", icon: "#5B5A0D", text: C.text },
  info:    { bg: "#EFF6FF", border: "#3B82F6", icon: "#2563EB", text: C.text },
};

interface ToastContainerProps {
  toasts: Toast[];
}

export function ToastContainer({ toasts }: ToastContainerProps) {
  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80, // above BottomNav
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        margin: "0 auto" ,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const col = COLORS[t.variant];
        return (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: col.bg,
              border: `1.5px solid ${col.border}`,
              borderRadius: 14,
              padding: "12px 14px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              animation: "toast-in 0.22s cubic-bezier(.34,1.56,.64,1) both",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: col.icon,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              {ICONS[t.variant]}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: col.text, lineHeight: 1.4 }}>
              {t.message}
            </div>
          </div>
        );
      })}
    </div>
  );
}
