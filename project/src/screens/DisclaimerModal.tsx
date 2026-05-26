const DISCLAIMER_KEY = "obsatriage_disclaimer_accepted";

interface DisclaimerModalProps {
  onAccept: () => void;
}

export function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px 80px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 20,
          width: "100%",
          margin: "0 auto" ,
          height: "75vh",
          display: "flex",
          flexDirection: "column",
          border: "0.5px solid rgba(0,0,0,.1)",
        }}
      >
        {/* Scrollable content */}
        <div style={{ overflowY: "auto", padding: "24px 20px 16px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FAFAE8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B5A0D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>Clinical Disclaimer</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>ObSAtriage · Please read carefully</div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: "#444", lineHeight: 1.7, marginBottom: 14 }}>
            The assumption behind the developed MTS is that <strong>Midwives function as critical thinkers and independent practitioners.</strong> Therefore, they hold immense knowledge of midwifery care and have in-depth knowledge of obstetric emergencies.
          </div>

          <div style={{ background: "#FAFAE8", borderRadius: 10, padding: "12px 14px", marginBottom: 14, borderLeft: "3px solid #D8D365" }}>
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.75 }}>
              This means that in some instances, the midwives can <strong>disregard the digital triage system</strong> upon their own professional instinct and discretion to save a patient's life in a dire need of emergency obstetric care.
            </div>
          </div>

          <div style={{ fontSize: 11, color: "#666", lineHeight: 1.6, padding: "10px 12px", border: "0.5px solid #e5e5e5", borderRadius: 10 }}>
            By continuing, you confirm you are a registered healthcare professional and acknowledge that this tool supports — but does not replace — your clinical judgement and professional discretion.
          </div>
        </div>

        {/* Sticky footer */}
        <div style={{ padding: "12px 20px 20px", borderTop: "0.5px solid #eee", flexShrink: 0 }}>
          <button
            onClick={onAccept}
            style={{
              width: "100%",
              padding: "14px 0",
              background: "#1E7B47",
              border: "none",
              borderRadius: 12,
              color: "white",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Outfit, 'DM Sans'",
            }}
          >
            I Understand &amp; Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export const hasAcceptedDisclaimer = () =>
  localStorage.getItem(DISCLAIMER_KEY) === "true";

export const acceptDisclaimer = () =>
  localStorage.setItem(DISCLAIMER_KEY, "true");