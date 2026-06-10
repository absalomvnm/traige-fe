import { PatientCardSkeleton } from "../components/Skeletons";
import { IconChevronRight } from "../components/icons";
import { Btn, Hdr, StatusChip } from "../components/ui";
import { C, pC } from "../constants/theme";
import { priorityColor, resolveConditionName } from "../services/catalogService";
import { fullName, isAssessmentDraft, isSameLocalDay, TOTAL_TRIAGE_SECTIONS } from "../utils/helpers";

import { patientService } from "../services/Patientservice";
import { useEffect, useRef, useState } from "react";

type QueueTab = "today" | "older";

interface PatientsScreenProps {
  onNav: (screen: string, filter?: string | null) => void;
  onBack?: () => void;
  patients: any[];
  loading?: boolean;
  onOpenPatient: (patient: any) => void;
  onStartNewTriage: () => void;
  onOpenSearch: () => void;
  onResumeDraft?: (patient: any) => void;
  onRefreshPatients?: () => void;
  filter?: string | null;
}

export function PatientsScreen({
  onNav,
  onBack,
  patients,
  loading,
  onOpenPatient,
  onStartNewTriage,
  onResumeDraft,
  onRefreshPatients,
  filter,
}: PatientsScreenProps) {
  const [discarding, setDiscarding] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<QueueTab>("today");
  const hasAutoSelectedRef = useRef(false);

  // Apply filter if provided
  let filteredPatients = patients;
  if (filter === "p2") {
    filteredPatients = patients.filter((p: any) => (p.latestAssessment?.finalPriorityId || p.p) === 2);
  } else if (filter === "pending") {
    filteredPatients = patients.filter((p: any) => /Pending|Awaiting/.test(p.status));
  }

  const hasAssessmentDates = patients.some((patient: any) => patient.latestAssessment?.assessedAt || patient.assessedAt);
  const queuePatients = filteredPatients;
  const todayQueue = hasAssessmentDates
    ? queuePatients.filter((patient: any) => isAssessmentDraft(patient) || isSameLocalDay(patient.latestAssessment?.assessedAt ?? patient.assessedAt))
    : queuePatients;
  const olderQueue = hasAssessmentDates
    ? queuePatients.filter((patient: any) => !isAssessmentDraft(patient) && !isSameLocalDay(patient.latestAssessment?.assessedAt ?? patient.assessedAt))
    : [];

  useEffect(() => {
    if (loading) return;
    if (hasAutoSelectedRef.current) return;
    if (todayQueue.length === 0 && olderQueue.length > 0) {
      setActiveTab("older");
    }
    hasAutoSelectedRef.current = true;
  }, [loading, todayQueue.length, olderQueue.length]);

  const queueSummary = `${queuePatients.length} patients in queue${hasAssessmentDates ? ` · ${todayQueue.length} today · ${olderQueue.length} older` : ""}`;
  const visiblePatients = activeTab === "today" ? todayQueue : olderQueue;

  const handleDiscardDraft = async (e: any, patient: any) => {
    e?.stopPropagation?.();
    if (!patient.draftAssessmentId) return;

    const confirmed = window.confirm(
      `Discard draft assessment for ${fullName(patient)}?\n\nThis will permanently delete the incomplete triage data.`
    );
    if (!confirmed) return;

    try {
      setDiscarding(patient.draftAssessmentId);
      await patientService.discardAssessment(patient.draftAssessmentId);
      if (onRefreshPatients) onRefreshPatients();
    } catch (err) {
      console.error("Failed to discard draft:", err);
      alert("Failed to discard draft assessment. Please try again.");
    } finally {
      setDiscarding(null);
    }
  };

  const handleResumeDraft = (e: any, patient: any) => {
    e?.stopPropagation?.();
    if (onResumeDraft) onResumeDraft(patient);
  };

  const showSkeletons = Boolean(loading) && filteredPatients.length === 0;

  return (
    <div className="fade-in" style={{ minHeight: "100dvh", background: C.bgSoft, paddingBottom: 156 }}>
      <Hdr title="Triage Queue" onBack={onBack ?? (() => onNav("welcome"))} />

      <div style={{ padding: "14px 14px 24px" }}>
        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>
            {showSkeletons ? "Loading queue…" : queueSummary}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {([
            { key: "today" as QueueTab, label: "Today", count: todayQueue.length, hint: hasAssessmentDates ? "Includes drafts" : "All triaged items" },
            { key: "older" as QueueTab, label: "Older", count: olderQueue.length, hint: hasAssessmentDates ? "Earlier triaged items" : "No dated items yet" },
          ]).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  border: `1px solid ${isActive ? C.green : C.border}`,
                  background: isActive ? C.greenL : C.bg,
                  borderRadius: 14,
                  padding: "12px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: isActive ? "0 6px 18px rgba(30,123,71,.12)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: isActive ? C.green : C.text }}>{tab.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: isActive ? C.green : C.textMuted }}>{tab.count}</div>
                </div>
                <div style={{ fontSize: 11, color: isActive ? C.green : C.textMuted, marginTop: 4 }}>{tab.hint}</div>
              </button>
            );
          })}
        </div>

        {/* Patient list */}
        {showSkeletons
          ? Array.from({ length: 5 }).map((_, i) => <PatientCardSkeleton key={i} delay={i * 0.05} />)
          : visiblePatients.length === 0 ? (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, color: C.textMuted, fontSize: 13, lineHeight: 1.6 }}>
              {activeTab === "today"
                ? "No triaged patients for today yet. Switch to Older to review previous triages."
                : "No older triage records found for the current filter."}
            </div>
          ) : visiblePatients.map((p: any, i: number) => {
              // Shared draft logic: an assessment with all sections complete is
              // never a draft, even if the backend still reports priority 0.
              const isDraft = isAssessmentDraft(p);
              const finalPid = isDraft ? 0 : (p.latestAssessment?.finalPriorityId || p.p);
              const col = isDraft ? C.textMuted : (priorityColor(finalPid) || pC(finalPid));
              const completedCount = p.completedSections?.length || 0;
              const totalSections = TOTAL_TRIAGE_SECTIONS;


              /* ─────────────────────────────────────
                 DRAFT / INCOMPLETE TRIAGE CARD
                 ───────────────────────────────────── */
              if (isDraft) {
                const pct = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
                return (
                  <div
                    key={p.id}
                    className="fade-up"
                    style={{
                      animationDelay: `${i * 0.04}s`,
                      background: C.bg,
                      borderRadius: 16,
                      marginBottom: 10,
                      border: `1.5px dashed ${C.border}`,
                      overflow: "hidden",
                      opacity: discarding === p.draftAssessmentId ? 0.45 : 1,
                      pointerEvents: discarding === p.draftAssessmentId ? "none" : "auto",
                      transition: "opacity .2s",
                    }}
                  >
                    {/* Main content row */}
                    <div style={{ padding: "14px 16px 12px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                      {/* Icon */}
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          background: `linear-gradient(135deg, ${C.bgDeep}, ${C.border})`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" />
                          <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, letterSpacing: "-.01em" }}>
                            {fullName(p)}
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: "#B45309",
                              background: "#FFF7ED",
                              border: "1px solid #FDBA7440",
                              padding: "2px 8px",
                              borderRadius: 999,
                              letterSpacing: ".06em",
                              textTransform: "uppercase",
                              flexShrink: 0,
                            }}
                          >
                            DRAFT
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, lineHeight: 1.5 }}>
                          Triage incomplete — {completedCount} of {totalSections} sections complete
                        </div>
                        <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
                          Age {p.age} · GA {p.ga}w
                        </div>

                        {/* Progress bar */}
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, background: C.bgDeep, borderRadius: 4, height: 5, overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${pct}%`,
                                background: pct > 0 ? "#F59E0B" : C.border,
                                borderRadius: 4,
                                transition: "width .4s ease",
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, minWidth: 28 }}>{pct}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons — integrated footer */}
                    <div
                      style={{
                        display: "flex",
                        gap: 0,
                        borderTop: `1px solid ${C.border}`,
                      }}
                    >
                      <button
                        onClick={(e) => handleResumeDraft(e, p)}
                        style={{
                          flex: 1,
                          padding: "11px 0",
                          border: "none",
                          borderRight: `1px solid ${C.border}`,
                          background: "transparent",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          color: C.green,
                          transition: "background .15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = `${C.green}08`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        Resume Triage
                      </button>
                      <button
                        onClick={(e) => handleDiscardDraft(e, p)}
                        style={{
                          flex: 1,
                          padding: "11px 0",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#DC2626",
                          transition: "background .15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,.04)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        {discarding === p.draftAssessmentId ? "Discarding…" : "Discard"}
                      </button>
                    </div>
                  </div>
                );
              }

              /* ─────────────────────────────────────
                 NORMAL PATIENT CARD
                 ───────────────────────────────────── */
              return (
                <div
                  key={p.id}
                  className="card-hover fade-up"
                  onClick={() => onOpenPatient(p)}
                  style={{
                    animationDelay: `${i * 0.04}s`,
                    background: C.bg,
                    borderRadius: 16,
                    padding: "14px 16px",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    boxShadow: "0 3px 12px rgba(0,0,0,.07)",
                    border: `1px solid ${C.border}`,
                    borderLeft: `4px solid ${col}`,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: col,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: `0 4px 10px ${col}40`,
                    }}
                  >
                    <span style={{ fontWeight: 900, color: "white", fontSize: 14 }}>P{finalPid}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text, letterSpacing: "-.01em" }}>
                        {fullName(p)}
                      </div>
                      <StatusChip label={p.status} tone={col} />
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                      {resolveConditionName(p) || p.cond || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: C.textLight, marginTop: 1 }}>
                      Age {p.age} · GA {p.ga}w · {p.location} · {p.t}
                    </div>
                    <div style={{ fontSize: 11, color: col, fontWeight: 700, marginTop: 4 }}>
                      Reassess: {p.reassessDue}
                    </div>
                  </div>

                  <IconChevronRight size={16} color={C.textLight} />
                </div>
              );
            })}
      </div>

      {/* Floating new-triage button */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 80,
          padding: "0 14px",
          zIndex: 90,
          pointerEvents: "none",
        }}
        className="app-container"
      >
        <div
          style={{
            background: "linear-gradient(180deg, rgba(246,248,247,0) 0%, rgba(246,248,247,0.94) 26%, rgba(246,248,247,1) 100%)",
            paddingTop: 24,
            pointerEvents: "auto",
          }}
        >
          <Btn
            full
            onClick={onStartNewTriage}
            s={{
              padding: "14px 0",
              borderRadius: 14,
              boxShadow: "0 8px 20px rgba(30,123,71,.35)",
            }}
          >
            + New Triage Assessment
          </Btn>
        </div>
      </div>
    </div>
  );
}
