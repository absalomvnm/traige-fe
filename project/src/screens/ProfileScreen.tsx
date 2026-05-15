import { useMemo, useState } from "react";
import type { AuthUser } from "../api";
import { C } from "../constants/theme";
import { Hdr, Card, Btn } from "../components/ui";
import {
  IconUser,
  IconHospital,
  IconCheckCircle,
  IconStethoscope,
  IconChevronRight,
  IconCheck,
} from "../components/icons";
import { useProfileReport } from "../hooks/useProfileReport";

interface ProfileScreenProps {
  onNav: (screen: string) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

// ─── Role helpers ──────────────────────────────────────────────────────────
function roleToTitle(role?: string): string {
  const r = String(role ?? "").trim().toLowerCase();
  if (!r) return "";
  if (/(doctor|physician|consultant|registrar|intern|md)/.test(r)) return "Dr.";
  if (/(midwife|sister|nursing\s*sister)/.test(r)) return "Sr.";
  if (/(matron)/.test(r)) return "Matron";
  if (/(nurse)/.test(r)) return "Nurse";
  return "";
}

function roleTheme(role?: string): { accent: string; soft: string; tag: string } {
  const r = String(role ?? "").trim().toLowerCase();
  if (/(doctor|physician|consultant|registrar|intern|md)/.test(r)) {
    return { accent: C.teal, soft: C.tealL, tag: "Medical Officer" };
  }
  if (/(midwife|sister)/.test(r)) {
    return { accent: C.purple, soft: C.purpleL, tag: "Midwifery" };
  }
  if (/(matron)/.test(r)) {
    return { accent: "#5B5A0D", soft: "#FAFAE8", tag: "Senior Nursing" };
  }
  if (/(nurse)/.test(r)) {
    return { accent: C.green, soft: C.greenL, tag: "Nursing" };
  }
  return { accent: C.green, soft: C.greenL, tag: "Clinical Staff" };
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function deriveFullName(user?: AuthUser | null): string {
  const explicit = String(user?.fullName || "").trim();
  if (explicit) return explicit;
  const combo = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return combo;
}

function deriveCredName(user?: AuthUser | null): string {
  const full = deriveFullName(user);
  if (!full) return "";
  const title = roleToTitle(user?.role) || (user as any)?.title || "";
  // Use title + last name for compact creds
  const parts = full.split(/\s+/).filter(Boolean);
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  if (title) return `${title} ${last}`;
  return full;
}

// ─── Inline icon (uses existing IconHospital-like style) ──────────────────
function IconMail(p: { size?: number; color?: string }) {
  const s = p.size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={p.color ?? "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}
function IconPhone(p: { size?: number; color?: string }) {
  const s = p.size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={p.color ?? "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}
function IconBadge(p: { size?: number; color?: string }) {
  const s = p.size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={p.color ?? "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="12" cy="11" r="3" />
      <path d="M7 19a5 5 0 0 1 10 0" />
    </svg>
  );
}
function IconLogOut(p: { size?: number; color?: string }) {
  const s = p.size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={p.color ?? "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function IconPencil(p: { size?: number; color?: string }) {
  const s = p.size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={p.color ?? "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export function ProfileScreen({ onNav, currentUser, onLogout }: ProfileScreenProps) {
  const theme = useMemo(() => roleTheme(currentUser?.role), [currentUser?.role]);

  const [profile, setProfile] = useState(() => ({
    fullName:
      deriveFullName(currentUser) ||
      "Sister Jane Dlamini",
    role: String(currentUser?.role || "").trim() || "Senior Midwife",
    email: String(currentUser?.email || "").trim() || "jane.dlamini@hospital.org",
    phone: (currentUser as any)?.cellNumber || (currentUser as any)?.phone || "+27 82 123 4567",
    hospital: (currentUser as any)?.hospital || "KZN Maternity Unit",
    sancNr: (currentUser as any)?.sancNr || "",
  }));

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const credName = deriveCredName({
    ...(currentUser ?? {}),
    fullName: profile.fullName,
    role: profile.role,
  } as any) || profile.fullName;
  const initials = initialsOf(profile.fullName);

  function updateField(key: string, value: string) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function saveProfile() {
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // ─── Styles ──────────────────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: C.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 6,
    display: "block",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1.5px solid ${C.border}`,
    background: "#fff",
    fontSize: 14,
    outline: "none",
    color: C.text,
    transition: "border-color .15s, box-shadow .15s",
  };

  function ReadField({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          background: "#fff",
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          marginBottom: 8,
          transition: "border-color .15s, box-shadow .15s",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${theme.soft}, #ffffff)`,
            color: theme.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: `1px solid ${theme.accent}25`,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.text,
              fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
              wordBreak: "break-word",
            }}
          >
            {value || <span style={{ color: C.textLight, fontWeight: 500 }}>Not set</span>}
          </div>
        </div>
      </div>
    );
  }

  function EditField({ icon, label, value, onChange, type = "text", placeholder }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: C.green }}>{icon}</span>
            {label}
          </span>
        </label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.boxShadow = `0 0 0 3px ${C.greenL}`; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>
    );
  }

  // Profile stats
  const userId = (currentUser as any)?.id;
  const { report, loading: reportLoading, error: reportError } = useProfileReport(userId);

  return (
    <div className="fade-in" style={{ minHeight: "100dvh", background: C.bgSoft, paddingBottom: 100 }}>
      <Hdr title="Account" onBack={() => onNav("welcome")} gradient={theme.accent === C.green ? C.gradGreen : theme.accent === C.teal ? C.gradTeal : theme.accent === C.purple ? C.gradPurple : C.gradGreen} />

      {/* HERO — modernized identity card */}
      <div style={{ position: "relative", padding: "0 14px" }}>
        <div
          style={{
            position: "relative",
            background: theme.accent === C.green
              ? C.gradGreen
              : theme.accent === C.teal
                ? C.gradTeal
                : theme.accent === C.purple
                  ? C.gradPurple
                  : `linear-gradient(135deg, ${theme.accent}, ${theme.accent}dd)`,
            marginTop: 12,
            borderRadius: 22,
            padding: "20px 18px 22px",
            overflow: "hidden",
            boxShadow: `0 14px 36px ${theme.accent}40`,
          }}
        >
          <div style={{ position: "absolute", top: -50, right: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -70, left: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.05)", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 14 }}>
            {/* Avatar */}
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                background: "rgba(255,255,255,.18)",
                backdropFilter: "blur(10px)",
                padding: 3,
                border: "1.5px solid rgba(255,255,255,.35)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: theme.accent,
                  fontSize: 26,
                  fontWeight: 900,
                  letterSpacing: 0.5,
                }}
              >
                {initials}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0, color: "white" }}>
              <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-.005em", lineHeight: 1.2 }}>{credName}</div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 6,
                  padding: "3px 10px",
                  background: "rgba(255,255,255,.22)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,.32)",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                <IconStethoscope size={11} color="white" />
                {profile.role}
              </div>
              {profile.hospital && (
                <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,.85)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <IconHospital size={12} color="rgba(255,255,255,.85)" />
                  {profile.hospital}
                </div>
              )}
            </div>
          </div>

          {/* Live status pills */}
          <div style={{ display: "flex", gap: 6, marginTop: 16, position: "relative", zIndex: 1 }}>
            {[
              { label: "Active", icon: <IconCheckCircle size={11} color="white" /> },
              { label: "On duty", icon: <IconUser size={11} color="white" /> },
              { label: theme.tag, icon: <IconBadge size={11} color="white" /> },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  background: "rgba(255,255,255,.16)",
                  border: "1px solid rgba(255,255,255,.24)",
                  backdropFilter: "blur(6px)",
                  borderRadius: 10,
                  padding: "7px 6px",
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "white",
                  letterSpacing: ".02em",
                }}
              >
                {s.icon}
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PERFORMANCE STATS — modern tiles */}
      <div style={{ padding: "16px 14px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: ".12em", textTransform: "uppercase" }}>
            Activity Summary
          </div>
          {report && <div style={{ fontSize: 10, color: C.textLight, fontWeight: 600 }}>Last 30 days</div>}
        </div>

        {reportLoading ? (
          <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
            Loading stats…
          </div>
        ) : reportError ? (
          <div style={{ background: "#FEF2F2", borderRadius: 16, border: `1px solid ${C.p1}40`, padding: 14, textAlign: "center", color: C.p1, fontSize: 12, fontWeight: 600 }}>
            {reportError}
          </div>
        ) : report ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {[
              { label: "Triaged", value: report.triagedCount, color: C.green, icon: "🩺" },
              { label: "Acknowledged", value: report.acknowledgementsApproved, color: C.teal, icon: "✓" },
              { label: "Notes", value: report.notesAdded, color: C.purple, icon: "📝" },
              { label: "Checklists", value: report.checklistsCompleted, color: C.p2, icon: "☑" },
              { label: "Timeline", value: report.timelineEventsLogged, color: C.sky, icon: "🕒" },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  background: "#fff",
                  borderRadius: 14,
                  border: `1px solid ${C.border}`,
                  padding: "14px 14px",
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                  transition: "transform .15s, box-shadow .15s",
                }}
                className="card-hover"
              >
                <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: s.color }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: "-.02em" }}>{s.value}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 5 }}>{s.label}</div>
                  </div>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: `${s.color}12`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      color: s.color,
                      flexShrink: 0,
                    }}
                  >
                    {s.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ padding: "12px 14px 16px" }}>
        {/* Personal Information */}
        <Card s={{ padding: 16, marginBottom: 12, borderRadius: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: "-.005em" }}>
                Personal Information
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Contact and identification details</div>
            </div>
          {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="btn-press"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: `linear-gradient(135deg, ${theme.soft}, #ffffff)`,
                  color: theme.accent,
                  border: `1px solid ${theme.accent}30`,
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: ".02em",
                  cursor: "pointer",
                }}
              >
                <IconPencil size={11} color={theme.accent} /> Edit
              </button>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 800, color: theme.accent, background: theme.soft, padding: "5px 11px", borderRadius: 999, letterSpacing: ".08em", textTransform: "uppercase", border: `1px solid ${theme.accent}30` }}>
                Editing
              </span>
            )}
          </div>

          {editing ? (
            <>
              <EditField icon={<IconUser size={12} />} label="Full Name" value={profile.fullName} onChange={(v) => updateField("fullName", v)} placeholder="e.g. Jane Dlamini" />
              <EditField icon={<IconBadge size={12} />} label="Role" value={profile.role} onChange={(v) => updateField("role", v)} placeholder="e.g. Doctor / Midwife / Nurse" />
              <EditField icon={<IconMail size={12} />} label="Email" value={profile.email} onChange={(v) => updateField("email", v)} type="email" placeholder="name@hospital.org" />
              <EditField icon={<IconPhone size={12} />} label="Phone" value={profile.phone} onChange={(v) => updateField("phone", v)} type="tel" placeholder="+27 82 000 0000" />
              <EditField icon={<IconHospital size={12} />} label="Hospital / Unit" value={profile.hospital} onChange={(v) => updateField("hospital", v)} placeholder="e.g. KZN Maternity Unit" />
            </>
          ) : (
            <>
              <ReadField icon={<IconUser size={14} />} label="Full Name" value={profile.fullName} />
              <ReadField icon={<IconBadge size={14} />} label="Role" value={profile.role} />
              <ReadField icon={<IconMail size={14} />} label="Email" value={profile.email} />
              <ReadField icon={<IconPhone size={14} />} label="Phone" value={profile.phone} />
              <ReadField icon={<IconHospital size={14} />} label="Hospital / Unit" value={profile.hospital} />
            </>
          )}

          {/* Action buttons */}
          {editing ? (
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Btn variant="ghost" onClick={() => setEditing(false)} s={{ flex: 1, padding: "12px 0", borderRadius: 12 }}>
                Cancel
              </Btn>
              <Btn
                onClick={saveProfile}
                s={{
                  flex: 2,
                  padding: "12px 0",
                  borderRadius: 12,
                  background:
                    theme.accent === C.green
                      ? C.gradGreen
                      : theme.accent === C.teal
                        ? C.gradTeal
                        : theme.accent === C.purple
                          ? C.gradPurple
                          : `linear-gradient(135deg, ${theme.accent}, ${theme.accent}dd)`,
                }}
              >
                <IconCheck size={14} color="white" style={{ marginRight: 6 }} />
                Save Changes
              </Btn>
            </div>
          ) : (
            saved && (
              <div style={{ marginTop: 12, padding: "10px 12px", background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 10, fontSize: 12, color: C.green, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <IconCheckCircle size={14} color={C.green} />
                Profile updated successfully
              </div>
            )
          )}
        </Card>

        {/* Credentials */}
        {profile.sancNr && (
          <Card s={{ padding: 16, marginBottom: 12, borderRadius: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 12, letterSpacing: "-.005em" }}>Credentials</div>
            <ReadField icon={<IconBadge size={14} />} label="SANC Number" value={profile.sancNr} mono />
          </Card>
        )}

        {/* Quick links */}
        <Card s={{ padding: 0, marginBottom: 12, overflow: "hidden", borderRadius: 18 }}>
          <div style={{ padding: "14px 16px 6px", fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: "-.005em" }}>Quick Access</div>
          {[
            { l: "About ObSAtriage", screen: "about", icon: <IconStethoscope size={14} color={theme.accent} />, sub: "App information and credits" },
            { l: "Alerts", screen: "alerts", icon: <IconUser size={14} color={theme.accent} />, sub: "Active patient notifications" },
          ].map((row, i, arr) => (
            <button
              key={row.screen}
              onClick={() => onNav(row.screen)}
              className="btn-press"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                background: "transparent",
                border: "none",
                borderTop: i === 0 ? `1px solid ${C.border}` : "none",
                borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${theme.soft}, #ffffff)`, border: `1px solid ${theme.accent}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {row.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{row.l}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{row.sub}</div>
              </div>
              <IconChevronRight size={14} color={C.textMuted} />
            </button>
          ))}
        </Card>

        {/* Sign out */}
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "14px 0",
              background: "#fff",
              border: `1.5px solid ${C.p1}`,
              color: C.p1,
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <IconLogOut size={14} color={C.p1} />
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
