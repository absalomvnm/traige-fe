import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { C, pC } from "../../constants/theme";

import type { ReviewReminder } from "../../state/useReviewReminders";
import { formatOverdue, formatUntilDue } from "../../state/useReviewReminders";

interface ReviewNotificationPanelProps {
  reminders: ReviewReminder[];
  overdueCount: number;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onOpenPatient?: (patientId: number | string) => void;
}

const PRIORITY_LABELS: Record<number, string> = {
  1: "P1 Emergency",
  2: "P2 Very Urgent",
  3: "P3 Urgent",
  4: "P4 Routine",
};

export function ReviewNotificationPanel({
  reminders,
  overdueCount,
  onDismiss,
  onDismissAll,
  onOpenPatient,
}: ReviewNotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const prevCountRef = useRef(overdueCount);
  const bellWrapRef = useRef<HTMLDivElement>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  // Fixed-position coordinates for the portalled dropdown (anchored to the bell).
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);

  // Measure the bell position so the portalled dropdown can be placed right
  // under it. Recomputed on open + on resize/scroll so it stays aligned.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = bellWrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setAnchor({
        top: rect.bottom + 10,
        right: Math.max(14, window.innerWidth - rect.right),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);


  // Pulse the bell when a new overdue notification arrives
  useEffect(() => {
    if (overdueCount > prevCountRef.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 2000);
      prevCountRef.current = overdueCount;
      return () => clearTimeout(t);
    }
    prevCountRef.current = overdueCount;
  }, [overdueCount]);

  // Close panel when clicking outside. Because the dropdown is portalled to
  // document.body it lives outside the bell wrapper, so we check both refs.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideBell = bellWrapRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideBell && !insideDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);


  const activeReminders = reminders.filter((r) => !r.dismissed);
  const totalCount = activeReminders.length;

  if (totalCount === 0 && !open) {
    // Still render the bell but without badge
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "relative",
          width: 40,
          height: 40,
          marginTop: 5,
          borderRadius: 12,
          border: `1.5px solid ${C.border}`,
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          transition: "all .2s ease",
        }}
        title="Review reminders"
      >
        <BellIcon color={C.textLight} />
      </button>
    );
  }

  return (
    <div ref={bellWrapRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}

        style={{
          position: "relative",
          width: 40,
          top: 5,
          height: 40,
          borderRadius: 12,
          border: `1.5px solid ${overdueCount > 0 ? "#FCA5A5" : C.border}`,
          background: overdueCount > 0 ? "#FFF1F2" : C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          transition: "all .2s ease",
          animation: pulse ? "bell-shake 0.5s ease" : undefined,
        }}
        title={`${totalCount} review reminder${totalCount !== 1 ? "s" : ""}`}
      >
        <BellIcon color={overdueCount > 0 ? "#DC2626" : C.textMuted} />
        {totalCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 999,
              background: overdueCount > 0 ? "#DC2626" : "#F59E0B",
              color: "white",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              border: `2px solid ${C.bg}`,
              lineHeight: 1,
            }}
          >
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown panel — rendered in a portal so it escapes any ancestor with
          overflow:hidden / borderRadius (e.g. the coloured dashboard header)
          that was previously clipping it. Positioned (fixed) under the bell. */}
      {open && anchor && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: anchor.top,
            right: anchor.right,
            width: 320,
            maxWidth: "calc(100vw - 28px)",
            background: C.bg,
            borderRadius: 18,
            border: `1px solid ${C.border}`,
            boxShadow: "0 12px 40px rgba(0,0,0,.16)",
            zIndex: 99999,
            overflow: "hidden",
            animation: "panel-drop .22s cubic-bezier(.34,1.56,.64,1) both",
          }}
        >

          {/* Header */}
          <div
            style={{
              padding: "14px 16px 12px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>
                Review Reminders
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                {overdueCount > 0
                  ? `${overdueCount} patient${overdueCount !== 1 ? "s" : ""} overdue for review`
                  : `${totalCount} upcoming review${totalCount !== 1 ? "s" : ""}`}
              </div>
            </div>
            {totalCount > 1 && (
              <button
                onClick={() => { onDismissAll(); setOpen(false); }}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.textMuted,
                  background: C.bgSoft,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                Dismiss all
              </button>
            )}
          </div>

          {/* Reminder list */}
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {activeReminders.map((r) => {
              const col = pC(r.priority);
              const timeLabel = r.isOverdue
                ? formatOverdue(r.overdueBy)
                : formatUntilDue(r.dueAt.getTime() - Date.now());

              return (
                <div
                  key={r.id}
                  style={{
                    padding: "12px 16px",
                    borderBottom: `1px solid ${C.border}`,
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    background: r.isOverdue ? "#FFF8F8" : C.bg,
                    cursor: onOpenPatient ? "pointer" : "default",
                    transition: "background .15s",
                  }}
                  onClick={() => {
                    if (onOpenPatient) {
                      onOpenPatient(r.patientId);
                      setOpen(false);
                    }
                  }}
                >
                  {/* Priority dot */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: col,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: `0 3px 8px ${col}40`,
                    }}
                  >
                    {r.isOverdue ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.patientName}
                    </div>
                    <div style={{ fontSize: 11, color: col, fontWeight: 700, marginTop: 2 }}>
                      {PRIORITY_LABELS[r.priority] ?? `P${r.priority}`}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: r.isOverdue ? "#DC2626" : "#D97706",
                        fontWeight: 700,
                        marginTop: 3,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {r.isOverdue ? "⚠ " : "⏱ "}
                      {timeLabel}
                      <span style={{ color: C.textLight, fontWeight: 400 }}>
                        · Reassess {r.reassessDue}
                      </span>
                    </div>
                  </div>

                  {/* Dismiss */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(r.id); }}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: `1px solid ${C.border}`,
                      background: C.bgSoft,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                    title="Dismiss"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="3" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: "10px 16px", background: C.bgSoft }}>
            <div style={{ fontSize: 11, color: C.textLight, textAlign: "center" }}>
              Reminders auto-refresh every 30 seconds
            </div>
          </div>
        </div>,
        document.body
      )}


      <style>{`
        @keyframes bell-shake {
          0%,100% { transform: rotate(0deg); }
          20% { transform: rotate(-12deg); }
          40% { transform: rotate(12deg); }
          60% { transform: rotate(-8deg); }
          80% { transform: rotate(8deg); }
        }
        @keyframes panel-drop {
          from { opacity: 0; transform: translateY(-8px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function BellIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
