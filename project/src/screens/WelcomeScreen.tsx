import { useState, useRef, useEffect } from "react";
import type { AuthUser } from "../api";
import { IconBolt, IconChevronRight, IconClipboardList, IconHospital, IconHourglass, IconInfo, IconSiren, IconStethoscope } from "../components/icons";
import { ReviewNotificationPanel, SectionLabel, StatusChip, Tag } from "../components/ui";
import { C, pC } from "../constants/theme";
import { priorityColor, resolveConditionName } from "../services/catalogService";
import { patientService, type PatientListItem } from "../services/Patientservice";
import type { ReviewReminder } from "../state/useReviewReminders";
import { fullName, isSameLocalDay } from "../utils/helpers";
import { acceptDisclaimer, DisclaimerModal, hasAcceptedDisclaimer } from "./DisclaimerModal";


interface WelcomeScreenProps {
  onNav: (screen: string, filter?: string | null) => void;
  patients: any[];
  onStartNewTriage: () => void;
  onOpenPatient: (patient: any) => void;
  currentUser?: AuthUser | null;
  liveAlertCount?: number | null;
  reminders?: ReviewReminder[];
  overdueCount?: number;
  onDismissReminder?: (id: string) => void;
  onDismissAllReminders?: () => void;
}

export function WelcomeScreen({ onNav, patients, onStartNewTriage, onOpenPatient, currentUser, liveAlertCount, reminders = [], overdueCount = 0, onDismissReminder, onDismissAllReminders }: WelcomeScreenProps) {
  const today = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hasAssessmentDates = patients.some((patient: any) => patient.latestAssessment?.assessedAt || patient.assessedAt);
  const triagedTodayPatients = hasAssessmentDates
    ? patients.filter((patient: any) => isSameLocalDay(patient.latestAssessment?.assessedAt ?? patient.assessedAt))
    : patients;
  const triagedToday = triagedTodayPatients.length;
  const totalTriaged = patients.length;
  const p1Count = liveAlertCount ?? patients.filter((patient: any) => (patient.latestAssessment?.finalPriorityId || patient.p) === 1).length;
  const p2Count = patients.filter((patient: any) => (patient.latestAssessment?.finalPriorityId || patient.p) === 2).length;
  const pendingCount = patients.filter((patient: any) => /Pending|Awaiting/.test(patient.status)).length;

  // Sort by latestAssessment.assessedAt if present, otherwise by t (time string) descending
  const sortedPatients = [...patients].sort((a, b) => {
    const getDate = (p: any) => {
      if (p.latestAssessment?.assessedAt) return new Date(p.latestAssessment.assessedAt).getTime();
      // Fallback: parse t as HH:mm or HH:mm:ss
      if (typeof p.t === "string") {
        const today = new Date();
        const [h, m, s] = p.t.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, s || 0);
          return date.getTime();
        }
      }
      return 0;
    };
    return getDate(b) - getDate(a);
  });
  const lastPatient = sortedPatients[0];

  // Debug: Log the sorted patients and the selected most recent patient
  console.log("[Dashboard] Sorted patients by assessedAt:", sortedPatients.map(p => ({
    id: p.id,
    name: p.name,
    assessedAt: p.latestAssessment?.assessedAt,
    t: p.t,
    cond: p.cond
  })));
  console.log("[Dashboard] Most recent patient:", lastPatient?.id, lastPatient?.name, lastPatient?.latestAssessment?.assessedAt, lastPatient?.t);

  const stats = [
    { l: "P1 Emergencies", v: String(p1Count), gradient: C.p1grd, icon: <IconSiren size={22} color="white" />, action: () => onNav("alerts") },
    { l: "P2 Very Urgent", v: String(p2Count), gradient: C.p2grd, icon: <IconBolt size={22} color="white" />, action: () => onNav("patients", "p2") },
    { l: "Pending Review", v: String(pendingCount), gradient: "linear-gradient(135deg,#6366F1,#4338CA)", icon: <IconHourglass size={22} color="white" />, action: () => onNav("patients", "pending") },
    { l: "Triage Queue", v: String(totalTriaged), gradient: "linear-gradient(135deg,#1E7B47,#0D6B3B)", icon: <IconHospital size={22} color="white" />, action: () => onNav("patients", null) },
  ];


  const [showDisclaimer, setShowDisclaimer] = useState(!hasAcceptedDisclaimer());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Debounced live "search files" against the backend /patients/search endpoint.
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      patientService.searchPatients(term)
        .then((results) => setSearchResults(results))
        .catch((err) => {
          console.warn("[Dashboard] Patient file search failed:", err);
          setSearchResults([]);
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const openSearchResult = (item: PatientListItem) => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    onOpenPatient({
      ...item,
      n: `${item.name ?? ""} ${item.surname ?? ""}`.trim(),
      p: item.latestAssessment?.priority,
      status: item.latestAssessment?.status,
      cond: item.latestAssessment?.condition,
    });
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    if (searchResults.length > 0) {
      openSearchResult(searchResults[0]);
      return;
    }
    onNav("patients");
  };


  const displayName =
    String(currentUser?.fullName || "").trim() ||
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    "Sister Jane Dlamini";

  const displayRole =
    String(currentUser?.role || "").trim() ||
    "Midwife";

    const displayHospital =
    String(currentUser?.hospital || "").trim() ||
    "-";

  const handleAccept = () => {
    acceptDisclaimer();
    setShowDisclaimer(false);
  };

  return (
    <div className="fade-in" style={{ minHeight: "100dvh", background: C.bgSoft, paddingBottom: 80 }}>
       {showDisclaimer && <DisclaimerModal onAccept={handleAccept} />}
      <div style={{ background: C.gradGreen, padding: "24px 20px 64px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,.05)", pointerEvents: "none" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>Welcome back</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "white", marginTop: 4, letterSpacing: "-.02em" }}>{displayName}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginTop: 4, fontWeight: 500 }}>{displayRole} · {displayHospital}</div>
          </div>
          {/* Notification bell */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4, flexShrink: 0 }}>
            <ReviewNotificationPanel
              reminders={reminders}
              overdueCount={overdueCount}
              onDismiss={onDismissReminder ?? (() => {})}
              onDismissAll={onDismissAllReminders ?? (() => {})}
              onOpenPatient={(patientId) => {
                const found = patients.find((p: any) => p.id === patientId);
                if (found) onOpenPatient(found);
              }}
            />
          {/* Search button */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "1.5px solid rgba(255,255,255,.25)",
              background: searchOpen ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.1)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              marginTop: 4,
              transition: "all .2s ease",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          </div>
        </div>

        {/* Expandable search bar */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: searchOpen ? 56 : 0,
            opacity: searchOpen ? 1 : 0,
            marginTop: searchOpen ? 14 : 0,
            transition: "max-height .35s cubic-bezier(.4,0,.2,1), opacity .25s ease, margin-top .3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.15)", backdropFilter: "blur(12px)", borderRadius: 14, padding: "0 14px", border: "1.5px solid rgba(255,255,255,.2)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className="dashboard-search-input"
              placeholder="Search patients by name or file number…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearchSubmit(); if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                padding: "12px 0",
                letterSpacing: "-.01em",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: 999, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Live "search files" results dropdown */}
        {searchOpen && searchQuery.trim() !== "" && (
          <div
            style={{
              marginTop: 10,
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 10px 30px rgba(0,0,0,.22)",
              overflow: "hidden",
              maxHeight: 320,
              overflowY: "auto",
              position: "relative",
              zIndex: 20,
            }}
          >
            {searching && (
              <div style={{ padding: "14px 16px", fontSize: 13, color: C.textMuted }}>
                Searching patient files…
              </div>
            )}

            {!searching && searchResults.length === 0 && (
              <div style={{ padding: "14px 16px", fontSize: 13, color: C.textMuted }}>
                No patient files match “{searchQuery.trim()}”.
              </div>
            )}

            {!searching && searchResults.map((item) => {
              const priority = item.latestAssessment?.priority;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openSearchResult(item)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    border: "none",
                    borderBottom: `1px solid ${C.border}`,
                    background: "#fff",
                    padding: "12px 16px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
                      {`${item.name ?? ""} ${item.surname ?? ""}`.trim() || "Unnamed patient"}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                      File #{item.patientFileId ?? item.id}
                      {item.latestAssessment?.condition ? ` · ${item.latestAssessment.condition}` : ""}
                    </div>
                  </div>
                  <StatusChip
                    label={priority ? `P${priority}` : "No triage"}
                    tone={priority ? pC(priority) : C.sky}
                  />
                </button>
              );
            })}
          </div>
        )}

        <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", marginTop: 10, fontWeight: 500 }}>{today}</div>
      </div>


      <div style={{ padding: "0 14px 20px", marginTop: -40 }}>
        <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {stats.map((x, i) => (
            <div key={x.l} className="fade-up card-hover" onClick={x.action} style={{ animationDelay: `${i * 0.05}s`, background: x.gradient, borderRadius: 18, padding: "18px 16px", boxShadow: "0 6px 20px rgba(0,0,0,.18)", position: "relative", overflow: "hidden", cursor: "pointer" }}>
              <div style={{ position: "absolute", top: -14, right: -14, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,.1)" }} />
              <div style={{ fontSize: 22, marginBottom: 6 }}>{x.icon}</div>
              <div style={{ fontSize: 34, fontWeight: 900, color: "white", lineHeight: 1 }}>{x.v}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", marginTop: 6, fontWeight: 600, letterSpacing: "0.02em" }}>{x.l}</div>
            </div>
          ))}
        </div>

        {lastPatient && (
          <div className="fade-up card-hover" style={{ animationDelay: ".1s", background: C.bgSoft,borderColor: C.borderMid, borderWidth: 3, borderRadius: 18, padding: "18px 16px", marginBottom: 16, border: `1px solid ${C.borderMid}`, boxShadow: "0 4px 16px rgba(0,0,0,.07)" }} onClick={() => onOpenPatient(lastPatient)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <SectionLabel mb={8}>Recent Triage</SectionLabel>
                <div style={{ fontSize: 19, fontWeight: 800, color: C.text, letterSpacing: "-.01em" }}>{fullName(lastPatient)}</div>
                <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{resolveConditionName(lastPatient) || lastPatient.latestAssessment?.condition || lastPatient.cond || lastPatient.condition || "—"}</div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Tag priority={lastPatient.latestAssessment?.priority ?? lastPatient.p ?? lastPatient.priority} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <StatusChip label={lastPatient.latestAssessment?.status || lastPatient.status} tone={priorityColor(lastPatient.latestAssessment?.finalPriorityId || lastPatient.latestAssessment?.priority || lastPatient.p || lastPatient.priority) || pC(lastPatient.latestAssessment?.priority || lastPatient.p || lastPatient.priority)} />
                <div style={{ fontSize: 12, color: C.textMuted }}>Tap to open →</div>
              </div>
            </div>
          </div>
        )}

        <SectionLabel mb={10}>Quick Actions</SectionLabel>
        {[
          { icon: <IconStethoscope size={22} color="white" />, l: "New Triage Assessment", sub: "Capture vitals and generate priority", action: onStartNewTriage, gradient: C.gradGreen, glow: "rgba(30,123,71,.2)" },
          { icon: <IconClipboardList size={22} color="white" />, l: "Triage Queue", sub: `${totalTriaged} patients total${hasAssessmentDates ? ` · ${triagedToday} today` : ""}`, action: () => onNav("patients"), gradient: C.gradTeal, glow: "rgba(13,148,136,.18)" },
          { icon: <IconSiren size={22} color="white" />, l: "Active Alerts", sub: `${p1Count} P1 emergencies require attention`, action: () => onNav("alerts"), gradient: C.p1grd, glow: "rgba(220,38,38,.18)" },
          { icon: <IconInfo size={22} color="white" />, l: "Reports", sub: "View And Download Reports", action: () => onNav("reports"), gradient: C.gradPurple, glow: "rgba(124,58,237,.18)" },
        ].map((x, i) => (
          <div key={x.l} className="card-hover fade-up" style={{ animationDelay: `${0.12 + i * 0.05}s`, background: C.bg, borderRadius: 16, padding: "15px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, boxShadow: `0 3px 12px ${x.glow}`, border: `1px solid ${C.border}` }} onClick={x.action}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: x.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, boxShadow: `0 4px 12px ${x.glow}` }}>
              {x.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text, letterSpacing: "-.01em" }}>{x.l}</div>
              <div style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>{x.sub}</div>
            </div>
            <IconChevronRight size={18} color={C.textLight} />
          </div>
        ))}
      </div>
    </div>
  );
}
