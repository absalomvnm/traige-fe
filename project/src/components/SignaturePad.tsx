import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { C } from "../constants/theme";
import { Btn, Inp } from "./ui";

interface SignatureData {
  doctorName: string;
  hpcsaNumber: string;
  signatureDataUrl: string;
  timestamp: string;
}

interface SignaturePadProps {
  title: string;
  description: string;
  accentColor: string;
  accentGradient: string;
  /**
   * Called when the doctor confirms. May return a Promise — while pending,
   * the button shows a saving state; on resolve it shows "Saved"; on reject
   * it shows an error and re-enables the form so the doctor can retry.
   */
  onSign: (data: SignatureData) => void | Promise<unknown>;
  /** Prefilled doctor name (typically current user). */
  prefillName?: string;
  /** Prefilled HPCSA / SANC number. */
  prefillHpcsa?: string;
  /** If true, name and HPCSA fields are non-editable. */
  readOnlyCreds?: boolean;
}

type SubmitStatus = "idle" | "saving" | "saved" | "error";

export function SignaturePad({ title, description, accentColor, accentGradient, onSign, prefillName = "", prefillHpcsa = "", readOnlyCreds = false }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [doctorName, setDoctorName] = useState(prefillName);
  const [hpcsaNumber, setHpcsaNumber] = useState(prefillHpcsa);
  const [isEmpty, setIsEmpty] = useState(true);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Sync prefill props into state when they arrive asynchronously (e.g. currentUser
  // loads after the component mounts on a hard refresh). Only auto-sync when the
  // fields are readonly so we don't overwrite something the user typed.
  useEffect(() => {
    if (readOnlyCreds && prefillName) setDoctorName(prefillName);
  }, [readOnlyCreds, prefillName]);
  useEffect(() => {
    if (readOnlyCreds && prefillHpcsa) setHpcsaNumber(prefillHpcsa);
  }, [readOnlyCreds, prefillHpcsa]);

  function handleClear() {
    sigRef.current?.clear();
    setIsEmpty(true);
    if (status === "error") {
      setStatus("idle");
      setErrorMsg("");
    }
  }

  async function handleSubmit() {
    if (!doctorName.trim() || !hpcsaNumber.trim() || isEmpty) return;
    if (status === "saving" || status === "saved") return;

    const sigCanvas = sigRef.current;
    // Use getCanvas() rather than getTrimmedCanvas() — the latter relies on the
    // `trim-canvas` package which ships an ESM/CJS interop bug that surfaces as
    // "(0 , import_build.default) is not a function" in modern bundlers.
    const dataUrl = sigCanvas?.getCanvas().toDataURL("image/png") || "";
    const payload: SignatureData = {
      doctorName: doctorName.trim(),
      hpcsaNumber: hpcsaNumber.trim(),
      signatureDataUrl: dataUrl,
      timestamp: new Date().toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }),
    };

    setStatus("saving");
    setErrorMsg("");
    try {
      const result = onSign(payload);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        await result;
      }
      setStatus("saved");
    } catch (err: any) {
      console.warn("[SIGNATURE PAD] onSign failed:", err);
      setStatus("error");
      setErrorMsg(err?.message || "Failed to save signature");
    }
  }

  const baseCanSubmit = Boolean(doctorName.trim() && hpcsaNumber.trim() && !isEmpty);
  const canSubmit = baseCanSubmit && status !== "saving" && status !== "saved";

  const buttonLabel =
    status === "saving" ? "Saving…" :
    status === "saved" ? "Saved ✓" :
    status === "error" ? "Retry Save" :
    "Confirm & Sign";

  const buttonBg =
    status === "saved" ? "linear-gradient(135deg, #059669, #047857)" :
    status === "error" ? "linear-gradient(135deg, #DC2626, #B91C1C)" :
    canSubmit ? accentGradient : undefined;

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.6, marginBottom: 14 }}>{description}</div>

      <Inp label="Doctor Name" value={doctorName} onChange={(e: any) => setDoctorName(e.target.value)} placeholder="Dr. Full Name" readOnly={readOnlyCreds} style={readOnlyCreds ? { background: C.bgDeep, color: C.textMid, cursor: "not-allowed" } : undefined} />
      <Inp label="HPCSA Number" value={hpcsaNumber} onChange={(e: any) => setHpcsaNumber(e.target.value)} placeholder="MP 0000000" readOnly={readOnlyCreds} style={readOnlyCreds ? { background: C.bgDeep, color: C.textMid, cursor: "not-allowed" } : undefined} />

      <div style={{ marginBottom: 6 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Signature</label>
        <div style={{ border: `2px solid ${isEmpty ? C.border : accentColor}`, borderRadius: 12, overflow: "hidden", background: "#fff", transition: "border-color .2s" }}>
          <SignatureCanvas
            ref={sigRef}
            penColor="#1E293B"
            canvasProps={{ style: { width: "100%", height: 120 } }}
            onBegin={() => setIsEmpty(false)}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <button
            onClick={handleClear}
            style={{
              border: "none", background: "transparent", color: C.textMuted, fontSize: 15,
              fontWeight: 600, cursor: "pointer", padding: "4px 8px", borderRadius: 6,
              transition: "color .15s",
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <Btn
        onClick={handleSubmit}
        full
        s={{
          padding: "13px 0",
          opacity: status === "saving" ? 0.85 : (baseCanSubmit || status === "error" ? 1 : 0.45),
          pointerEvents: canSubmit || status === "error" ? "auto" : "none",
          background: buttonBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {status === "saving" && (
          <span
            className="ctg-spin"
            aria-hidden
            style={{
              width: 14,
              height: 14,
              border: "2px solid rgba(255,255,255,0.4)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              display: "inline-block",
            }}
          />
        )}
        {buttonLabel}
      </Btn>

      {status === "error" && errorMsg && (
        <div
          role="alert"
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#FEE2E2",
            border: "1px solid #DC262640",
            color: "#991B1B",
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          {errorMsg}. Tap “Retry Save” to try again.
        </div>
      )}
      {status === "saved" && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#ECFDF5",
            border: "1px solid #05966940",
            color: "#065F46",
            fontSize: 15,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 17 }}>✓</span>
          Signature saved successfully.
        </div>
      )}
    </div>
  );
}

interface SignatureDisplayProps {
  data: SignatureData;
  accentColor: string;
  label: string;
}

export function SignatureDisplay({ data, accentColor, label }: SignatureDisplayProps) {
  return (
    <div style={{ background: C.bgDeep, border: `1px solid ${accentColor}30`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: accentColor, boxShadow: `0 0 6px ${accentColor}60` }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{data.doctorName}</div>
      <div style={{ fontSize: 15, color: C.textMuted, marginTop: 2 }}>HPCSA: {data.hpcsaNumber}</div>
      <div style={{ marginTop: 10, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, background: "#fff" }}>
        <img src={data.signatureDataUrl} alt="Doctor signature" style={{ width: "100%", height: 80, objectFit: "contain", display: "block" }} />
      </div>
      <div style={{ fontSize: 14, color: C.textMuted, marginTop: 8, fontStyle: "italic" }}>Signed {data.timestamp}</div>
    </div>
  );
}
