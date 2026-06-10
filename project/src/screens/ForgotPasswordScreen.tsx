import { useState } from "react";
import { authApi, getApiErrorMessage, isApiError } from "../api";
import { Btn, Inp } from "../components/ui";
import { C } from "../constants/theme";

const IconArrowLeft = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

interface ForgotPasswordScreenProps {
  onNav: (screen: string) => void;
  toast?: { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void; warning: (m: string) => void };
}

export function ForgotPasswordScreen({ onNav, toast }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isFormValid = email.trim() !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      console.log("📧 [FORGOT PASSWORD] Attempting password reset request", { email });
      const response = await authApi.forgotPassword({ email });

      console.log("[FORGOT PASSWORD] Request successful");
      setSuccessMsg(response.message || "Password reset link has been sent. Check your email.");
      setSubmitted(true);
      toast?.success("Password reset email sent successfully");
    } catch (error: unknown) {
      console.error("[FORGOT PASSWORD] Request failed:", error);
      let msg = "Failed to process password reset. Please try again.";

      if (isApiError(error)) {
        msg = getApiErrorMessage(error, "Failed to process your request. Please try again.");
      }

      if (error instanceof TypeError) {
        msg = "Connection error: Is the backend server running?";
      }

      setErrorMsg(msg);
      toast?.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: C.gradDark,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "26px 24px 20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(30,123,71,.12)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(124,58,237,.1)",
            pointerEvents: "none",
          }}
        />

        <div style={{ textAlign: "center", width: "100%", marginBottom: 28 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(34, 197, 94, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              marginBottom: 20,
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.35,
              marginBottom: 14,
              letterSpacing: "-.01em",
            }}
          >
            Check Your Email
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,.65)", lineHeight: 1.6, marginBottom: 20 }}>
            We've sent a password reset link to <strong>{email}</strong>. Check your email and follow the link to reset your password.
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", marginBottom: 28 }}>
            The reset link will expire in 1 hour for security reasons.
          </div>
        </div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn
            full
            onClick={() => onNav("splash")}
            s={{ padding: "15px 0", fontSize: 16, borderRadius: 14, letterSpacing: ".01em" }}
          >
            Back to Login
          </Btn>
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 11,
            color: "rgba(255,255,255,.28)",
            letterSpacing: "0.05em",
          }}
        >
          Department of Health · Republic of South Africa
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ minHeight: "100dvh", background: C.bgSoft }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
        <button
          onClick={() => onNav("splash")}
          style={{
            background: "transparent",
            border: "none",
            padding: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.text,
            marginLeft: -8,
          }}
          aria-label="Go back"
        >
          <IconArrowLeft size={24} color={C.text} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Reset Password</div>
        </div>
      </div>

      <div style={{ padding: "24px 20px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, marginBottom: 4 }}>
            Enter your email address and we'll send you a link to reset your password.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <Inp
            label="Email Address"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e: any) => {
              setEmail(e.target.value);
              setErrorMsg(null);
            }}
          />
        </div>

        {errorMsg && (
          <div
            className="fade-in"
            style={{
              backgroundColor: "rgba(220, 38, 38, 0.12)",
              color: "#b91c1c",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(220, 38, 38, 0.25)",
              fontSize: 13,
              marginBottom: 20,
              whiteSpace: "pre-line",
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            className="fade-in"
            style={{
              backgroundColor: "rgba(22, 163, 74, 0.12)",
              color: "#166534",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(22, 163, 74, 0.25)",
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            {successMsg}
          </div>
        )}

        <Btn
          full
          onClick={handleSubmit}
          disabled={isLoading || !isFormValid}
          s={{
            padding: "14px 0",
            borderRadius: 14,
            opacity: (!isFormValid || isLoading) ? 0.5 : 1,
          }}
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </Btn>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.textMuted }}>
          Remember your password?{" "}
          <span
            style={{ color: C.green, fontWeight: 700, cursor: "pointer" }}
            onClick={() => onNav("splash")}
          >
            Sign in
          </span>
        </div>
      </div>
    </div>
  );
}

