import { useEffect, useState } from "react";
import { authApi, getApiErrorMessage, isApiError } from "../api";
import { Btn, Card, Hdr, Inp, SectionLabel, Sel } from "../components/ui";
import { C } from "../constants/theme";
import { formatCellNumber, validateCellNumber } from "../utils/helpers";

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

interface RegisterScreenProps {
  onNav: (screen: string) => void;
  toast?: { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void; warning: (m: string) => void };
}

export function RegisterScreen({ onNav, toast }: RegisterScreenProps) {
  const [formData, setFormData] = useState({
    title: "Ms",
    firstName: "",
    lastName: "",
    prof: "Midwife",
    sanc: "",
    cell: "",
    hospital: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [isLoading, setIsLoading] = useState(false);
  const [cellError, setCellError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (showPopup) {
      const timer = setTimeout(() => setShowPopup(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showPopup]);

  // This checks if all strings are non-empty, cell is valid, and passwords match
  const isFormValid =
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.sanc.trim() !== "" &&
    formData.cell.trim() !== "" &&
    formData.hospital.trim() !== "" &&
    cellError === null &&
    formData.email.trim() !== "" &&
    formData.password.trim() !== "" &&
    formData.password.length >= 8 &&
    formData.password === formData.confirmPassword;

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleChange = (key: keyof typeof formData) => (e: any) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleCellChange = (e: any) => {
    const formatted = formatCellNumber(e.target.value);
    setFormData((prev) => ({ ...prev, cell: formatted }));
    setCellError(validateCellNumber(formatted));
  };

  const handleRegister = async () => {
    // Extra safety gate
    if (!isFormValid) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      console.log("👤 [REGISTER] Attempting registration", { email: formData.email });
      await authApi.register({
        title: formData.title,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        cellNumber: formData.cell,
        hospital: formData.hospital,
        sancNr: formData.sanc,
        role: formData.prof,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      console.log("[REGISTER] Registration successful", { email: formData.email });
      setSuccessMsg("Account created successfully. Redirecting to login...");
      toast?.success("Account created successfully.");
      onNav("splash");
    } catch (error: unknown) {
      console.error("[REGISTER] Registration failed:", error);
      let msg = "Registration failed. Please check your network or details.";

      if (isApiError(error) && error.status >= 400 && error.status < 500) {
        msg = getApiErrorMessage(error, "Registration details are invalid or account already exists.");
      }

      if (error instanceof TypeError) {
        msg = "Connection error: Is the backend server running?";
      }

      setErrorMsg(msg);
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ minHeight: "100dvh", background: C.bgSoft }}>
      <Hdr title="Create Account" onBack={() => onNav("splash")} />
      <div style={{ padding: "20px 20px 48px" }}>
        <Card s={{ marginBottom: 14 }}>
          <SectionLabel>Personal Details</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 10 }}>
            <Sel
              label="Title"
              opts={["Ms", "Mr", "Mrs", "Dr", "Prof"].map(v => ({ v, lb: v }))}
              value={formData.title}
              onChange={handleChange("title")}
            />
            <Inp label="First Name"
              placeholder="Jane"
              value={formData.firstName}
              onChange={handleChange("firstName")} />
          </div>
          <Inp label="Surname"
            placeholder="Dlamini"
            value={formData.lastName}
            onChange={handleChange("lastName")} />
          <Sel
            label="Profession"
            opts={["Midwife", "Doctor", "Midwifery Specialist"].map(v => ({ v, lb: v }))}
            value={formData.prof}
            onChange={handleChange("prof")}
          />
        </Card>
        <Card s={{ marginBottom: 14 }}>
          <SectionLabel>Professional Registration</SectionLabel>
          <Inp
            label="HPCSA / SANC Number"
            placeholder="e.g. 0012345678"
            value={formData.sanc}
            onChange={handleChange("sanc")}
          />
          <Inp
            label="Cell Number"
            type="tel"
            placeholder="+27 82 000 0000"
            value={formData.cell}
            onChange={handleCellChange}
          />
          {cellError && (
            <div style={{ fontSize: 11, color: "#DC2626", marginTop: 6, marginBottom: 8, paddingLeft: 2 }}>
              {cellError}
            </div>
          )}
          <Inp
            label="Hospital"
            placeholder="e.g. Tembisa Hospital"
            value={formData.hospital}
            onChange={handleChange("hospital")}
          />
        </Card>
        <Card>
          <SectionLabel>Account Credentials</SectionLabel>
          <Inp
            label="Email Address"
            type="email"
            placeholder="jane@nhls.gov.za"
            value={formData.email}
            onChange={handleChange("email")}
          />
          <div style={{ position: "relative" }}>
            <Inp
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 characters"
              value={formData.password}
              onChange={handleChange("password")}
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              style={{
                position: "absolute",
                top: "calc(50% + 10px)",
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
              label="Confirm Password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange("confirmPassword")}
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              style={{
                position: "absolute",
                top: "calc(50% + 10px)",
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
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
          {errorMsg && (
            <div
              className="fade-in"
              style={{
                backgroundColor: "rgba(220, 38, 38, 0.12)",
                color: "#b91c1c",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(220, 38, 38, 0.25)",
                fontSize: 13,
                marginBottom: 10,
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
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(22, 163, 74, 0.25)",
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              {successMsg}
            </div>
          )}
          <Btn
            full
            onClick={handleRegister}
            disabled={isLoading || !isFormValid}
            s={{
              marginTop: 8,
              padding: "14px 0",
              borderRadius: 14,
              opacity: (!isFormValid || isLoading) ? 0.5 : 1
            }}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </Btn>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.textMuted }}>
            Already registered?{" "}
            <span
              style={{ color: C.green, fontWeight: 700, cursor: "pointer" }}
              onClick={() => onNav("splash")}
            >
              Sign in
            </span>
          </div>
        </Card>
      </div>
      {showPopup && (
        <div className="popup-notification fade-in">
          <div className="popup-content">
            <span className="material-symbols-outlined" style={{ color: '#ff4d4d' }}>error</span>
            <span>{errorMsg}</span>
            <button className="popup-close" onClick={() => setShowPopup(false)}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}