import { C, pC } from "../constants/theme";
import { priorityColor, resolveConditionName } from "../services/catalogService";
import { fullName } from "../utils/helpers";
import { SectionLabel, Tag, StatusChip } from "../components/ui";
import { IconHospital, IconSiren, IconBolt, IconHourglass, IconStethoscope, IconClipboardList, IconInfo, IconChevronRight } from "../components/icons";
import { acceptDisclaimer, DisclaimerModal, hasAcceptedDisclaimer } from "./DisclaimerModal";
import { useState } from "react";
import type { AuthUser } from "../api";

interface WelcomeScreenProps {
  onNav: (screen: string, filter?: string | null) => void;
  patients: any[];
  onStartNewTriage: () => void;
  onOpenPatient: (patient: any) => void;
  currentUser?: AuthUser | null;
  liveAlertCount?: number | null;
}

export function WelcomeScreen({ onNav, patients, onStartNewTriage, onOpenPatient, currentUser, liveAlertCount }: WelcomeScreenProps) {
  const today = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const triagedToday = patients.length;
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
    { l: "Triaged Today", v: String(triagedToday), gradient: "linear-gradient(135deg,#1E7B47,#0D6B3B)", icon: <IconHospital size={22} color="white" />, action: () => onNav("patients", null) },
    { l: "P1 Emergencies", v: String(p1Count), gradient: C.p1grd, icon: <IconSiren size={22} color="white" />, action: () => onNav("alerts") },
    { l: "P2 Very Urgent", v: String(p2Count), gradient: C.p2grd, icon: <IconBolt size={22} color="white" />, action: () => onNav("patients", "p2") },
    { l: "Pending Review", v: String(pendingCount), gradient: "linear-gradient(135deg,#6366F1,#4338CA)", icon: <IconHourglass size={22} color="white" />, action: () => onNav("patients", "pending") },
  ];

  const [showDisclaimer, setShowDisclaimer] = useState(!hasAcceptedDisclaimer());

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
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>Welcome back</div>
            <div style={{ fontSize: 23, fontWeight: 900, color: "white", marginTop: 3, letterSpacing: "-.02em" }}>{displayName}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginTop: 3, fontWeight: 500 }}>{displayRole} · {displayHospital}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 10, fontWeight: 500 }}>{today}</div>
      </div>

      <div style={{ padding: "0 14px 20px", marginTop: -40 }}>
        <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {stats.map((x, i) => (
            <div key={x.l} className="fade-up card-hover" onClick={x.action} style={{ animationDelay: `${i * 0.05}s`, background: x.gradient, borderRadius: 18, padding: "18px 16px", boxShadow: "0 6px 20px rgba(0,0,0,.18)", position: "relative", overflow: "hidden", cursor: "pointer" }}>
              <div style={{ position: "absolute", top: -14, right: -14, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,.1)" }} />
              <div style={{ fontSize: 22, marginBottom: 6 }}>{x.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "white", lineHeight: 1 }}>{x.v}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.75)", marginTop: 5, fontWeight: 600, letterSpacing: "0.02em" }}>{x.l}</div>
            </div>
          ))}
        </div>

        {lastPatient && (
          <div className="fade-up card-hover" style={{ animationDelay: ".1s", background: C.bgSoft,borderColor: C.borderMid, borderWidth: 3, borderRadius: 18, padding: "18px 16px", marginBottom: 16, border: `1px solid ${C.borderMid}`, boxShadow: "0 4px 16px rgba(0,0,0,.07)" }} onClick={() => onOpenPatient(lastPatient)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <SectionLabel mb={8}>Recent Triage</SectionLabel>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "-.01em" }}>{fullName(lastPatient)}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{resolveConditionName(lastPatient) || lastPatient.latestAssessment?.condition || lastPatient.cond || lastPatient.condition || "—"}</div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Tag priority={lastPatient.latestAssessment?.priority ?? lastPatient.p ?? lastPatient.priority} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <StatusChip label={lastPatient.latestAssessment?.status || lastPatient.status} tone={priorityColor(lastPatient.latestAssessment?.finalPriorityId || lastPatient.latestAssessment?.priority || lastPatient.p || lastPatient.priority) || pC(lastPatient.latestAssessment?.priority || lastPatient.p || lastPatient.priority)} />
                <div style={{ fontSize: 11, color: C.textMuted }}>Tap to open →</div>
              </div>
            </div>
          </div>
        )}

        <SectionLabel mb={10}>Quick Actions</SectionLabel>
        {[
          { icon: <IconStethoscope size={22} color="white" />, l: "New Triage Assessment", sub: "Capture vitals and generate priority", action: onStartNewTriage, gradient: C.gradGreen, glow: "rgba(30,123,71,.2)" },
          { icon: <IconClipboardList size={22} color="white" />, l: "Triage Queue", sub: `${triagedToday} patients triaged today`, action: () => onNav("patients"), gradient: C.gradTeal, glow: "rgba(13,148,136,.18)" },
          { icon: <IconSiren size={22} color="white" />, l: "Active Alerts", sub: `${p1Count} P1 emergencies require attention`, action: () => onNav("alerts"), gradient: C.p1grd, glow: "rgba(220,38,38,.18)" },
          { icon: <IconInfo size={22} color="white" />, l: "Reports", sub: "View And Download Reports", action: () => onNav("reports"), gradient: C.gradPurple, glow: "rgba(124,58,237,.18)" },
        ].map((x, i) => (
          <div key={x.l} className="card-hover fade-up" style={{ animationDelay: `${0.12 + i * 0.05}s`, background: C.bg, borderRadius: 16, padding: "15px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, boxShadow: `0 3px 12px ${x.glow}`, border: `1px solid ${C.border}` }} onClick={x.action}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: x.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, boxShadow: `0 4px 12px ${x.glow}` }}>
              {x.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text, letterSpacing: "-.01em" }}>{x.l}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{x.sub}</div>
            </div>
            <IconChevronRight size={18} color={C.textLight} />
          </div>
        ))}
      </div>
    </div>
  );
}
