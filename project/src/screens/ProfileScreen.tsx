import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthUser } from "../api";
import { authApi } from "../api/auth";
import {
  IconHospital,
  IconStethoscope,
  IconUser
} from "../components/icons";
import { Btn, Card, Hdr } from "../components/ui";
import { C } from "../constants/theme";
import { useProfileReport } from "../hooks/useProfileReport";
import { formatCellNumber, validateCellNumber } from "../utils/helpers";

// ─── TYPES & INTERFACES ──────────────────────────────────────────────────

interface ProfileScreenProps {
  onNav: (screen: string) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onUpdateUser?: (user: AuthUser) => void;
}

// ─── ROLE & FORMATTING HELPERS ───────────────────────────────────────────

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
  const parts = full.split(/\s+/).filter(Boolean);
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  if (title) return `${title} ${last}`;
  return full;
}

// ─── STYLED HELPER COMPONENTS (DEFINED OUTSIDE TO PREVENT FOCUS LOSS) ──────

function ReadField({ icon, label, value, mono, theme }: any) {
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

function EditField({ icon, label, value, onChange, type = "text", placeholder, inputRef, error }: any) {
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
    border: `1.5px solid ${error ? C.p1 : C.border}`,
    background: "#fff",
    fontSize: 14,
    outline: "none",
    color: C.text,
  };

  const errorStyle: React.CSSProperties = {
    marginTop: 6,
    fontSize: 12,
    color: C.p1,
    lineHeight: 1.3,
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: C.green }}>{icon}</span>
          {label}
        </span>
      </label>
      <input
        ref={inputRef}
        type={type}
        value={value}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = C.green;
          e.currentTarget.style.boxShadow = `0 0 0 3px ${C.greenL}`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? C.p1 : C.border;
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      {error ? <div style={errorStyle}>{error}</div> : null}
    </div>
  );
}

const IconMail = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m22 7-10 6L2 7" /></svg>
);
const IconPhone = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" /></svg>
);
const IconBadge = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="11" r="3" /><path d="M7 19a5 5 0 0 1 10 0" /></svg>
);
const IconLogOut = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
);
const IconPencil = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────

export function ProfileScreen({ onNav, currentUser, onLogout, onUpdateUser }: ProfileScreenProps) {
  const theme = useMemo(() => roleTheme(currentUser?.role), [currentUser?.role]);

  const [profile, setProfile] = useState(() => ({
    fullName: deriveFullName(currentUser) || "Sister Jane Dlamini",
    role: String(currentUser?.role || "").trim() || "Senior Midwife",
    email: String(currentUser?.email || "").trim() || "jane.dlamini@hospital.org",
    phone: (currentUser as any)?.cellNumber || (currentUser as any)?.phone || "+27 82 123 4567",
    hospital: (currentUser as any)?.hospital || "KZN Maternity Unit",
    sancNr: (currentUser as any)?.sancNr || "",
  }));

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  const fullNameInputRef = useRef<HTMLInputElement | null>(null);
  const hasFocusedFirstField = useRef(false);

  // Sync logic
  useEffect(() => {
    // Focus management
    if (editing && fullNameInputRef.current && !hasFocusedFirstField.current) {
      fullNameInputRef.current.focus();
      hasFocusedFirstField.current = true;
    }
    if (!editing) {
      hasFocusedFirstField.current = false;
    }

    // Only update profile from currentUser if we are NOT in the middle of editing
    if (!editing) {
      setProfile({
        fullName: deriveFullName(currentUser) || "Sister Jane Dlamini",
        role: String(currentUser?.role || "").trim() || "Senior Midwife",
        email: String(currentUser?.email || "").trim() || "jane.dlamini@hospital.org",
        phone: (currentUser as any)?.cellNumber || (currentUser as any)?.phone || "+27 82 123 4567",
        hospital: (currentUser as any)?.hospital || "KZN Maternity Unit",
        sancNr: (currentUser as any)?.sancNr || "",
      });
    }
  }, [currentUser, editing]);

  const credName = deriveCredName({
    ...(currentUser ?? {}),
    fullName: profile.fullName,
    role: profile.role,
  } as any) || profile.fullName;
  
  const initials = initialsOf(profile.fullName);

  function updateField(key: string, value: string) {
    if (key === "phone") {
      const formatted = formatCellNumber(value);
      setPhoneError(validateCellNumber(formatted));
      setProfile((p) => ({ ...p, phone: formatted }));
      return;
    }

    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function saveProfile() {
    const phoneValidation = validateCellNumber(profile.phone);
    if (phoneValidation) {
      setPhoneError(phoneValidation);
      setSaveError("Please enter a valid South African phone number.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const token = localStorage.getItem("obsa.auth.token") || "";
      const updated = await authApi.updateProfile(profile, token);

      const mergedProfile = { ...profile, ...updated };
      setProfile(mergedProfile);

      const updatedUser: AuthUser = {
        ...(currentUser ?? {}),
        ...updated,
        ...mergedProfile,
      };

      onUpdateUser?.(updatedUser);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setSaveError(err?.message ?? "Failed to save. Please try again.");
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  const userId = (currentUser as any)?.id;
  const { report, loading: reportLoading, error: reportError } = useProfileReport(userId);

  return (
    <div className="fade-in" style={{ minHeight: "100dvh", background: C.bgSoft, paddingBottom: 100 }}>
      <Hdr 
        title="Account" 
        onBack={() => onNav("welcome")} 
        gradient={theme.accent === C.green ? C.gradGreen : theme.accent === C.teal ? C.gradTeal : theme.accent === C.purple ? C.gradPurple : C.gradGreen} 
      />

      {/* HERO SECTION */}
      <div style={{ position: "relative", padding: "0 14px" }}>
        <div style={{
            position: "relative",
            background: theme.accent === C.green ? C.gradGreen : theme.accent === C.teal ? C.gradTeal : theme.accent === C.purple ? C.gradPurple : `linear-gradient(135deg, ${theme.accent}, ${theme.accent}dd)`,
            marginTop: 12,
            borderRadius: 22,
            padding: "20px 18px 22px",
            boxShadow: `0 14px 36px ${theme.accent}40`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 76, height: 76, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", color: theme.accent, fontSize: 26, fontWeight: 900 }}>
              {initials}
            </div>
            <div style={{ flex: 1, color: "white" }}>
              <div style={{ fontSize: 19, fontWeight: 900 }}>{credName}</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, padding: "3px 10px", background: "rgba(255,255,255,.22)", borderRadius: 999, fontSize: 10, fontWeight: 800 }}>
                <IconStethoscope size={11} color="white" /> {profile.role}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS SECTION */}
      <div style={{ padding: "16px 14px 6px" }}>
        {reportLoading ? (
            <div style={{ padding: 20, textAlign: "center", color: C.textMuted }}>Loading stats…</div>
        ) : report ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
             {[
                { label: "Triaged", value: report.triagedCount, color: C.green, icon: "🩺" },
                { label: "Notes", value: report.notesAdded, color: C.purple, icon: "📝" },
             ].map((s, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.border}`, padding: 14 }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted }}>{s.label}</div>
                </div>
             ))}
          </div>
        ) : null}
      </div>

      {/* DATA SECTION */}
      <div style={{ padding: "12px 14px 16px" }}>
        <Card s={{ padding: 16, borderRadius: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Personal Information</div>
            {!editing && (
              <button onClick={() => setEditing(true)} style={{ color: theme.accent, background: 'none', border: 'none', fontWeight: 800, fontSize: 12 }}>
                <IconPencil size={12} /> Edit
              </button>
            )}
          </div>

          {editing ? (
            <>
              <EditField icon={<IconUser size={12} />} label="Full Name" value={profile.fullName} onChange={(v: string) => updateField("fullName", v)} inputRef={fullNameInputRef} />
              <EditField icon={<IconBadge size={12} />} label="Role" value={profile.role} onChange={(v: string) => updateField("role", v)} />
              <ReadField theme={theme} icon={<IconMail size={14} />} label="Email" value={profile.email} />
              <EditField icon={<IconPhone size={12} />} label="Phone" value={profile.phone} onChange={(v: string) => updateField("phone", v)} type="tel" placeholder="+27 82 000 0000" error={phoneError} />
              <EditField icon={<IconHospital size={12} />} label="Hospital" value={profile.hospital} onChange={(v: string) => updateField("hospital", v)} />
              
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <Btn variant="ghost" onClick={() => setEditing(false)} s={{ flex: 1 }}>Cancel</Btn>
                <Btn onClick={saveProfile} disabled={saving} s={{ flex: 2, background: theme.accent }}>
                  {saving ? "Saving..." : "Save Changes"}
                </Btn>
              </div>
            </>
          ) : (
            <>
              <ReadField theme={theme} icon={<IconUser size={14} />} label="Full Name" value={profile.fullName} />
              <ReadField theme={theme} icon={<IconBadge size={14} />} label="Role" value={profile.role} />
              <ReadField theme={theme} icon={<IconMail size={14} />} label="Email" value={profile.email} />
              <ReadField theme={theme} icon={<IconPhone size={14} />} label="Phone" value={profile.phone} />
              <ReadField theme={theme} icon={<IconHospital size={14} />} label="Hospital" value={profile.hospital} />
            </>
          )}
        </Card>

        {onLogout && (
          <button onClick={onLogout} style={{ width: "100%", marginTop: 20, padding: 14, background: "#fff", border: `1.5px solid ${C.p1}`, color: C.p1, borderRadius: 14, fontWeight: 700 }}>
            <IconLogOut size={14} /> Sign Out
          </button>
        )}
      </div>
    </div>
  );
}