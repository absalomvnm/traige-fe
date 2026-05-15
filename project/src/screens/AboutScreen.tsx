import { useState } from "react";
import { C, pC, pGrd } from "../constants/theme";
import { Btn, Tag, Hdr, Card, SectionLabel } from "../components/ui";
import { Logo, Footprints } from "../components/branding";
import { IconShare } from "../components/icons";

interface AboutScreenProps {
  onNav: (screen: string) => void;
}

export function AboutScreen({ onNav }: AboutScreenProps) {
  const [shareFeedback, setShareFeedback] = useState("");

  function flashShareFeedback(message: string) {
    setShareFeedback(message);
    window.setTimeout(() => setShareFeedback(""), 2600);
  }

  async function handleShare() {
    const sharePayload = {
      title: "ObSAtriage",
      text: "ObSAtriage helps midwives standardise obstetric triage using SATS-aligned priority pathways.",
      url: window.location.href,
    };

    try {
      const navAny: any = navigator;
      if (typeof navAny.share === "function") {
        await navAny.share(sharePayload);
        flashShareFeedback("Shared successfully.");
        return;
      }

      const shareText = `${sharePayload.title}\n${sharePayload.text}\n${sharePayload.url}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        flashShareFeedback("Share link copied to clipboard.");
        return;
      }

      const helper = document.createElement("textarea");
      helper.value = shareText;
      helper.setAttribute("readonly", "true");
      helper.style.position = "absolute";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      document.body.removeChild(helper);
      flashShareFeedback("Share details copied.");
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      flashShareFeedback("Unable to share right now. Try again.");
    }
  }

  return (
    <div className="fade-in" style={{ minHeight: "100dvh", background: C.bgSoft, paddingBottom: 80 }}>
      <Hdr title="About ObSAtriage" onBack={() => onNav("welcome")} gradient={C.gradTeal} />
      <div style={{ padding: "14px 14px 28px" }}>
        <Card className="fade-up" s={{ marginBottom: 12, textAlign: "center", padding: "28px 16px" }}>
          <div style={{ margin: "0 auto 10px" }}>
            <Footprints light />
          </div>
          <Logo size={30} />
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, fontWeight: 600 }}>Midwife-Led Obstetric Triage System</div>
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>Version 1.0 · South Africa</div>
        </Card>

        <Card className="fade-up" s={{ marginBottom: 12, animationDelay: ".04s" }}>
          <SectionLabel mb={10}>Purpose</SectionLabel>
          <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.85 }}>
            ObSAtriage is a co-designed, midwife-led digital triage system for South African public maternity units. It standardises emergency obstetric care pathways aligned with national guidelines (SATS 2012, National DoH 2023) to reduce maternal and perinatal mortality.
          </div>
        </Card>

        <Card className="fade-up" s={{ marginBottom: 12, animationDelay: ".10s" }}>
         <SectionLabel mb={10}>Disclaimer</SectionLabel>

         <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.85, marginBottom: 12 }}>
          The assumption behind the developed MTS is that <strong style={{ color: C.text }}>Midwives function as critical thinkers and independent practitioners.</strong> Therefore, they hold immense knowledge of midwifery care and have in-depth knowledge of obstetric emergencies.
         </div>

         <div style={{ background: "#FAFAE8", borderRadius: 10, padding: "12px 14px", marginBottom: 12, borderLeft: "3px solid #D8D365" }}>
         <div style={{ fontSize: 12, color: "#555", lineHeight: 1.75 }}>
          This means that in some instances, the midwives can <strong>disregard the digital triage system</strong> upon their own professional instinct and discretion to save a patient's life in a dire need of emergency obstetric care.
         </div>
         </div>

         <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 10 }}>
          This tool supports — but does not replace — your clinical judgement and professional discretion.
         </div>
       </Card>

       <Card className="fade-up" s={{ marginBottom: 12, animationDelay: ".14s" }}>
        <SectionLabel mb={10}>Clinical Reference</SectionLabel>

          <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.85, marginBottom: 12 }}>
           For guidance on the management of obstetric conditions triaged within this system, kindly refer to the official South African Maternity Guidelines document cited below.
          </div>

        <div style={{
          background: C.bgDeep,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "12px 14px",
          marginBottom: 12,
          }}>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Citation</div>
          <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.75 }}>
            National Department of Health, Republic of South Africa.{" "}
            <em>Maternity Care Guidelines.</em>{" "}
            Pretoria: National DoH; 2023. Aligned with SATS 2012 obstetric triage protocols.
          </div>
        </div>

  <div style={{
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    borderRadius: 12,
    padding: "12px 14px",
    marginBottom: 14,
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
    <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.7 }}>
      The maternity guidelines document is available for reference. Midwives are encouraged to consult it for evidence-based management of all conditions encountered during triage.
    </div>
  </div>

  <Btn
    variant="teal"
    full
    onClick={() => window.open("https://obsatriage.s3.eu-west-1.amazonaws.com/Integrated+Maternal+and+Perinatal+Care+Guideline+HIGHLIGHTED.pdf", "_blank")}
    s={{ padding: "14px 0" }}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
    View Maternity Guidelines (PDF)
  </Btn>
</Card>

        <Card className="fade-up" s={{ marginBottom: 12, animationDelay: ".08s" }}>
          <SectionLabel mb={14}>Priority Coding — SATS 2012</SectionLabel>
          {([[1, "Emergency", "Immediate"], [2, "Very Urgent", "≤ 10 min"], [3, "Urgent", "≤ 30 min"], [4, "Non-Urgent", "≤ 1 hour"]] as const).map(([p, l, t], idx, arr) => {
            const priority = Number(p);
            return (
              <div key={priority} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: idx < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, background: pGrd(priority), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 10px ${pC(priority)}40` }}>
                  <span style={{ color: "white", fontWeight: 900, fontSize: 14 }}>P{priority}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{l}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{t}</div>
                </div>
                <Tag priority={priority} />
              </div>
            );
          })}
        </Card>

        <Card className="fade-up" s={{ animationDelay: ".12s" }}>
          <SectionLabel mb={10}>Share ObSAtriage</SectionLabel>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.7 }}>
            Share this app with colleagues in your maternity unit to standardise triage across all shifts.
          </div>
          <div style={{ background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", fontSize: 12, color: C.textMid, marginBottom: 12, lineHeight: 1.7 }}>
            Preview: recipient gets app name, purpose summary, and a direct launch link.
          </div>
          <Btn variant="teal" full onClick={handleShare} s={{ padding: "14px 0" }}><IconShare size={14} color="white" style={{ marginRight: 6 }} /> Share ObSAtriage</Btn>
          {shareFeedback && <div style={{ marginTop: 10, fontSize: 12, color: C.teal, fontWeight: 700 }}>{shareFeedback}</div>}
        </Card>
      </div>
    </div>
  );
}
