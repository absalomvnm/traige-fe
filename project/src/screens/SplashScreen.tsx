import { useState, type ChangeEvent } from "react";
import { authApi, getApiErrorMessage, isApiError, type LoginResponse } from "../api";
import { Footprints, Logo, Woman } from "../components/branding";
import { Btn, Inp } from "../components/ui";
import { C } from "../constants/theme";

interface SplashScreenProps {
  onNav: (screen: string) => void;
  onAuthSuccess: (response: LoginResponse) => void;
}

export function SplashScreen({ onNav, onAuthSuccess }: SplashScreenProps) {

  const [formData, setFormData] = useState({ username: "", pw: "" });
  const [isLoading, setIsLoading] = useState(false);

  // Enable button only if both fields have content
  const isFormValid = formData.username.trim() !== "" && formData.pw.trim() !== "";
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  const handleInputChange = (key: keyof typeof formData) => (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleLogin = async () => {
    if (!isFormValid) return;

    console.log("👤 [LOGIN] Attempting login", { email: formData.username });
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const loginResponse = await authApi.login({
        email: formData.username,
        password: formData.pw
      });

      console.log("[LOGIN] Login successful, received token");
      // Navigation to 'welcome' is handled inside onAuthSuccess to avoid
      // a stale-closure race where isAuthenticated is still false.
      onAuthSuccess(loginResponse);
    } catch (error: unknown) {
      console.error("[LOGIN] Login failed:", error);

      if (isApiError(error)) {
        console.error(`   [API ERROR] Status ${error.status}:`, error.body);
        if (error.status === 401) {
          setErrorMsg("Invalid email or password. Please try again.");
          return;
        }

        setErrorMsg(getApiErrorMessage(error, "Authentication failed. Please try again."));
        return;
      }

      if (error instanceof TypeError) {
        console.error("   [NETWORK ERROR] Backend unreachable");
        setErrorMsg("Connection error: Is the backend server running?");
        return;
      }

      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fade-in"
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
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: -40,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "rgba(220,38,38,.07)",
          pointerEvents: "none",
        }}
      />

      <div className="fade-up" style={{ marginBottom: 2 }}>
        <Footprints light animated />
      </div>
      <div className="fade-up" style={{ animationDelay: ".08s", marginBottom: 2 }}>
        <Logo size={42} white />
      </div>
      <div
        className="fade-up"
        style={{
          animationDelay: ".12s",
          fontSize: 11,
          color: "rgba(255,255,255,.45)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom: 20,
          fontWeight: 600,
        }}
      >
        Saves Lives
      </div>

      <div
        className="fade-up"
        style={{
          animationDelay: ".16s",
          marginBottom: 18,
          filter: "drop-shadow(0 12px 32px rgba(124,58,237,.35))",
        }}
      >
        <Woman />
      </div>

      <div
        className="fade-up"
        style={{ animationDelay: ".2s", textAlign: "center", maxWidth: 290, marginBottom: 28 }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.35,
            marginBottom: 10,
            letterSpacing: "-.01em",
          }}
        >
          Midwife-led Obstetric Triage
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.75 }}>
          Co-designed for South African public maternity units · SATS 2012 &amp; National DoH 2023
        </div>
      </div>

      <div
        className="fade-up"
        style={{
          animationDelay: ".24s",
          width: "100%",
          maxWidth: 320,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <Inp
          placeholder="Username"
          value={formData.username}
          onChange={handleInputChange("username")}
          compact
          style={{ background: "rgba(255,255,255,.96)", borderColor: "rgba(255,255,255,.25)" }}
        />
        <Inp
          type="password"
          placeholder="Password"
          value={formData.pw}
          onChange={handleInputChange("pw")}
          compact
          style={{ background: "rgba(255,255,255,.96)", borderColor: "rgba(255,255,255,.25)" }}
        />
        {/* The Notification UI */}
        {errorMsg && (
          <div className="fade-in" style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)', // Soft Red background
            color: '#ef4444',                         // Bright Red text
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '0.85rem',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            {errorMsg}
          </div>
        )}
        <Btn
          full
          onClick={handleLogin}
          disabled={!isFormValid || isLoading}
          s={{ padding: "15px 0", fontSize: 16, borderRadius: 14, letterSpacing: ".01em", marginTop: 4 }}
        >
          {isLoading ? "Authenticating..." : "Log In"}
        </Btn>
        <Btn
          full
          variant="outline"
          onClick={() => onNav("register")}
          s={{
            padding: "14px 0",
            fontSize: 15,
            borderRadius: 14,
            borderColor: "rgba(255,255,255,.25)",
            color: "rgba(255,255,255,.85)",
          }}
        >
          Register
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
