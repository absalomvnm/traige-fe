import { C, pC, pBg, pGrd, pLbl } from "../constants/theme";
import { priorityColor, obstetricConditionByCode } from "../services/catalogService";
import { useEffect, useRef, useState } from "react";
import { Btn, Hdr } from "../components/ui";
import { AlertCardSkeleton } from "../components/Skeletons";
import { IconSiren, IconCheck, IconCheckCircle, IconChevronRight } from "../components/icons";
import { patientService } from "../services/Patientservice";
import type { AssessmentAlert } from "../services/Patientservice";

interface AlertsScreenProps {
  onNav: (screen: string) => void;
  patients: any[];
  onUpdatePatient: (patient: any) => void;
  onOpenPatient: (patient: any) => void;
  currentUser?: any;
}

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const date = d.toLocaleDateString([], { day: "numeric", month: "short" });
    return `${time} · ${date}`;
  } catch {
    return iso;
  }
}

function humanizeType(type?: string) {
  if (!type) return "";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, background: C.bgDeep, borderRadius: 20, padding: "2px 8px" }}>{count}</div>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function roleToTitle(role?: string): string {
  const r = String(role ?? "").trim().toLowerCase();
  if (!r) return "";
  if (/(doctor|physician|consultant|registrar|intern|md)/.test(r)) return "Dr.";
  if (/(midwife|sister|nursing\s*sister)/.test(r)) return "Sr.";
  if (/(nurse|enrolled\s*nurse|en|professional\s*nurse)/.test(r)) return "Nurse";
  if (/(matron)/.test(r)) return "Matron";
  return "";
}

function formatCreds(user: any): string {
  if (!user) return "";
  // Prefer explicit title; otherwise derive from role
  const rawTitle = String(user.title ?? "").trim();
  let title = "";
  if (rawTitle) {
    title = /^dr\.?$/i.test(rawTitle) ? "Dr." : rawTitle.replace(/\.?$/, ".");
  } else {
    title = roleToTitle(user.role);
  }
  const first = String(user.firstName ?? "").trim();
  const last = String(user.lastName ?? "").trim();
  // fullName may be "Jane Dlamini" or "Dr Jane Dlamini"
  const fullName = String(user.fullName ?? "").trim();
  let surnamePart = last;
  if (!surnamePart && fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) surnamePart = parts[parts.length - 1];
  }
  if (!surnamePart) surnamePart = first;
  if (title && surnamePart) return `${title} ${surnamePart}`;
  if (first || last) return `${first} ${last}`.trim();
  if (fullName) return fullName;
  return "";
}

function resolveAckName(alert: AssessmentAlert, currentUser?: any): string {
  const named = (alert.acknowledgedBy || "").trim();
  if (named && !/^\d+$/.test(named)) return named;
  const ackId = alert.acknowledgedByUserId;
  const myId = currentUser?.id ?? (currentUser as any)?.userId;
  if (ackId != null && myId != null && String(myId) === String(ackId)) {
    const creds = formatCreds(currentUser);
    if (creds) return creds;
  }
  return ackId != null ? `User #${ackId}` : "—";
}

function AlertCard({
  alert,
  count = 1,
  acking,
  onAcknowledge,
  onView,
  currentUser,
}: {
  alert: AssessmentAlert;
  count?: number;
  acking: boolean;
  onAcknowledge: (a: AssessmentAlert) => void;
  onView: (a: AssessmentAlert) => void;
  currentUser?: any;
}) {
  const p = Math.min(Math.max((alert.finalPriorityId || alert.priority), 1), 4);
  const catColor = priorityColor(alert.finalPriorityId || alert.priority);
  const color = catColor !== "#6B7280" ? catColor : pC(p);
  const bg = pBg(p);
  const grd = pGrd(p);
  const label = pLbl(p);
  const condName = alert.obstetric_condition_code ? obstetricConditionByCode(alert.obstetric_condition_code)?.name ?? alert.obstetric_condition_code : alert.condition;
  const acked = alert.acknowledged;
  const resolvedFlag = alert.resolved;

  return (
    <div
      className={`fade-up${!acked && p === 1 ? " glow-p1" : ""}`}
      style={{
        background: C.bg,
        borderRadius: 16,
        marginBottom: 12,
        boxShadow: acked
          ? "0 2px 8px rgba(0,0,0,.05)"
          : p === 1
          ? "0 4px 20px rgba(220,38,38,.18)"
          : "0 4px 16px rgba(217,119,6,.14)",
        opacity: acked ? 0.72 : 1,
        border: `1px solid ${acked ? C.border : color + "55"}`,
        borderLeft: `4px solid ${acked ? C.border : color}`,
        overflow: "hidden",
        transition: "opacity .3s",
      }}
    >
      {/* Priority strip */}
      <div
        style={{
          background: acked ? C.bgSoft : grd,
          padding: "9px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!acked && p === 1 && <div className="pulse"><IconSiren size={13} color="white" /></div>}
          <span style={{ fontSize: 11, fontWeight: 800, color: acked ? C.textMuted : "white", letterSpacing: 0.5 }}>
            P{p} · {label}
          </span>
          {alert.type && (
            <span style={{ fontSize: 10, fontWeight: 600, color: acked ? C.textMuted : "rgba(255,255,255,.8)", background: acked ? C.bgDeep : "rgba(255,255,255,.18)", borderRadius: 6, padding: "2px 8px" }}>
              {humanizeType(alert.type)}
            </span>
          )}
          {count > 1 && (
            <span style={{ fontSize: 10, fontWeight: 800, color: acked ? C.textMuted : "white", background: acked ? C.bgDeep : "rgba(0,0,0,.25)", borderRadius: 20, padding: "2px 8px", letterSpacing: 0 }}>
              ×{count}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {resolvedFlag && (
            <span style={{ fontSize: 10, fontWeight: 700, color: C.green, background: "#ecfdf5", padding: "3px 9px", borderRadius: 20, border: "1px solid #6ee7b7" }}>
              Resolved
            </span>
          )}
          {acked && !resolvedFlag && (
            <span style={{ fontSize: 10, fontWeight: 700, color: C.p4, background: C.p4bg, padding: "3px 9px", borderRadius: 20, border: `1px solid ${C.p4b}`, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <IconCheck size={10} /> Acknowledged
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 2 }}>
              {alert.patientName || `Patient #${alert.patientId ?? alert.id}`}
            </div>
            {condName && (
              <div style={{ fontSize: 13, fontWeight: 700, color: acked ? C.textMid : color }}>
                {condName}
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, flexShrink: 0, textAlign: "right", lineHeight: 1.4 }}>
            {fmtTime(alert.triggeredAt ?? alert.createdAt)}
          </div>
        </div>

        {alert.message && (
          <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.6, background: acked ? C.bgSoft : bg, border: `1px solid ${acked ? C.border : color + "33"}`, padding: "8px 10px", borderRadius: 8, marginBottom: 10 }}>
            {alert.message}
          </div>
        )}

        {acked && (
          <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "6px 10px", background: C.p4bg, borderRadius: 8, border: `1px solid ${C.p4b}` }}>
            <IconCheck size={11} color={C.green} />
            <span>
              Acknowledged by <strong style={{ color: C.green }}>{resolveAckName(alert, currentUser)}</strong>
              {" "}at {fmtTime(alert.acknowledgedAt)}
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {!acked && !resolvedFlag && (
            <Btn variant="danger" onClick={() => onAcknowledge(alert)} s={{ flex: 1, padding: "9px 0", fontSize: 12, opacity: acking ? 0.6 : 1 }}>
              <IconCheck size={12} color="white" style={{ marginRight: 4 }} />
              {acking ? "Acknowledging…" : "Acknowledge"}
            </Btn>
          )}
          <Btn variant="ghost" onClick={() => onView(alert)} s={{ flex: acked || resolvedFlag ? "1 1 100%" : 1, padding: "9px 0", fontSize: 12 }}>
            View Patient <IconChevronRight size={12} style={{ marginLeft: 2 }} />
          </Btn>
        </div>
      </div>
    </div>
  );
}

export function AlertsScreen({ onNav, patients, onUpdatePatient, onOpenPatient, currentUser }: AlertsScreenProps) {
  const [apiAlerts, setApiAlerts] = useState<AssessmentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [ackingIds, setAckingIds] = useState<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userId = currentUser?.id ? Number(currentUser.id) : 0;

  // One-time diagnostic: log currentUser shape so we can verify which fields the backend returns
  useEffect(() => {
    console.log("[ALERTS] currentUser shape:", currentUser, "→ formatted creds:", formatCreds(currentUser));
  }, [currentUser]);

  function loadAlerts() {
    patientService
      .getAlerts()
      .then((list) => setApiAlerts(list))
      .catch((err) => console.warn("[ALERTS] Failed to load:", err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAlerts();
    intervalRef.current = setInterval(loadAlerts, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function handleAcknowledge(alert: AssessmentAlert) {
    if (ackingIds.has(alert.id)) return;
    // Find all raw duplicates (same patientId + type) that are still unacknowledged
    const dupKey = `${alert.patientId ?? "x"}_${alert.type ?? alert.condition ?? "unknown"}`;
    const duplicates = apiAlerts.filter((a) => {
      const k = `${a.patientId ?? "x"}_${a.type ?? a.condition ?? "unknown"}`;
      return k === dupKey && !a.acknowledged && !a.resolved;
    });
    const ids = duplicates.map((d) => d.id);
    setAckingIds((s) => { const n = new Set(s); ids.forEach((id) => n.add(id)); return n; });
    const now = new Date().toISOString();
    const ackName = formatCreds(currentUser) || undefined;
    // Optimistic: mark all duplicates acknowledged
    setApiAlerts((prev) =>
      prev.map((a) =>
        ids.includes(a.id) ? { ...a, acknowledged: true, acknowledgedAt: now, acknowledgedByUserId: userId, acknowledgedBy: ackName } : a
      )
    );
    const local = patients.find(
      (p: any) => p.assessmentId === alert.assessmentId || p.id === alert.patientId
    );
    if (local) onUpdatePatient({ ...local, acknowledged: true, status: "Pending transfer" });
    // Fire API calls for all duplicates in parallel
    Promise.all(duplicates.map((d) => patientService.acknowledgeAlert(d.id, userId)))
      .then(() => loadAlerts())
      .catch((err) => {
        console.warn("[ALERTS] Acknowledge failed, rolling back:", err);
        setApiAlerts((prev) =>
          prev.map((a) =>
            ids.includes(a.id) ? { ...a, acknowledged: false, acknowledgedAt: null, acknowledgedByUserId: null } : a
          )
        );
      })
      .finally(() => setAckingIds((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; }));
  }

  function handleView(alert: AssessmentAlert) {
    const local = patients.find(
      (p: any) => p.assessmentId === alert.assessmentId || p.id === alert.patientId
    );
    if (local) onOpenPatient(local);
  }

  // Deduplicate alerts: same patientId + type → keep the most recent triggeredAt, track counts
  function dedupWithCounts(list: AssessmentAlert[]): { alert: AssessmentAlert; count: number }[] {
    const map = new Map<string, { alert: AssessmentAlert; count: number }>();
    for (const a of list) {
      const key = `${a.patientId ?? "x"}_${a.type ?? a.condition ?? "unknown"}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { alert: a, count: 1 });
      } else {
        existing.count++;
        if (new Date(a.triggeredAt ?? 0) > new Date(existing.alert.triggeredAt ?? 0)) {
          existing.alert = a;
        }
      }
    }
    return Array.from(map.values());
  }

  const activeItems = dedupWithCounts(apiAlerts.filter((a) => !a.acknowledged && !a.resolved))
    .sort((a, b) => a.alert.priority - b.alert.priority);
  const ackedItems = dedupWithCounts(apiAlerts.filter((a) => a.acknowledged && !a.resolved))
    .sort((a, b) => new Date(b.alert.acknowledgedAt ?? 0).getTime() - new Date(a.alert.acknowledgedAt ?? 0).getTime());
  const resolvedItems = dedupWithCounts(apiAlerts.filter((a) => a.resolved));

  const active = activeItems.map((i) => i.alert);
  const p1active = active.filter((a) => a.priority === 1).length;
  const p2active = active.filter((a) => a.priority === 2).length;
  const allClear = !loading && active.length === 0;

  return (
    <div className="fade-in" style={{ minHeight: "100dvh", background: C.bgSoft, paddingBottom: 88 }}>
      <Hdr
        title={<><IconSiren size={18} color="white" style={{ marginRight: 6 }} /> Alerts</>}
        onBack={() => onNav("welcome")}
        gradient={active.length > 0 ? C.gradAlert : "linear-gradient(135deg,#059669,#047857)"}
      />
      <div style={{ padding: "14px 14px 28px" }}>
        {/* Banner */}
        <div style={{ background: allClear ? "linear-gradient(135deg,#059669,#047857)" : C.gradAlert, borderRadius: 16, padding: "18px 18px 16px", marginBottom: 18, boxShadow: allClear ? "0 4px 14px rgba(5,150,105,.3)" : "0 6px 24px rgba(220,38,38,.35)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "white" }}>{active.length} Active Alert{active.length !== 1 ? "s" : ""}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)", marginTop: 2 }}>{allClear ? "All alerts acknowledged — great work!" : "These cases require IMMEDIATE attention"}</div>
            </div>
            {allClear ? <IconCheckCircle size={36} color="rgba(255,255,255,.8)" /> : <div className="pulse"><IconSiren size={28} color="rgba(255,255,255,.8)" /></div>}
          </div>
          {(p1active > 0 || p2active > 0) && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {p1active > 0 && <div style={{ background: "rgba(255,255,255,.2)", backdropFilter: "blur(4px)", borderRadius: 8, padding: "5px 12px", fontSize: 11, color: "white", fontWeight: 700 }}>{p1active} P1 Immediate</div>}
              {p2active > 0 && <div style={{ background: "rgba(255,255,255,.2)", backdropFilter: "blur(4px)", borderRadius: 8, padding: "5px 12px", fontSize: 11, color: "white", fontWeight: 700 }}>{p2active} P2 Critical</div>}
            </div>
          )}
        </div>

        {/* Skeleton */}
        {loading && apiAlerts.length === 0 && (
          <>{Array.from({ length: 3 }).map((_, i) => <AlertCardSkeleton key={i} delay={i * 0.06} />)}</>
        )}

        {/* Active */}
        {!loading && activeItems.length > 0 && (
          <>
            <SectionHeader label="Active Alerts" count={activeItems.length} />
            {activeItems.map(({ alert: a, count }) => (
              <AlertCard key={a.id} alert={a} count={count} acking={ackingIds.has(a.id)} onAcknowledge={handleAcknowledge} onView={handleView} currentUser={currentUser} />
            ))}
          </>
        )}

        {/* Acknowledged */}
        {ackedItems.length > 0 && (
          <div style={{ marginTop: activeItems.length > 0 ? 18 : 0 }}>
            <SectionHeader label="Acknowledged" count={ackedItems.length} />
            {ackedItems.map(({ alert: a, count }) => (
              <AlertCard key={a.id} alert={a} count={count} acking={ackingIds.has(a.id)} onAcknowledge={handleAcknowledge} onView={handleView} currentUser={currentUser} />
            ))}
          </div>
        )}

        {/* Resolved */}
        {resolvedItems.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <SectionHeader label="Resolved" count={resolvedItems.length} />
            {resolvedItems.map(({ alert: a, count }) => (
              <AlertCard key={a.id} alert={a} count={count} acking={false} onAcknowledge={handleAcknowledge} onView={handleView} currentUser={currentUser} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && apiAlerts.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <IconCheckCircle size={44} color={C.green} />
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginTop: 14 }}>All clear</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>No alerts at this time</div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: C.textMuted }}>
          Refreshes every 60s ·{" "}
          <span style={{ cursor: "pointer", textDecoration: "underline", color: C.green }} onClick={loadAlerts}>Refresh now</span>
        </div>
      </div>
    </div>
  );
}
