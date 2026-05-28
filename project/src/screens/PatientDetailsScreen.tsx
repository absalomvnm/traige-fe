import { useEffect, useState } from "react";
import { AiTriagePanel } from "../components/AiTriagePanel";
import { DecisionExplanation } from "../components/DecisionExplanation";
import { IconArrowLeft, IconCheck, IconClose, IconHospital, IconRefresh } from "../components/icons";
import { NoteSection } from "../components/NoteSection";
import { SignatureDisplay, SignaturePad } from "../components/SignaturePad";
import { ChecklistSkeleton, VitalTileSkeleton } from "../components/Skeletons";
import { Btn, Card, Inp, SectionLabel, Sel, StatusChip, Tag, Txt } from "../components/ui";
import { MGMT } from "../constants/management";
import { LOCATION_OPTIONS, OUTCOME_OPTIONS, STATUS_OPTIONS } from "../constants/options";
import { C, pBg, pC, pGrd, pLbl, pTm } from "../constants/theme";
import { resolveConditionName, resolveConditionSource } from "../services/catalogService";
import type { ManagementProcedure } from "../services/Patientservice";
import { fetchImageAsBlobUrl, patientService, resolveAssetUrl } from "../services/Patientservice";
import { fullName, timelineEntry } from "../utils/helpers";
import { getRealtimeVitalAlerts } from "../utils/triage";

interface PatientDetailsScreenProps {
  onNav: (screen: string) => void;
  patient: any;
  onUpdatePatient: (patient: any | ((prev: any) => any)) => void;
  onRetriage: (patient: any) => void;
  currentUser?: any;
  toast?: { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void; warning: (m: string) => void };
}

export function PatientDetailsScreen({ onNav, patient, onUpdatePatient, onRetriage, currentUser, toast }: PatientDetailsScreenProps) {
  const [ctgComment, setCtgComment] = useState("");
  const [checklistApiItems, setChecklistApiItems] = useState<Array<{id: number; item: string; completed: boolean; stepOrder?: number}>>([]);
  const [showProcedures, setShowProcedures] = useState(false);
  const [procedures, setProcedures] = useState<ManagementProcedure[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [urinalysis, setUrinalysis] = useState<{ protein?: string; leukocytes?: string; haematuria?: string; blood?: string; nitrite?: string; glucose?: string; sg?: string; bilirubin?: string; ph?: string } | null>(null);
  const [urinalysisLoading, setUrinalysisLoading] = useState(true);
  const [checklistLoading, setChecklistLoading] = useState(true);
  const [ctgScansLoading, setCtgScansLoading] = useState(true);
  const [ctgLightbox, setCtgLightbox] = useState<{ url: string; name: string } | null>(null);
  const [showAllCtg, setShowAllCtg] = useState(false);
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  if (!patient) return null;
  const { age, ga, p, t, cond, bp, hr, rr, spo, fhr, cx } = patient;
  const col = pC(p);
  const guide = MGMT[p];

  const userId: number = currentUser?.id ? Number(currentUser.id) : 0;

  const doctorPrefillName = (() => {
    const u: any = currentUser ?? {};
    const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    if (full) return full.toLowerCase().startsWith("dr") ? full : `Dr. ${full}`;
    return u.name || u.fullName || u.displayName || "";
  })();
  const doctorPrefillHpcsa = (() => {
    const u: any = currentUser ?? {};
    return String(
      u.sancNr ??
      u.sanc_nr ??
      u.sanc ??
      u.hpcsaNumber ??
      u.hpcsa_number ??
      u.hpcsa ??
      u.registrationNumber ??
      u.registration_number ??
      ""
    );
  })();

  // One-time diagnostic so we can see exactly which fields the backend returns
  // on the user object (HPCSA field-name discovery).
  useEffect(() => {
    if (currentUser) {
      console.log("[SIGNATURE PREFILL] currentUser =", currentUser);
      console.log("[SIGNATURE PREFILL] resolved name =", doctorPrefillName, "| hpcsa =", doctorPrefillHpcsa);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  function fireApi(promise: Promise<any>, label: string) {
    return promise
      .then((res) => {
        console.log(`[PATIENT DETAIL] ${label} persisted`);
        toast?.success(`${label} saved`);
        return res;
      })
      .catch((err: any) => {
        console.warn(`[PATIENT DETAIL] ${label} failed:`, err);
        toast?.error(`Failed to save ${label}`);
        throw err;
      });
  }

  // Load urinalysis results for display
  useEffect(() => {
    if (!patient?.assessmentId) { setUrinalysisLoading(false); return; }
    setUrinalysisLoading(true);
    patientService.getUrinaryAnalysis(patient.assessmentId)
      .then(res => setUrinalysis(res?.urinaryAnalysis ?? null))
      .catch(() => setUrinalysis(null))
      .finally(() => setUrinalysisLoading(false));
  }, [patient?.assessmentId]);

  // Load checklist item IDs from API so toggles can be persisted
  useEffect(() => {
    if (!patient?.assessmentId) { setChecklistLoading(false); return; }
    setChecklistLoading(true);
    patientService.getChecklist(patient.assessmentId)
      .then(items => {
        const sorted = [...items].sort((a, b) => (a.stepOrder ?? 9999) - (b.stepOrder ?? 9999) || a.id - b.id);
        setChecklistApiItems(sorted);
        // Sync the UI boolean array with the real completed states from the API.
        // Use functional updater so we merge against the latest patient (which may have
        // been enriched asynchronously after this effect captured `patient`).
        onUpdatePatient((prev: any) => ({ ...(prev ?? patient), managementChecklist: sorted.map(item => item.completed) }));
      })
      .catch((err: any) => console.warn("[PATIENT DETAIL] Checklist load failed:", err))
      .finally(() => setChecklistLoading(false));
  }, [patient?.assessmentId]);

  // Hydrate CTG monitoring + handover notes from the latest persisted note of each type
  useEffect(() => {
    if (!patient?.patientFileId) return;
    patientService.getNotesByFile(patient.patientFileId)
      .then(notes => {
        const latestOf = (type: string) =>
          notes
            .filter(n => n.noteType === type)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const latestCtg = latestOf("ctg_monitoring");
        const latestHandover = latestOf("handover");
        // Use functional updater to merge against the latest patient state.
        onUpdatePatient((prev: any) => {
          const base = prev ?? patient;
          const patch: any = {};
          if (latestCtg && !base.ctg) patch.ctg = latestCtg.content;
          if (latestHandover && !base.handover) patch.handover = latestHandover.content;
          return Object.keys(patch).length ? { ...base, ...patch } : base;
        });
      })
      .catch((err: any) => console.warn("[PATIENT DETAIL] Notes load failed:", err));
  }, [patient?.patientFileId]);

  // Hydrate CTG scans from API so the list reflects server truth
  useEffect(() => {
    if (!patient?.patientFileId) { setCtgScansLoading(false); return; }
    setCtgScansLoading(true);
    patientService.getCtgScans(patient.patientFileId)
      .then(async (scans) => {
        const mapped = await Promise.all(scans.map(async (s) => {
          const absoluteUrl = resolveAssetUrl(s.fileUrl);
          const isMissing = s.fileStatus === "missing";
          const isImage = s.contentType
            ? s.contentType.startsWith("image/")
            : /\.(png|jpe?g|gif|webp|bmp)$/i.test(s.fileName);
          const isPdf = s.contentType
            ? s.contentType === "application/pdf"
            : /\.pdf$/i.test(s.fileName);
          // Fetch image bytes via authenticated fetch → blob URL so <img> doesn't
          // need to send auth headers itself (plain <img src> can't do that).
          const preview = isMissing ? null : (isImage ? await fetchImageAsBlobUrl(absoluteUrl) : null);
          return {
            id: s.id,
            name: s.fileName,
            fileUrl: absoluteUrl,
            contentType: s.contentType,
            fileStatus: s.fileStatus,
            isMissing,
            comment: s.comment,
            uploadedBy: s.uploadedBy,
            uploadedAt: s.uploadedAt,
            time: s.uploadedAt
              ? new Date(s.uploadedAt).toLocaleString("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
              : "",
            preview,
            isPdf,
          };
        }));
        onUpdatePatient((prev: any) => ({ ...(prev ?? patient), ctgScans: mapped }));
      })
      .catch((err: any) => console.warn("[PATIENT DETAIL] CTG scans load failed:", err))
      .finally(() => setCtgScansLoading(false));
  }, [patient?.patientFileId]);

  // Hydrate persisted doctor acknowledgment + discharge authorization from the API
  // so that "Acknowledged" / "Authorized" state survives reload and re-opening.
  useEffect(() => {
    if (!patient?.assessmentId) return;
    const aid = patient.assessmentId;

    const fmt = (iso?: string) => {
      if (!iso) return "";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
    };

    patientService.getDoctorAcknowledgment(aid)
      .then((res) => {
        if (!res || !res.signature) return;
        onUpdatePatient((prev: any) => ({
          ...(prev ?? patient),
          doctorAck: {
            doctorName: res.doctorName || "",
            hpcsaNumber: res.hpcsaNumber || "",
            signatureDataUrl: res.signature || "",
            timestamp: fmt(res.signedAt),
            signedAt: res.signedAt,
            assessmentPriority: res.assessmentPriority,
          },
        }));
      })
      .catch((err: any) => {
        // 404 simply means no acknowledgment recorded yet — silent.
        const msg = String(err?.message ?? err ?? "");
        if (!/\[404\]/.test(msg)) {
          console.warn("[PATIENT DETAIL] doctor acknowledgment load failed:", err);
        }
      });

    patientService.getDischargeAuthorization(aid)
      .then((res) => {
        if (!res || !res.signature) return;
        onUpdatePatient((prev: any) => ({
          ...(prev ?? patient),
          dischargeSig: {
            doctorName: res.doctorName || "",
            hpcsaNumber: res.hpcsaNumber || "",
            signatureDataUrl: res.signature || "",
            timestamp: fmt(res.signedAt),
            signedAt: res.signedAt,
            dischargeReason: res.dischargeReason,
          },
        }));
      })
      .catch((err: any) => {
        const msg = String(err?.message ?? err ?? "");
        if (!/\[404\]/.test(msg)) {
          console.warn("[PATIENT DETAIL] discharge authorization load failed:", err);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.assessmentId]);

  function updateField(key: string, value: any) {
    onUpdatePatient({ ...patient, [key]: value });
  }

  function updateChecklist(index: number) {
    const apiItem = checklistApiItems[index];
    if (!apiItem) return;
    // Optimistic update of checklistApiItems and the boolean array together
    const newItems = checklistApiItems.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item
    );
    setChecklistApiItems(newItems);
    onUpdatePatient({
      ...patient,
      managementChecklist: newItems.map(item => item.completed),
    });
    fireApi(patientService.toggleChecklistItem(apiItem.id), `checklist toggle: ${apiItem.item.slice(0, 40)}`);
  }

  function appendTimeline(title: string, detail: string, tone = col, patch: any = {}) {
    onUpdatePatient({ ...patient, ...patch, timeline: [timelineEntry(title, detail, tone), ...(patient.timeline || [])] });
  }

  function handleCtgUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!patient.patientFileId) {
      toast?.error("Cannot upload — patient file ID missing");
      return;
    }
    const fileArr = Array.from(files);
    const commentForBatch = ctgComment;
    setCtgComment("");
    toast?.info(`Uploading ${fileArr.length} scan${fileArr.length > 1 ? "s" : ""}…`);

    fileArr.forEach((file) => {
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const isImage = file.type.startsWith("image/");
      const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";

      // Optimistic placeholder
      const placeholder: any = {
        id: tempId,
        name: file.name,
        time: new Date().toLocaleString("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
        comment: commentForBatch,
        preview: null,
        isPdf,
        uploading: true,
      };
      if (isImage) {
        const reader = new FileReader();
        reader.onload = () => {
          placeholder.preview = reader.result;
          onUpdatePatient((prev: any) => ({
            ...(prev ?? patient),
            ctgScans: (prev?.ctgScans ?? []).map((s: any) => s.id === tempId ? { ...s, preview: reader.result } : s),
          }));
        };
        reader.readAsDataURL(file);
      }
      onUpdatePatient((prev: any) => ({
        ...(prev ?? patient),
        ctgScans: [...((prev?.ctgScans) ?? []), placeholder],
      }));

      patientService.uploadCtgScan(patient.patientFileId, file, commentForBatch, userId)
        .then(async (res) => {
          const absoluteUrl = resolveAssetUrl(res.fileUrl);
          const isMissing = res.fileStatus === "missing";
          const isImageType = res.contentType
            ? res.contentType.startsWith("image/")
            : isImage;
          // Prefer the local data-URL already in memory; if not available, fetch
          // from the streaming endpoint with auth.
          const preview = isMissing ? null : (isImageType
            ? (placeholder.preview ?? await fetchImageAsBlobUrl(absoluteUrl))
            : null);
          const mapped = {
            id: res.id,
            name: res.fileName,
            fileUrl: absoluteUrl,
            contentType: res.contentType,
            fileStatus: res.fileStatus,
            isMissing,
            comment: res.comment,
            uploadedBy: res.uploadedBy,
            uploadedAt: res.uploadedAt,
            time: res.uploadedAt
              ? new Date(res.uploadedAt).toLocaleString("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
              : placeholder.time,
            preview,
            isPdf,
          };
          onUpdatePatient((prev: any) => ({
            ...(prev ?? patient),
            ctgScans: (prev?.ctgScans ?? []).map((s: any) => s.id === tempId ? mapped : s),
            timeline: [timelineEntry("CTG scan uploaded", `${file.name}${commentForBatch ? ` — ${commentForBatch}` : ""}`, C.teal), ...(prev?.timeline ?? patient.timeline ?? [])],
          }));
          toast?.success(`Uploaded ${file.name}`);
        })
        .catch((err: any) => {
          console.warn(`[PATIENT DETAIL] CTG upload failed (${file.name}):`, err);
          onUpdatePatient((prev: any) => ({
            ...(prev ?? patient),
            ctgScans: (prev?.ctgScans ?? []).map((s: any) => s.id === tempId ? { ...s, uploading: false, failed: true } : s),
          }));
          toast?.error(`Upload failed: ${file.name}`);
        });
    });
  }

  const checkedCount = checklistApiItems.length
    ? checklistApiItems.filter(item => item.completed).length
    : (patient.managementChecklist || []).filter(Boolean).length;
  const totalCount = checklistApiItems.length || (guide?.length ?? 0);

  return (
    <div className="fade-in" style={{ minHeight: "100dvh", background: C.bgSoft, paddingBottom: 90 }}>
      <div style={{ background: pGrd(p), padding: "24px 20px 60px", position: "relative", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,.2)" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.08)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <button onClick={() => onNav("patients")} className="btn-press" style={{ border: "none", background: "rgba(255,255,255,.18)", backdropFilter: "blur(8px)", borderRadius: 10, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 21 }}><IconArrowLeft size={18} color="white" /></button>
          <span style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,.9)" }}>Patient Details</span>
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,.7)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>Priority</div>
        <div style={{ fontSize: 55, fontWeight: 900, color: "white", lineHeight: 1, marginTop: 4, letterSpacing: "-.02em" }}>P{p}</div>
        <div style={{ fontSize: 23, fontWeight: 800, color: "rgba(255,255,255,.9)", marginTop: 2 }}>{pLbl(p)}</div>
        <div style={{ fontSize: 16, color: "rgba(255,255,255,.7)", marginTop: 6, fontWeight: 500 }}>Target: {pTm(p)}</div>
      </div>

      <div style={{ padding: "0 14px 20px", marginTop: -32 }}>
        <Card className="fade-up" s={{ marginBottom: 12, boxShadow: "0 6px 20px rgba(0,0,0,.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ fontSize: 23, fontWeight: 900, color: C.text, letterSpacing: "-.01em" }}>{fullName(patient)}</div>
            <StatusChip label={patient.status} tone={col} />
          </div>
          <div style={{ fontSize: 16, color: C.textMuted }}>Age {age} yrs · GA {ga} weeks · Triaged {t}</div>
          <div style={{ fontSize: 16, color: C.textMuted, marginTop: 1 }}>{patient.location}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: col }}>{resolveConditionName(patient) || cond || "—"}</div>
            {(() => {
              const src = resolveConditionSource(patient);
              if (!src) return null;
              const styles: Record<string, { bg: string; border: string; text: string; label: string }> = {
                MANUAL: { bg: "#EEF2FF", border: "#C7D2FE", text: "#3730A3", label: "via Manual" },
                RULE:   { bg: "#FAFAE8", border: "#E8E48E", text: "#5B5A0D", label: "via Rule" },
                AI:     { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46", label: "via AI" },
              };
              const s = styles[src];
              return (
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".04em", padding: "2px 8px", borderRadius: 999, background: s.bg, border: `1px solid ${s.border}`, color: s.text, textTransform: "uppercase" }}>
                  {s.label}
                </span>
              );
            })()}
          </div>
          <div style={{ marginTop: 10 }}><Tag priority={p} /></div>
        </Card>

        <Card className="fade-up" s={{ marginBottom: 12, animationDelay: ".03s" }}>
          <SectionLabel mb={12}>Status &amp; Disposition</SectionLabel>
          <Sel label="Current Status" opts={STATUS_OPTIONS} value={patient.status} onChange={(e: any) => updateField("status", e.target.value)} />
          <Sel label="Current Location" opts={LOCATION_OPTIONS} value={patient.location} onChange={(e: any) => updateField("location", e.target.value)} />
          <Inp label="Reassess Window" value={patient.reassessDue} onChange={(e: any) => updateField("reassessDue", e.target.value)} />
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {(p === 1 || p === 2) && <Btn onClick={() => {
              appendTimeline("Transferred", "Escalated to labour suite for active management", col, { status: "Transferred to labour suite", location: "Labour suite", acknowledged: true });
              if (patient.assessmentId) fireApi(patientService.updateDisposition(patient.assessmentId, { status: "Transferred to labour suite", location: "Labour suite" }), "labour suite transfer");
            }} s={{ flex: 1, padding: "11px 0", fontSize: 16}}><IconHospital size={14} color="white" style={{ marginRight: 4 }} /> Labour Suite</Btn>}
            <Btn variant="ghost" onClick={() => {
              appendTimeline("Reviewed", "Patient workflow reviewed by midwife", C.green);
              if (patient.assessmentId) fireApi(patientService.updateDisposition(patient.assessmentId, { status: patient.status, location: patient.location, reassessDue: patient.reassessDue }), "disposition save");
            }} s={{ flex: 1, padding: "11px 0", fontSize: 16 }}>Log Review</Btn>
          </div>
        </Card>

        <Card className="fade-up" s={{ marginBottom: 12, animationDelay: ".05s" }}>
          <SectionLabel mb={12}>Vital Signs</SectionLabel>
          {(() => {
            const alerts = getRealtimeVitalAlerts({
              bpS: patient.bpS, bpD: patient.bpD,
              hr: patient.hr === "—" ? "" : patient.hr,
              rr: patient.rr === "—" ? "" : patient.rr,
              spo: patient.spo === "—" ? "" : patient.spo,
              fhr: patient.fhr === "—" ? "" : patient.fhr,
              cx: patient.cx === "—" ? "" : patient.cx,
            });
            // Combined BP tile takes the worse of the two
            const bpAlert = [alerts.bpS, alerts.bpD].filter(Boolean)
              .sort((a, b) => a!.priority - b!.priority)[0];
            const tiles: Array<{ k: string; v: any; u: string; alert?: { priority: number; text: string } }> = [
              { k: "BP", v: bp, u: "mmHg", alert: bpAlert },
              { k: "HR", v: hr, u: "bpm", alert: alerts.hr },
              { k: "RR", v: rr, u: "/min", alert: alerts.rr },
              { k: "SpO₂", v: spo, u: "%", alert: alerts.spo },
              { k: "FHR", v: fhr, u: "bpm", alert: alerts.fhr },
              { k: "Cervix", v: cx, u: "cm", alert: alerts.cx },
            ];
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {tiles.map(({ k, v, u, alert }) => {
                  const pri = alert?.priority;
                  const accent = pri ? pC(pri) : "";
                  const bg = pri ? pBg(pri) : C.bgDeep;
                  const border = pri ? accent : C.border;
                  const isCritical = pri === 1;
                  return (
                    <div
                      key={k}
                      title={alert?.text}
                      className={isCritical ? "vital-critical-pulse" : undefined}
                      style={{
                        background: bg,
                        borderRadius: 12,
                        padding: "11px 12px",
                        border: `1px solid ${border}`,
                        boxShadow: pri && pri <= 2 ? `0 0 0 1px ${accent}33, 0 2px 10px ${accent}22` : "none",
                        transition: "all .2s",
                        position: "relative",
                      }}
                    >
                      {pri && (
                        <span style={{
                          position: "absolute", top: 6, right: 6,
                          fontSize: 12, fontWeight: 900, color: "#fff",
                          background: accent, padding: "1px 5px", borderRadius: 6,
                          letterSpacing: ".05em",
                        }}>P{pri}</span>
                      )}
                      <div style={{ fontSize: 13, color: pri ? accent : C.textMuted, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>{k}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: pri ? accent : C.text, marginTop: 2 }}>{v}</div>
                      <div style={{ fontSize: 13, color: pri ? accent : C.textLight, opacity: pri ? 0.85 : 1 }}>{u}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>

        {urinalysisLoading && !urinalysis && (
          <Card className="fade-up" s={{ marginBottom: 12, animationDelay: ".055s" }}>
            <SectionLabel mb={12}>Urinalysis</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <VitalTileSkeleton />
              <VitalTileSkeleton />
              <VitalTileSkeleton />
            </div>
          </Card>
        )}
        {urinalysis && (
          <Card className="fade-up" s={{ marginBottom: 12, animationDelay: ".055s" }}>
            <SectionLabel mb={12}>Urinalysis</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {(["Protein", "Leukocytes", "Haematuria", "Blood", "Nitrite", "Glucose", "SG", "Bilirubin", "ph"] as const).map(key => {
                const val = urinalysis[key.toLowerCase() as keyof typeof urinalysis];
                console.log(`[URINALYSIS] ${key}:`, val);
                const absent = !val || val === "none";
                return (
                  <div key={key} style={{ background: C.bgDeep, borderRadius: 12, padding: "11px 12px", border: `1px solid ${absent ? C.border : "#D8D365"}` }}>
                    <div style={{ fontSize: 13, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>{key}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: absent ? C.textLight : "#5B5A0D", marginTop: 2 }}>{absent ? "None" : val}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card className="fade-up" s={{ marginBottom: 12, animationDelay: ".06s" }}>
          <NoteSection
            title="Vital Signs Notes"
            noteType="vital_signs"
            patientFileId={patient.patientFileId}
            userId={userId}
            initialNotes={patient.notes}
            placeholder="Additional observations, trends, or clinical notes about vital signs..."
            composerLabel="Add vital signs note"
            accentColor={C.teal}
            toast={toast}
          />
        </Card>

        <DecisionExplanation source={patient} priority={p} />

        {patient.latestAssessment?.aiTriage && (
          <div className="fade-up" style={{ animationDelay: ".06s" }}>
            <AiTriagePanel
              aiTriage={patient.latestAssessment.aiTriage}
              aiInvokedAt={patient.latestAssessment.aiInvokedAt}
              triageSource={patient.latestAssessment.triageSource}
            />
          </div>
        )}

        <Card className="fade-up" s={{ marginBottom: 12, borderTop: `3px solid ${col}`, animationDelay: ".07s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionLabel color={col} mb={0}>Management Checklist · P{p}</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 15, color: col, fontWeight: 700, background: pBg(p), padding: "3px 10px", borderRadius: 20, border: `1px solid ${col}30` }}>{checkedCount}/{totalCount}</div>
              <button
                type="button"
                onClick={() => {
                  setShowProcedures(true);
                  setProceduresLoading(true);
                  const finalId = (patient.latestAssessment?.finalPriorityId || p);
                  patientService.getProcedures({ priorityId: finalId, gestationWeeks: ga ? Number(ga) : undefined })
                    .then(items => {
                      console.log("[PROCEDURES] raw response:", items);
                      setProcedures(items.sort((a, b) => (a.stepOrder - b.stepOrder) || (a.id - b.id)));
                    })
                    .catch(() => setProcedures([]))
                    .finally(() => setProceduresLoading(false));
                }}
                style={{ fontSize: 14, fontWeight: 700, color: "white", background: col, padding: "4px 10px", borderRadius: 16, border: "none", cursor: "pointer", letterSpacing: ".02em" }}
              >
                Reference Protocol
              </button>
            </div>
          </div>
          <div style={{ background: C.bgDeep, borderRadius: 4, height: 6, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ background: pGrd(p), height: "100%", width: `${(checkedCount / Math.max(totalCount, 1)) * 100}%`, transition: "width .4s", borderRadius: 4 }} />
          </div>
          {checklistLoading && checklistApiItems.length === 0 ? (
            <ChecklistSkeleton count={Math.max(totalCount, 4)} />
          ) : (checklistApiItems.length ? checklistApiItems : (guide ?? []).map((item, i) => ({ id: i, item, completed: Boolean(patient.managementChecklist?.[i]) }))).map((entry, i) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={entry.completed}
              onClick={() => updateChecklist(i)}
              style={{ display: "flex", gap: 12, width: "100%", marginBottom: 10, cursor: "pointer", alignItems: "flex-start", border: "none", background: entry.completed ? `${pBg(p)}88` : "transparent", padding: 0, textAlign: "left" }}
            >
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${entry.completed ? col : "#CBD5E1"}`, background: entry.completed ? pGrd(p) : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, color: "#fff", fontSize: 15, fontWeight: 900 }}>
                {entry.completed ? <IconCheck size={12} color="white" /> : ""}
              </div>
              <div style={{ fontSize: 16, color: entry.completed ? C.textMuted : C.text, lineHeight: 1.6, textDecoration: entry.completed ? "line-through" : "none", transition: "all .15s" }}>{entry.item}</div>
            </button>
          ))}
        </Card>

        <Card className="fade-up" s={{ marginBottom: 12, borderTop: `3px solid ${(p === 1 || p === 2) ? "#DC2626" : C.teal}`, animationDelay: ".075s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionLabel color={(p === 1 || p === 2) ? "#DC2626" : C.teal} mb={0}>Doctor Acknowledgment</SectionLabel>
            {patient.doctorAck ? (
              <div style={{ fontSize: 11, fontWeight: 700, color: "#065F46", background: "#ECFDF5", padding: "3px 10px", borderRadius: 20, border: "1px solid #05966940", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span aria-hidden>✓</span>Acknowledged
              </div>
            ) : (
              <>
                {(p === 1 || p === 2) && <div style={{ fontSize: 14, fontWeight: 700, color: "#DC2626", background: "#FEE2E2", padding: "3px 10px", borderRadius: 20, border: "1px solid #DC262630" }}>Required</div>}
                {p >= 3 && <div style={{ fontSize: 14, fontWeight: 700, color: C.teal, background: `${C.teal}15`, padding: "3px 10px", borderRadius: 20, border: `1px solid ${C.teal}30` }}>Recommended</div>}
              </>
            )}
          </div>
          {patient.doctorAck ? (
            <SignatureDisplay data={patient.doctorAck} accentColor={(p === 1 || p === 2) ? "#DC2626" : C.teal} label="Clinical Acknowledgment Recorded" />
          ) : (
            <SignaturePad
              title="Clinical Sign-off"
              description={`Doctor review and acknowledgment of triage assessment (P${p}). ${(p === 1 || p === 2) ? "Required for P1/P2 patients before proceeding." : "Recommended to confirm triage accuracy."}`}
              accentColor={(p === 1 || p === 2) ? "#DC2626" : C.teal}
              accentGradient={(p === 1 || p === 2) ? "linear-gradient(135deg, #DC2626, #B91C1C)" : C.gradTeal}
              prefillName={doctorPrefillName}
              prefillHpcsa={doctorPrefillHpcsa}
              readOnlyCreds
                onSign={(data) => {
                  const signedAt = new Date().toISOString();
                  const priorityLabel = `P${p}`;
                  if (!patient.assessmentId) return Promise.reject(new Error("Missing assessment id"));
                  return fireApi(patientService.submitDoctorAcknowledgment(patient.assessmentId, {
                    doctorName: data.doctorName,
                    hpcsaNumber: data.hpcsaNumber,
                    signature: data.signatureDataUrl,
                    assessmentPriority: priorityLabel,
                  }), "doctor acknowledgment").then(() => {
                    appendTimeline("Doctor acknowledged", `${data.doctorName} (${data.hpcsaNumber}) signed clinical acknowledgment for ${priorityLabel} patient`, (p === 1 || p === 2) ? "#DC2626" : C.teal, { doctorAck: { ...data, signedAt } });
                  });
                }}
            />
          )}
        </Card>


        <div
          className="fade-up"
          style={{
            background: "#fff",
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: "18px 16px 14px 16px",
            marginBottom: 12,
            animationDelay: ".08s",
          }}
        >
          <SectionLabel mb={10}>CTG Scans{(patient.ctgScans || []).length > 0 ? ` · ${(patient.ctgScans || []).length}` : ""}
             <span style={{ fontWeight: 900, fontSize: 19, verticalAlign: "middle", margin: "0 8px" }} aria-hidden>·</span>
              <div style={{  fontWeight: 600, fontSize: 11, color: C.textMuted, display: "inline", marginTop: 3 }}>Supports images and PDF files</div>
             
          </SectionLabel>

          {/* Loading skeleton */}
          {ctgScansLoading && (patient.ctgScans || []).length === 0 && (
            <div>
              {[0, 1].map((i) => (
                <div key={i} style={{ background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 10, background: `${C.border}55`, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, width: "60%", background: `${C.border}55`, borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ height: 10, width: "40%", background: `${C.border}55`, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Scan list */}
          {(patient.ctgScans || []).length > 0 && (() => {
            const allScans = [...(patient.ctgScans || [])].sort((a: any, b: any) => {
              // Uploading placeholders (no uploadedAt) always appear at the top
              if (a.uploading) return -1;
              if (b.uploading) return 1;
              const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
              const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
              return tb - ta; // newest first
            });
            const COLLAPSED_LIMIT = 2;
            const SCROLL_LIMIT = 7;
            const isExpanded = showAllCtg || allScans.length <= COLLAPSED_LIMIT;
            const visible = isExpanded ? allScans : allScans.slice(0, COLLAPSED_LIMIT);
            const needsScroll = isExpanded && allScans.length > SCROLL_LIMIT;
            return (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={needsScroll ? {
                    maxHeight: 640,
                    overflowY: "auto",
                    paddingRight: 4,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    padding: 8,
                    background: C.bg,
                  } : undefined}
                >
                  {visible.map((scan: any, idx: number) => {
                    const isUploading = scan.uploading;
                    const isFailed = scan.failed;
                    return (
                      <div key={scan.id ?? `local-${idx}`} style={{ background: C.bgDeep, border: `1px solid ${isFailed ? `${C.p1}55` : C.border}`, borderRadius: 14, padding: 12, marginBottom: 8, opacity: isUploading ? 0.7 : 1, transition: "opacity .2s" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          {/* Thumbnail */}
                          <button
                            type="button"
                            onClick={() => {
                              if (scan.isMissing) return;
                              if (scan.preview) setCtgLightbox({ url: scan.preview, name: scan.name });
                              else if (scan.fileUrl) window.open(scan.fileUrl, "_blank");
                            }}
                            disabled={isUploading || scan.isMissing || (!scan.preview && !scan.fileUrl)}
                            style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", border: `1px solid ${scan.isMissing ? "#D8D36540" : C.border}`, padding: 0, flexShrink: 0, cursor: scan.isMissing ? "not-allowed" : ((scan.preview || scan.fileUrl) && !isUploading ? "pointer" : "default"), background: scan.isMissing ? "#FAFAE8" : (scan.isPdf ? "#FEE2E2" : C.gradTeal), display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
                          >
                            {scan.isMissing ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#5B5A0D", fontSize: 12, fontWeight: 800, letterSpacing: ".04em", textAlign: "center", padding: 4, lineHeight: 1.2 }}>
                                <div style={{ fontSize: 21, lineHeight: 1 }}>⚠</div>
                                <div>MISSING</div>
                              </div>
                            ) : scan.preview ? (
                              <img
                                src={scan.preview}
                                alt={scan.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => {
                                  // Defensive: backend didn't flag missing but bytes still 404'd.
                                  const img = e.currentTarget;
                                  if (img.dataset.fallback) return;
                                  img.dataset.fallback = "1";
                                  img.style.display = "none";
                                  const parent = img.parentElement;
                                  if (parent && !parent.querySelector('[data-ctg-missing]')) {
                                    const ph = document.createElement('div');
                                    ph.setAttribute('data-ctg-missing', '1');
                                    ph.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#FAFAE8;color:#5B5A0D;font-size:9px;font-weight:800;letter-spacing:.04em;text-align:center;padding:4px;line-height:1.2";
                                    ph.innerHTML = '<div style="font-size:18px;line-height:1">⚠</div><div>MISSING</div>';
                                    parent.appendChild(ph);
                                  }
                                }}
                              />
                            ) : scan.isPdf ? (
                              <div style={{ fontSize: 13, fontWeight: 900, color: "#B91C1C", letterSpacing: ".05em" }}>PDF</div>
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none"/><polyline points="14 2 14 8 20 8" fill="none"/></svg>
                            )}
                            {isUploading && (
                              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <div className="ctg-spin" style={{ width: 22, height: 22, borderRadius: "50%", border: `2.5px solid ${C.teal}30`, borderTopColor: C.teal }} />
                              </div>
                            )}
                          </button>

                          {/* Meta */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scan.name}</div>
                            <div style={{ fontSize: 14, color: isFailed || scan.isMissing ? "#5B5A0D" : C.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                              {isUploading ? "Uploading…" : isFailed ? "Upload failed" : scan.isMissing ? "File missing on server" : scan.time}
                              {!isUploading && !isFailed && !scan.isMissing && scan.uploadedBy != null && (
                                <span style={{ color: C.textLight }}>
                                  {`· `}
                                  {String(scan.uploadedBy) === String(currentUser?.id)
                                    ? (doctorPrefillName || (currentUser as any)?.email || `User #${scan.uploadedBy}`)
                                    : `User #${scan.uploadedBy}`}
                                </span>
                              )}
                            </div>
                            {scan.comment && (
                              <div style={{ fontSize: 15, color: C.textMid, lineHeight: 1.5, marginTop: 6, padding: "6px 10px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, wordBreak: "break-word", overflowWrap: "anywhere" }}>
                                {scan.comment}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                            {scan.fileUrl && !isUploading && !scan.isMissing && (
                              <a href={scan.fileUrl} target="_blank" rel="noreferrer" download={scan.name} title="Download" style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, textDecoration: "none", border: `1px solid ${C.border}`, background: C.bg }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              </a>
                            )}
                            <button
                              type="button"
                              title="Delete scan"
                              onClick={async () => {
                                if (!isFailed && !confirm(`Delete "${scan.name}"? This cannot be undone.`)) return;
                                // Optimistically remove from UI
                                onUpdatePatient((prev: any) => ({
                                  ...(prev ?? patient),
                                  ctgScans: (prev?.ctgScans ?? []).filter((_: any, i: number) => i !== idx),
                                }));
                                // Persist deletion if the scan has a real server ID
                                if (!isFailed && scan.id && !String(scan.id).startsWith("tmp-") && patient.patientFileId) {
                                  try {
                                    await patientService.deleteCtgScan(patient.patientFileId, scan.id);
                                    toast?.success(`"${scan.name}" deleted`);
                                  } catch (err: any) {
                                    console.warn("[PATIENT DETAIL] CTG delete failed:", err);
                                    toast?.error(`Failed to delete "${scan.name}"`);
                                    // Re-fetch to restore correct server state
                                    patientService.getCtgScans(patient.patientFileId).then(async (scans) => {
                                      const mapped = await Promise.all(scans.map(async (s) => {
                                        const absoluteUrl = resolveAssetUrl(s.fileUrl);
                                        const isMissing = s.fileStatus === "missing";
                                        const isImg = s.contentType ? s.contentType.startsWith("image/") : /\.(png|jpe?g|gif|webp|bmp)$/i.test(s.fileName);
                                        return { id: s.id, name: s.fileName, fileUrl: absoluteUrl, contentType: s.contentType, fileStatus: s.fileStatus, isMissing, comment: s.comment, uploadedBy: s.uploadedBy, uploadedAt: s.uploadedAt, time: s.uploadedAt ? new Date(s.uploadedAt).toLocaleString("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "", preview: isMissing ? null : (isImg ? await fetchImageAsBlobUrl(absoluteUrl) : null), isPdf: s.contentType ? s.contentType === "application/pdf" : /\.pdf$/i.test(s.fileName) };
                                      }));
                                      onUpdatePatient((prev: any) => ({ ...(prev ?? patient), ctgScans: mapped }));
                                    }).catch(() => {});
                                  }
                                }
                              }}
                              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", color: C.textLight, display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              <IconClose size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* View all / collapse toggle */}
                {allScans.length > COLLAPSED_LIMIT && (
                  <button
                    type="button"
                    onClick={() => setShowAllCtg((v) => !v)}
                    style={{ width: "100%", marginTop: 4, padding: "10px 12px", background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 12, color: C.teal, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    {showAllCtg ? "Show less" : `View all (${allScans.length})`}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAllCtg ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                )}
              </div>
            );
          })()}

          {/* Empty state / primary upload dropzone
          {(patient.ctgScans || []).length === 0 && !ctgScansLoading && (
            <label style={{ display: "block", cursor: "pointer" }}>
              <input type="file" accept="image/*,.pdf" multiple style={{ display: "none" }} onChange={(e) => { handleCtgUpload(e.target.files); e.target.value = ""; }} />
              <div style={{ border: `2px dashed ${C.border}`, borderRadius: 14, padding: "24px 16px", textAlign: "center", background: C.bgDeep }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: C.gradTeal, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", boxShadow: "0 4px 12px rgba(13,148,136,.2)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Tap to upload CTG scan</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>Supports images and PDF files</div>
              </div>
            </label>
          )} */}

          {/* Comment field and Add scan button styled like NoteSection composer */}
          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Scan Comment
             
            </label>
            <textarea
              rows={2}
              placeholder="Add clinical notes about this CTG trace before uploading..."
              value={ctgComment}
              onChange={(e) => setCtgComment(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 15px",
                border: `1.5px solid ${C.border}`,
                borderRadius: 12,
                fontSize: 17,
                color: C.text,
                background: C.bg,
                resize: "vertical",
                transition: "all .15s",
                boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                lineHeight: 1.7,
                fontFamily: "'DM Sans', 'Outfit'",
                marginBottom: 8,
              }}
            />
            <label style={{ width: "100%" }}>
              <input type="file" accept="image/*,.pdf" multiple style={{ display: "none" }} onChange={(e) => { handleCtgUpload(e.target.files); e.target.value = ""; }} />
              <div style={{
                width: "100%",
                background: "#f7f8f9",
                color: C.purpleM,
                border: `2px dashed ${C.purpleM}`,
                borderRadius: 12,
                padding: "10px 0",
                fontWeight: 700,
                fontSize: 18,
                textAlign: "center",
                cursor: "pointer",
                marginBottom: 0,
                marginTop: 0,
                transition: "all .15s",
                boxShadow: "0 1px 3px rgba(139,92,246,.04)",
                userSelect: "none",
                letterSpacing: ".01em"
              }}>

              <span style={{ display: "inline-flex", alignItems: "center" }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={C.purpleM}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: 8, verticalAlign: "middle" }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Add Scan
              </span>
              </div>
            </label>
            <div style={{ fontSize: 14, color: C.textMuted, marginTop: 4, paddingLeft: 2 }}>
             
            </div>
          </div>
        </div>

        <Card className="fade-up" s={{ marginBottom: 12, animationDelay: ".1s" }}>
          <NoteSection
            title="CTG Monitoring Notes"
            noteType="ctg_monitoring"
            patientFileId={patient.patientFileId}
            userId={userId}
            initialNotes={patient.notes}
            placeholder="Baseline, variability, accelerations, decelerations, contractions..."
            composerLabel="Add CTG monitoring note"
            accentColor={C.purpleM}
            toast={toast}
          />
        </Card>

        <Card className="fade-up" s={{ marginBottom: 12, animationDelay: ".12s" }}>
          <NoteSection
            title="Handover Notes"
            noteType="handover"
            patientFileId={patient.patientFileId}
            userId={userId}
            initialNotes={patient.notes}
            placeholder="Capture what the next midwife or labour suite team needs immediately."
            composerLabel="Add handover note"
            hint="One entry per shift / hand-off. Earlier entries preserved for audit."
            accentColor={C.green}
            toast={toast}
          />
        </Card>

        <Card className="fade-up" s={{ marginBottom: 12, animationDelay: ".14s" }}>
          <SectionLabel mb={12}>Outcome Tracking</SectionLabel>
          <Sel label="Current Outcome" opts={OUTCOME_OPTIONS} value={patient.outcome} onChange={(e: any) => {
            const val = e.target.value;
            if (val === "Discharged home") {
              onUpdatePatient({ ...patient, outcome: val, status: "Discharged", location: "Discharged" });
            } else {
              updateField("outcome", val);
            }
          }} />
          <Txt label="Progress Notes" rows={3} value={patient.outcomeNotes || ""} onChange={(e: any) => updateField("outcomeNotes", e.target.value)} placeholder="Document disposition, delivery, escalation, or discharge summary" />
          <Btn variant="ghost" full onClick={() => {
            appendTimeline("Outcome updated", patient.outcome || "Outcome updated", C.p4);
            if (patient.assessmentId) fireApi(patientService.updateDisposition(patient.assessmentId, { outcome: patient.outcome, outcomeNotes: patient.outcomeNotes, status: patient.status, location: patient.location }), "outcome disposition");
          }} s={{ padding: "11px 0" }}>Save Progress</Btn>

          {patient.outcome === "Discharged home" && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              {patient.dischargeSig ? (
                <SignatureDisplay data={patient.dischargeSig} accentColor="#059669" label="Discharge Authorization Recorded" />
              ) : (
                <SignaturePad
                  title="Discharge Authorization"
                  description="Doctor sign-off required before patient can be discharged home. Confirms clinical criteria for safe discharge have been met."
                  accentColor="#059669"
                  accentGradient="linear-gradient(135deg, #059669, #047857)"
                  prefillName={doctorPrefillName}
                  prefillHpcsa={doctorPrefillHpcsa}
                  readOnlyCreds
                    onSign={(data) => {
                      const signedAt = new Date().toISOString();
                      const dischargeReason = (patient.outcomeNotes || "").trim() || "Stable for discharge home";
                      if (!patient.assessmentId) return Promise.reject(new Error("Missing assessment id"));
                      return fireApi(patientService.submitDischargeAuthorization(patient.assessmentId, {
                        doctorName: data.doctorName,
                        hpcsaNumber: data.hpcsaNumber,
                        signature: data.signatureDataUrl,
                        dischargeReason,
                      }), "discharge authorization").then(() => {
                        appendTimeline("Discharge authorized", `${data.doctorName} (${data.hpcsaNumber}) authorized discharge`, "#059669", { dischargeSig: { ...data, signedAt } });
                      });
                    }}
                />
              )}
            </div>
          )}
        </Card>

        <Card className="fade-up" s={{ marginBottom: 12, animationDelay: ".15s" }}>
          <NoteSection
            title="Progress Notes"
            noteType="outcome_progress"
            patientFileId={patient.patientFileId}
            userId={userId}
            initialNotes={patient.notes}
            placeholder="Ongoing labour / clinical progress updates not yet final outcome (e.g. cervix 8cm, contractions stronger)..."
            composerLabel="Add progress note"
            hint="Append-only history. Use 'Current Outcome' above to set the final disposition."
            accentColor={C.p4}
            toast={toast}
          />
        </Card>

        <Card className="fade-up" s={{ animationDelay: ".16s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
            <SectionLabel mb={0}>Patient Timeline</SectionLabel>
            <Btn variant="teal" onClick={() => onRetriage(patient)} s={{ padding: "8px 14px", fontSize: 15 }}><IconRefresh size={12} color="white" style={{ marginRight: 4 }} /> Re-triage</Btn>
          </div>
          {(() => {
            const all = patient.timeline || [];
            const PREVIEW = 5;
            const hidden = Math.max(0, all.length - PREVIEW);
            const visible = showAllTimeline || hidden === 0 ? all : all.slice(0, PREVIEW);
            // Map backend priority words / missing tones to CSS colors
            const toneFor = (item: any): string => {
              const raw = item?.tone;
              if (typeof raw === "string" && raw.startsWith("#")) return raw;
              const blob = `${item?.title || ""} ${item?.detail || ""} ${raw || ""}`.toUpperCase();
              if (blob.includes("RED") || blob.includes("P1") || blob.includes("EMERGENCY")) return C.p1;
              if (blob.includes("ORANGE") || blob.includes("AMBER") || blob.includes("P2") || blob.includes("URGENT")) return C.p2;
              if (blob.includes("YELLOW") || blob.includes("P3")) return C.p3;
              if (blob.includes("GREEN") || blob.includes("P4") || blob.includes("ROUTINE")) return C.p4;
              return C.sky;
            };
            const fmtTime = (t: string) => {
              if (!t) return "";
              const d = new Date(t);
              if (Number.isNaN(d.getTime())) return t;
              return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
            };
            return (
              <>
                {visible.map((item: any, index: number) => {
                  const tone = toneFor(item);
                  return (
                    <div key={`${item.time}-${index}`} style={{ display: "flex", gap: 14, marginBottom: index < visible.length - 1 ? 14 : 0 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div style={{ width: 14, height: 14, borderRadius: "50%", background: tone, boxShadow: `0 0 6px ${tone}60`, flexShrink: 0 }} />
                        {index < visible.length - 1 && <div style={{ width: 2, flex: 1, background: `linear-gradient(${tone},${C.border})`, marginTop: 4, borderRadius: 2 }} />}
                      </div>
                      <div style={{ paddingBottom: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{item.title} <span style={{ color: C.textMuted, fontWeight: 500 }}>· {fmtTime(item.time)}</span></div>
                        <div style={{ fontSize: 15, color: C.textMuted, marginTop: 2, lineHeight: 1.6 }}>{item.detail}</div>
                      </div>
                    </div>
                  );
                })}
                {hidden > 0 && (
                  <button
                    onClick={() => setShowAllTimeline(v => !v)}
                    style={{
                      marginTop: 12, width: "100%", padding: "10px 12px",
                      background: C.bgDeep, border: `1px dashed ${C.border}`,
                      borderRadius: 10, cursor: "pointer", color: C.teal,
                      fontSize: 15, fontWeight: 700, letterSpacing: ".02em",
                      transition: "background .15s, border-color .15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.teal; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; }}
                  >
                    {showAllTimeline ? `Hide ${hidden} earlier ${hidden === 1 ? "entry" : "entries"}` : `View ${hidden} earlier ${hidden === 1 ? "entry" : "entries"}`}
                  </button>
                )}
              </>
            );
          })()}
        </Card>
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.bg, borderTop: `1px solid ${C.border}`, padding: "14px 16px", display: "flex", gap: 10, width: "100%", margin: "0 auto" , boxShadow: "0 -4px 20px rgba(0,0,0,.08)" }}>
        <Btn variant="ghost" onClick={() => onNav("patients")} s={{ flex: 1, padding: "13px 0" }}><IconArrowLeft size={14} style={{ marginRight: 4 }} /> Back</Btn>
        <Btn onClick={() => onNav("welcome")} s={{ flex: 2, padding: "13px 0" }}>Dashboard</Btn>
      </div>

      {/* CTG Lightbox */}
      {ctgLightbox && (
        <div
          onClick={() => setCtgLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "space-between", alignItems: "center", color: "white", fontSize: 16, fontWeight: 600 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", margin: "0 auto" }}>{ctgLightbox.name}</span>
            <button onClick={(e) => { e.stopPropagation(); setCtgLightbox(null); }} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "white", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <IconClose size={16} />
            </button>
          </div>
          <img
            src={ctgLightbox.url}
            alt={ctgLightbox.name}
            onClick={(e) => e.stopPropagation()}
            style={{width: "100%", margin: "0 auto" , maxHeight: "calc(100vh - 100px)", objectFit: "contain", borderRadius: 8, boxShadow: "0 10px 40px rgba(0,0,0,.5)" }}
          />
          <div style={{ position: "absolute", bottom: 16, color: "rgba(255,255,255,.6)", fontSize: 14 }}>Tap outside to close</div>
        </div>
      )}

      {/* Reference Protocol Side-sheet */}
      {showProcedures && (
        <div
          onClick={() => setShowProcedures(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 8888, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: C.bg, borderRadius: "20px 20px 0 0", maxHeight: "75dvh", overflowY: "auto", padding: "20px 16px 32px", width: "100%", margin: "0 auto"  }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 19, fontWeight: 800, color: C.text }}>Reference Protocol</div>
                <div style={{ fontSize: 15, color: C.textMuted, marginTop: 2 }}>P{patient.latestAssessment?.finalPriorityId || p} · GA {ga} weeks</div>
              </div>
              <button
                onClick={() => setShowProcedures(false)}
                style={{ border: "none", background: C.bgDeep, borderRadius: 10, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <IconClose size={16} color={C.textMuted} />
              </button>
            </div>

            {proceduresLoading && (
              <div style={{ textAlign: "center", padding: "24px 0", color: C.textMuted, fontSize: 16 }}>Loading protocol…</div>
            )}
            {!proceduresLoading && procedures.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0", color: C.textMuted, fontSize: 16 }}>No protocol steps available for this priority.</div>
            )}
            {!proceduresLoading && procedures.map((proc, i) => {
              const titleText = proc.title || proc.name || proc.step || proc.action || proc.label || "";
              const detailText = proc.description || proc.instructions || "";
              return (
              <div key={proc.id} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: pGrd(p), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 2px 6px ${col}35` }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: "white" }}>{proc.stepOrder ?? i + 1}</span>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.5 }}>{titleText || `Step ${proc.stepOrder ?? i + 1}`}</div>
                  {detailText && <div style={{ fontSize: 15, color: C.textMuted, marginTop: 3, lineHeight: 1.6 }}>{detailText}</div>}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
