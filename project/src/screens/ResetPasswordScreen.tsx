import { useState } from "react";
import { authApi, getApiErrorMessage, isApiError } from "../api";
import { Btn, Inp } from "../components/ui";
import { C } from "../constants/theme";

const IconEye = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.96 10.96 0 0 1 12 20c-7 0-11-8-11-8a21.35 21.35 0 0 1 5.07-6.56" />
    <path d="M3 3l18 18" />
    <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
    <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
  </svg>
);

interface ResetPasswordScreenProps {
  onNav: (screen: string) => void;
  resetToken?: string;
  toast?: { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void; warning: (m: string) => void };
}

export function ResetPasswordScreen({ onNav, resetToken = "", toast }: ResetPasswordScreenProps) {
  const [formData, setFormData] = useState({
    token: resetToken,
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isFormValid =
    formData.token.trim() !== "" &&
    formData.password.trim() !== "" &&
    formData.password.length >= 8 &&
    formData.password === formData.confirmPassword;

  const handleChange = (key: keyof typeof formData) => (e: any) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
    setErrorMsg(null);
  };

  const handleResetPassword = async () => {
    if (!isFormValid) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      console.log("🔐 [RESET PASSWORD] Attempting password reset");
      await authApi.resetPassword({
        token: formData.token,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      console.log("[RESET PASSWORD] Password reset successful");
      setSuccessMsg("Password has been reset successfully. Redirecting to login...");
      toast?.success("Password reset successful!");

      // Redirect to login after a short delay
      setTimeout(() => {
        onNav("splash");
      }, 2000);
    } catch (error: unknown) {
      console.error("[RESET PASSWORD] Password reset failed:", error);
      let msg = "Failed to reset password. Please try again.";

      if (isApiError(error)) {
        if (error.status === 400) {
          msg = getApiErrorMessage(error, "Invalid or expired reset token. Please request a new password reset.");
        } else {
          msg = getApiErrorMessage(error, "Failed to reset password. Please try again.");
        }
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

  return (
    <div className="fade-in" style={{ minHeight: "100dvh", background: C.gradDark, padding: "26px 24px 20px", position: "relative", overflow: "hidden" }}>
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

      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.35,
            marginBottom: 10,
            letterSpacing: "-.01em",
          }}
        >
          Reset Your Password
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.75 }}>
          Enter your reset token and a new password
        </div>
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ position: "relative" }}>
          <Inp
            type={showPassword ? "text" : "password"}
            placeholder="New Password (min. 8 characters)"
            value={formData.password}
            onChange={handleChange("password")}
            compact
            style={{
              background: "rgba(255,255,255,.96)",
              borderColor: "rgba(255,255,255,.25)",
              paddingRight: 44,
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              position: "absolute",
              top: "50%",
              right: 12,
              transform: "translateY(-50%)",
              border: "none",
              background: "transparent",
              padding: 6,
              cursor: "pointer",
              color: C.textMuted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <IconEyeOff /> : <IconEye />}
          </button>
        </div>

        <div style={{ position: "relative" }}>
          <Inp
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange("confirmPassword")}
            compact
            style={{
              background: "rgba(255,255,255,.96)",
              borderColor: "rgba(255,255,255,.25)",
              paddingRight: 44,
            }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            style={{
              position: "absolute",
              top: "50%",
              right: 12,
              transform: "translateY(-50%)",
              border: "none",
              background: "transparent",
              padding: 6,
              cursor: "pointer",
              color: C.textMuted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
          </button>
        </div>

        {errorMsg && (
          <div
            className="fade-in"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              fontSize: "0.85rem",
              marginBottom: "8px",
              marginTop: "4px",
              textAlign: "center",
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
              backgroundColor: "rgba(34, 197, 94, 0.15)",
              color: "#16a34a",
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              fontSize: "0.85rem",
              marginBottom: "8px",
              marginTop: "4px",
              textAlign: "center",
            }}
          >
            {successMsg}
          </div>
        )}

        <Btn
          full
          onClick={handleResetPassword}
          disabled={!isFormValid || isLoading}
          s={{
            padding: "15px 0",
            fontSize: 16,
            borderRadius: 14,
            letterSpacing: ".01em",
            marginTop: 8,
            opacity: (!isFormValid || isLoading) ? 0.5 : 1,
          }}
        >
          {isLoading ? "Resetting..." : "Reset Password"}
        </Btn>
      </div>

      <div
        style={{
          marginTop: 28,
          fontSize: 11,
          color: "rgba(255,255,255,.28)",
          letterSpacing: "0.05em",
          textAlign: "center",
        }}
      >
        Department of Health · Republic of South Africa
      </div>
    </div>
  );
}

