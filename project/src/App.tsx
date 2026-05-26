import { useEffect, useState } from "react";
import { authApi, type AuthUser, type LoginResponse } from "./api";
import { ToastContainer } from "./components/ui";
import { MGMT } from "./constants/management";
import { RISK_FACTORS } from "./constants/riskFactors";
import { C } from "./constants/theme";
import {
  INITIAL_PATIENTS,
} from "./data/patients";
import { patientService } from "./services/Patientservice";
import { catalogService, resolveConditionName } from "./services/catalogService";
import { useToast } from "./state/useToast";
import "./styles/globalStyles";
import { buildPatientFromAssessment, getStatusBundle, parseSAID } from "./utils/helpers";

import {
  BottomNav,
  SearchDrawer,
} from "./components";

import { IconChevronRight, IconClipboardList, IconInfo, IconSearch, IconUser } from "./components/icons";
import { ProfileScreen } from "./screens/ProfileScreen";
import { ReportsScreen } from "./screens/ReportsScreen";

import {
  AboutScreen,
  AlertsScreen,
  PatientDetailsScreen,
  PatientsScreen,
  RegisterScreen,
  ResultScreen,
  SplashScreen,
  TriageScreen,
  WelcomeScreen,
} from "./screens";

export default function App() {
  const AUTH_TOKEN_KEY = "obsa.auth.token";

  const [screen, setScreen] = useState("splash");
  const [patientsFilter, setPatientsFilter] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const [patients, setPatients] = useState<any[]>(INITIAL_PATIENTS);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [triageDraft, setTriageDraft] = useState<any>(null);
  const [triageVersion, setTriageVersion] = useState(0);

  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthBootstrapping, setIsAuthBootstrapping] = useState(true);
  const [liveAlertCount, setLiveAlertCount] = useState<number | null>(null);

  const isAuthenticated = Boolean(authToken);

  const { toasts, toast } = useToast();

  const allPatientFiles = [
    ...patients.map((p: any) => ({ ...p, inQueue: true })),
    // ...ARCHIVED_PATIENT_FILES, // This line is commented out as ARCHIVED_PATIENT_FILES no longer exists
  ];

  const protectedScreens = new Set([
    "welcome",
    "triage",
    "result",
    "patients",
    "patient-detail",
    "alerts",
    "reports",
    "about",
    "profile",
  ]);

  function extractUser(payload: unknown): AuthUser | null {
    if (!payload || typeof payload !== "object") return null;

    const typedPayload = payload as Record<string, unknown>;

    if (typedPayload.user && typeof typedPayload.user === "object") {
      return typedPayload.user as AuthUser;
    }

    if (
      typedPayload.fullName ||
      typedPayload.email ||
      typedPayload.role ||
      typedPayload.id ||
      typedPayload.userId
    ) {
      return typedPayload as AuthUser;
    }

    return null;
  }

  async function handleAuthSuccess(loginResponse: LoginResponse) {
    const token = loginResponse.token ?? loginResponse.accessToken;
    if (!token) {
      console.error("[AUTH] Login response contained no token", loginResponse);
      return;
    }

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setAuthToken(token);

    let nextUser = extractUser(loginResponse);
    if (nextUser) {
      console.log("[AUTH] Login received user from login response", { user: nextUser.email, role: nextUser.role });
    }

    try {
      const me = await authApi.me(token);
      const meUser = extractUser(me);
      if (meUser) {
        nextUser = meUser;
        console.log("[AUTH] Login refreshed current user from /auth/me", { user: meUser.email, role: meUser.role });
      }
    } catch (error) {
      console.warn("[AUTH] Could not fetch /auth/me after login", error);
    }

    if (nextUser) {
      setCurrentUser(nextUser);
      console.log("[AUTH] Login successful", { user: nextUser.email, role: nextUser.role });
    }

    catalogService.load().catch(() => {});
    setScreen("welcome");
  }

  useEffect(() => {
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!savedToken) {
      console.log("[AUTH] No saved token found. Starting fresh.");
      setIsAuthBootstrapping(false);
      return;
    }

    console.log("[AUTH] Attempting to restore session from stored token...");

    let active = true;

    (async () => {
      try {
        const me = await authApi.me(savedToken);
        if (!active) return;

        const user = extractUser(me);
        setAuthToken(savedToken);
        setCurrentUser(user);
        // Load catalogs after session restore.
        catalogService.load().catch(() => {});
        setScreen("welcome");
        console.log("[AUTH] Session restored successfully", { user: user?.email, role: user?.role });
      } catch (error) {
        console.error("[AUTH] Session restore failed", error);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        if (!active) return;

        setAuthToken(null);
        setCurrentUser(null);
        setScreen("splash");
      } finally {
        if (active) {
          setIsAuthBootstrapping(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Poll deduplicated active alert count from API
  useEffect(() => {
    if (!isAuthenticated) return;
    function fetchAlertCount() {
      patientService.getAlerts().then((list) => {
        const seen = new Set<string>();
        let count = 0;
        for (const a of list) {
          if (a.acknowledged || a.resolved) continue;
          const key = `${a.patientId ?? "x"}_${a.type ?? a.condition ?? "unknown"}`;
          if (!seen.has(key)) { seen.add(key); count++; }
        }
        setLiveAlertCount(count);
      }).catch(() => {});
    }
    fetchAlertCount();
    const id = setInterval(fetchAlertCount, 60_000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  // Load patient queue from API whenever the user becomes authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setPatientsLoading(true);

    patientService.getAllPatients()
      .then((list) => {
        if (!active || list.length === 0) return;
        const mapped = list.map((item: any) => {
          const priority = item.latestAssessment?.priority ?? 4;
          const bundle = getStatusBundle(priority);
          return {
            id: item.id,
            patientFileId: item.patientFileId,
            name: item.name,
            surname: item.surname,
            n: `${item.name} ${item.surname}`.trim(),
            age: item.idNumber ? parseSAID(item.idNumber).age : 0,
            ga: 0,
            gravida: "1",
            para: "0",
            p: priority,
            t: item.latestAssessment?.assessedAt
              ? new Date(item.latestAssessment.assessedAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })
              : "—",
            cond: resolveConditionName(item) || item.latestAssessment?.condition || "General review",
            bp: "—/—",
            hr: "—", rr: "—", spo: "—", temp: "—", fhr: "—",
            fmov: "present", cx: "—", ctg: "",
            status: item.latestAssessment?.status ?? bundle.status,
            location: bundle.location,
            reassessDue: bundle.reassessDue,
            acknowledged: item.latestAssessment?.acknowledged ?? false,
            handover: "",
            outcome: "Awaiting clinical outcome",
            outcomeNotes: "",
            assessmentId: item.latestAssessment?.id,
            managementChecklist: Array(MGMT[priority]?.length ?? 0).fill(false),
            timeline: [],
            // Carry full latestAssessment through so screens can access obstetricConditions etc.
            latestAssessment: item.latestAssessment,
          };
        });
        setPatients(mapped);
        console.log(`[PATIENTS] Loaded ${mapped.length} patient(s) from API`);
      })
      .catch((err) => {
        console.warn("[PATIENTS] Could not load from API, using local seed data:", err);
      })
      .finally(() => {
        if (active) setPatientsLoading(false);
      });

    return () => { active = false; };
  }, [isAuthenticated]);

  // Enhanced nav to accept optional filter
  const nav = (s: string, filter?: string | null) => {
    if (!isAuthenticated && protectedScreens.has(s)) {
      console.warn("[AUTH] Blocked navigation to protected route without authentication", { route: s });
      setScreen("splash");
      setMoreOpen(false);
      return;
    }
    console.log("[NAV] Navigating to", { screen: s, filter });
    setScreen(s);
    if (s === "patients") {
      setPatientsFilter(filter ?? null);
    } else {
      setPatientsFilter(null);
    }
    setMoreOpen(false);
  };

  // ─────────────────────────────
  // LOGOUT (NEW)
  // ─────────────────────────────
  function logout() {
    console.log("🚪 [AUTH] User logged out", { user: currentUser?.email });
    localStorage.removeItem(AUTH_TOKEN_KEY);
    catalogService.reset();

    setAuthToken(null);
    setCurrentUser(null);
    setMoreOpen(false);
    setSearchOpen(false);
    setSelectedPatient(null);
    setResult(null);
    setTriageDraft(null);
    setScreen("splash");
  }

  // ─────────────────────────────
  // Patient functions
  // ─────────────────────────────
  function openPatient(patient: any) {
    setSelectedPatient(patient);
    nav("patient-detail");

    // Enrich with full summary (vitals, foetal, vaginal, notes, CTG, timeline) from API
    patientService.getPatientSummary(patient.id)
      .then((summary: any) => {
        const a = summary.latestAssessment;
        if (!a) return;

        // Parse section — may be a JSON string (from raw assessment) or an object (from summary)
        const parse = (v: any) => {
          if (!v) return {};
          if (typeof v === "string") { try { return JSON.parse(v); } catch { return {}; } }
          return v;
        };

        const vitals = parse(a.vitals);
        const foetal = parse(a.foetalMonitoring);
        const vaginal = parse(a.vaginalExam);
        const symptoms = parse(a.signsSymptoms);
        const risks = parse(a.riskFactors);

        const bpS = vitals.bp_systolic ?? "";
        const bpD = vitals.bp_diastolic ?? "";

        // Derive condKeys from the parsed signsSymptoms boolean map (skip array fields like custom_symptoms)
        const derivedCondKeys: string[] = Object.entries(symptoms)
          .filter(([k, v]) => v === true && !Array.isArray(v) && !k.startsWith("custom_"))
          .map(([k]) => k);

        // Gather custom symptoms from boolean keys
        const customFromBooleans: string[] = Object.entries(symptoms)
          .filter(([k, v]) => k.startsWith("custom_") && v === true)
          .map(([k]) => k.replace(/^custom_/, "").replace(/_/g, " ").trim());

        // Gather custom symptoms from custom_symptom_labels string
        const customFromLabels: string[] = typeof symptoms.custom_symptom_labels === "string"
          ? symptoms.custom_symptom_labels.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

        // Merge and dedupe all custom symptoms
        const derivedCustomSymptoms: string[] = Array.from(new Set([
          ...(Array.isArray((symptoms as any).custom_symptoms) ? (symptoms as any).custom_symptoms.filter((s: any) => typeof s === "string" && s.trim()) : []),
          ...customFromBooleans,
          ...customFromLabels,
        ]));

      
        const enriched = {
          ...patient,
          assessmentId: a.id ?? patient.assessmentId,
          latestAssessment: a,
          // Always re-derive condition from the live assessment so we never show
          // a stale sign/symptom label (e.g. "Proteinuria 2+") instead of the
          // resolved obstetric condition (e.g. "Gestational Hypertension").
          cond: resolveConditionName({ latestAssessment: a }) || patient.cond || "General review",
          p: a.priority ?? patient.p,
          status: a.status ?? patient.status,
          location: a.location ?? patient.location,
          outcome: a.outcome ?? patient.outcome,
          outcomeNotes: a.outcomeNotes ?? patient.outcomeNotes,
          reassessDue: a.reassessDue ?? patient.reassessDue,
          bp: bpS && bpD ? `${bpS}/${bpD}` : patient.bp,
          bpS: bpS !== "" ? String(bpS) : patient.bpS ?? "",
          bpD: bpD !== "" ? String(bpD) : patient.bpD ?? "",
          hr: vitals.heart_rate != null ? String(vitals.heart_rate) : patient.hr,
          rr: vitals.respiration_rate != null ? String(vitals.respiration_rate) : patient.rr,
          spo: vitals.spo2 != null ? String(vitals.spo2) : patient.spo,
          temp: vitals.temp != null
            ? String(vitals.temp)
            : (vitals.temperature_celsius != null ? String(vitals.temperature_celsius) : patient.temp),
          vitalSignsNotes: vitals.notes ?? patient.vitalSignsNotes ?? "",
          fhr: foetal.foetal_heart_rate != null ? String(foetal.foetal_heart_rate) : patient.fhr,
          fmov: foetal.foetal_movement ?? patient.fmov ?? "present",
          ctg: foetal.ctg_notes ?? patient.ctg ?? "",
          cx: vaginal.cervical_dilation != null ? String(vaginal.cervical_dilation) : patient.cx,
          vaginalNotes: vaginal.examination_notes ?? patient.vaginalNotes ?? "",
          condKeys: derivedCondKeys.length ? derivedCondKeys : (patient.condKeys ?? []),
          condKey: derivedCondKeys[0] || patient.condKey || "",
          customSymptoms: derivedCustomSymptoms.length ? derivedCustomSymptoms : (patient.customSymptoms ?? []),
          age: summary.id_number ? parseSAID(summary.id_number).age : patient.age,
          ga: summary.gestational_age_weeks ?? patient.ga,
          gravida: summary.gravida !== undefined ? String(summary.gravida) : patient.gravida,
          para: summary.para !== undefined ? String(summary.para) : patient.para,
          id_number: summary.id_number ?? patient.id_number ?? "",
          cell: summary.contact ?? patient.cell ?? "",
          notes: summary.notes ?? patient.notes ?? [],
          ctgScans: summary.ctgScans ?? patient.ctgScans ?? [],
          timeline: summary.timeline ?? patient.timeline ?? [],
          ...Object.fromEntries(
            RISK_FACTORS.map((r) => [
              r.k,
              risks[r.k] !== undefined ? Boolean(risks[r.k]) : Boolean(patient[r.k]),
            ])
          ),
        };
        setSelectedPatient(enriched);
        setPatients((current: any[]) =>
          current.map((p) => p.id === enriched.id ? { ...p, ...enriched } : p)
        );
        console.log("[PATIENTS] Summary loaded for patient:", patient.id);
      })
      .catch((err) => console.warn("[PATIENTS] Summary fetch failed:", err));
  }

  function updatePatient(updatedPatient: any | ((prev: any) => any)) {
    if (typeof updatedPatient === "function") {
      const updater = updatedPatient as (prev: any) => any;
      setSelectedPatient((prev: any) => {
        const next = updater(prev);
        if (next?.id) {
          setPatients((current: any[]) =>
            current.map((p) => (p.id === next.id ? next : p))
          );
        }
        return next;
      });
      return;
    }
    setPatients((current: any[]) =>
      current.map((patient) =>
        patient.id === updatedPatient.id ? updatedPatient : patient
      )
    );
    setSelectedPatient(updatedPatient);
  }

  function startNewTriage() {
    setTriageDraft(null);
    setTriageVersion((v) => v + 1);
    nav("triage");
  }

  function startRetriage(patientLike: any) {
    const draftData = {
      ...patientLike,
      // Ensure patientId is explicit — the patient list stores it as `id`, not `patientId`
      patientId: patientLike.patientId ?? patientLike.id,
      condKeys:
        patientLike.condKeys ||
        (patientLike.condKey ? [patientLike.condKey] : []),
      customSymptoms: Array.isArray(patientLike.customSymptoms)
        ? patientLike.customSymptoms
        : Array.isArray(patientLike.custom_symptoms)
          ? patientLike.custom_symptoms
          : [],

      name: patientLike.name || "",
      surname: patientLike.surname || "",
      idNumber: patientLike.idNumber || patientLike.id_number || "",
      age: patientLike.age || "",
      gestAge: patientLike.ga || "",
      gravida: patientLike.gravida || "1",
      para: patientLike.para || "0",

      // Prefer already-split bpS/bpD; fall back to splitting the combined bp string
      bpS: patientLike.bpS || (patientLike.bp ? patientLike.bp.split("/")[0] : ""),
      bpD: patientLike.bpD || (patientLike.bp ? patientLike.bp.split("/")[1] : ""),

      hr:   patientLike.hr   !== "—" ? patientLike.hr   : "",
      rr:   patientLike.rr   !== "—" ? patientLike.rr   : "",
      spo:  patientLike.spo  !== "—" ? patientLike.spo  : "",
      temp: patientLike.temp !== "—" ? patientLike.temp : "",
      fhr:  patientLike.fhr  !== "—" ? patientLike.fhr  : "",
      cx:   patientLike.cx   !== "—" ? patientLike.cx   : "0",
      ctg:  patientLike.ctg  || "",
      vitalSignsNotes: patientLike.vitalSignsNotes || "",
    };

    setTriageDraft(draftData);
    setSelectedPatient(patientLike.id ? patientLike : selectedPatient);
    setTriageVersion((v) => v + 1);
    nav("triage");
  }

  function saveResultToPatients() {
    if (!result) return;

    const existingPatient = result.sourcePatientId
      ? patients.find((p: any) => p.id === result.sourcePatientId)
      : undefined;

    const savedPatient = buildPatientFromAssessment(result, existingPatient);

    setPatients((current: any[]) => {
      if (existingPatient) {
        return current.map((p) =>
          p.id === savedPatient.id ? savedPatient : p
        );
      }
      return [savedPatient, ...current];
    });

    openPatient(savedPatient);
  }

  function startTriageFromFile(fileRecord: any) {
    setTriageDraft(fileRecord);
    setTriageVersion((v) => v + 1);
    nav("triage");
  }

  // ─────────────────────────────
  // Screens
  // ─────────────────────────────
  const screens: Record<string, any> = {
    splash: <SplashScreen onNav={nav} onAuthSuccess={handleAuthSuccess} />,
    register: <RegisterScreen onNav={nav} toast={toast} />,

    welcome: (
      <WelcomeScreen
        onNav={nav}
        patients={patients}
        onStartNewTriage={startNewTriage}
        onOpenPatient={openPatient}
        currentUser={currentUser}
        liveAlertCount={liveAlertCount}
      />
    ),

    triage: (
      <TriageScreen
        key={triageVersion}
        onNav={nav}
        onResult={(assessment: any) => setResult(assessment)}
        initialData={triageDraft}
        currentUser={currentUser}
        toast={toast}
      />
    ),

    result: (
      <ResultScreen
        onNav={nav}
        result={result}
        onSaveResult={saveResultToPatients}
        onEditAssessment={() => startRetriage(result)}
      />
    ),

    patients: (
      <PatientsScreen
        onNav={nav}
        patients={patients}
        loading={patientsLoading}
        onOpenPatient={openPatient}
        onStartNewTriage={startNewTriage}
        onOpenSearch={() => setSearchOpen(true)}
        filter={patientsFilter}
      />
    ),

    "patient-detail": (
      <PatientDetailsScreen
        key={selectedPatient?.id || "empty"}
        onNav={nav}
        patient={selectedPatient}
        onUpdatePatient={updatePatient}
        onRetriage={startRetriage}
        currentUser={currentUser}
        toast={toast}
      />
    ),

    alerts: (
      <AlertsScreen
        onNav={nav}
        patients={patients}
        onUpdatePatient={updatePatient}
        onOpenPatient={openPatient}
        currentUser={currentUser}
      />
    ),

    reports: <ReportsScreen onNav={nav} patients={patients} />,
    about: <AboutScreen onNav={nav} />,
    profile: <ProfileScreen onNav={nav} currentUser={currentUser} onLogout={logout} onUpdateUser={setCurrentUser} />,
  };

  const showsBottomNav = [
    "welcome",
    "patients",
    "alerts",
    "reports",
    "about",
    "profile",
  ].includes(screen);

  if (isAuthBootstrapping) {
    return (
      <div
        style={{
          fontFamily:'DM Sans',
          width: "100%",
          margin: "0 auto",
          minHeight: "100dvh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.textMuted,
          fontWeight: 400,
        }}
      >
        Restoring session...
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily:'DM Sans',
        width: "100%",
        margin: "0 auto",
        height: "100dvh",
        background: C.bg,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* CONTENT */}
      <div style={{ height: "100%", overflowY: "auto" }}>
        {screens[screen] || (isAuthenticated ? screens.welcome : screens.splash)}
      </div>

      {/* TOASTS */}
      <ToastContainer toasts={toasts} />

      {/* SEARCH */}
      {showsBottomNav && screen !== "patients" && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, width: "100%", margin: "0 auto" }}>
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              display: "flex",
              gap: 8,
              border: `1px solid ${C.border}`,
              background: "rgba(255,255,255,.94)",
              borderRadius: 999,
              padding: "10px 16px",
              fontWeight: 800,
            }}
          >
            <IconSearch size={14} />
            Search Patient
          </button>
        </div>
      )}

      {/* MORE MENU — bottom sheet */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.45)",
            backdropFilter: "blur(4px)",
            zIndex: 999,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="fade-up"
            style={{
              width: "100%", 
              margin: "0 auto",
              background: "#fff",
              borderRadius: "24px 24px 0 0",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
              boxShadow: "0 -8px 40px rgba(0,0,0,.18)",
              overflow: "hidden",
            }}
          >
            {/* drag pill */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: C.border }} />
            </div>

            {/* user header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 20px 18px",
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: "50%",
                background: C.gradGreen,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 900, color: "#fff",
                flexShrink: 0,
              }}>
                {currentUser?.firstName?.[0] ?? currentUser?.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
                  {[currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") || "User"}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>
                  {currentUser?.email ?? ""}
                </div>
              </div>
            </div>

            {/* menu items */}
            <div style={{ padding: "8px 12px" }}>
              {[
                { label: "Account", screen: "profile", icon: <IconUser size={20} color={C.textMid} />, desc: "View & edit your account" },
                { label: "Reports", screen: "reports", icon: <IconClipboardList size={20} color={C.textMid} />, desc: "Clinical summary reports" },
                { label: "About", screen: "about", icon: <IconInfo size={20} color={C.textMid} />, desc: "App info & version" },
              ].map((item) => (
                <button
                  key={item.screen}
                  onClick={() => nav(item.screen)}
                  style={{
                    width: "100%", border: "none", background: "transparent",
                    padding: "13px 10px", textAlign: "left", borderRadius: 14,
                    display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: C.bgDeep,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{item.desc}</div>
                  </div>
                  <div style={{ marginLeft: "auto", color: C.textLight }}><IconChevronRight size={16} color={C.textLight} /></div>
                </button>
              ))}

              <div style={{ height: 1, background: C.border, margin: "6px 0 8px" }} />

              <button
                onClick={logout}
                style={{
                  width: "100%", border: "none",
                  background: "rgba(220,38,38,.06)",
                  padding: "13px 10px", textAlign: "left", borderRadius: 14,
                  display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: "rgba(220,38,38,.10)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#dc2626">
                    <path fillRule="evenodd" d="M16.125 12a4.125 4.125 0 1 1-8.25 0a4.125 4.125 0 0 1 8.25 0" clipRule="evenodd"/>
                    <path d="M12 1.25a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0V2a.75.75 0 0 1 .75-.75ZM4.399 4.399a.75.75 0 0 1 1.06 0l2.122 2.121a.75.75 0 0 1-1.06 1.06L4.4 5.46a.75.75 0 0 1 0-1.06Zm15.202 0a.75.75 0 0 1 0 1.06l-2.122 2.122a.75.75 0 1 1-1.06-1.061l2.121-2.121a.75.75 0 0 1 1.06 0ZM1.25 12a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1-.75-.75Zm16.75 0a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75ZM7.581 16.419a.75.75 0 0 1 0 1.06L5.46 19.601a.75.75 0 0 1-1.06-1.06l2.12-2.122a.75.75 0 0 1 1.061 0Zm8.838 0a.75.75 0 0 1 1.06 0l2.122 2.121a.75.75 0 1 1-1.061 1.061l-2.121-2.121a.75.75 0 0 1 0-1.061ZM12 19.25a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75Z"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#dc2626" }}>Logout</div>
                  <div style={{ fontSize: 11, color: "#f87171", marginTop: 1 }}>End your session</div>
                </div>
              </button>
            </div>

            <div style={{ height: 16 }} />
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      {showsBottomNav && (
        <BottomNav
          active={screen}
          onNav={(s: string) => {
            if (s === "triage") startNewTriage();
            else if (s === "more") setMoreOpen(true);
            else nav(s);
          }}
          alertCount={liveAlertCount ?? patients.filter((pt: any) => pt.p === 1 && !pt.acknowledged).length}
        />
      )}

      <SearchDrawer
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        patientFiles={allPatientFiles}
        onOpenPatient={openPatient}
        onStartTriageFromFile={startTriageFromFile}
        onViewAll={() => nav("patients")}
      />
    </div>
  );
}