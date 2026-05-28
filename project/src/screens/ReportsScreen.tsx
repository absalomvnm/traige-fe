import { useState } from "react";
import { Hdr } from "../components/ui";
import { C } from "../constants/theme";
import { resolveConditionName } from "../services/catalogService";

interface ReportsScreenProps {
  onNav: (screen: string) => void;
  patients: any[];
}

type ReportType = "summary" | "priority" | "patient" | "shift";

export function ReportsScreen({ onNav, patients }: ReportsScreenProps) {
  const [selected, setSelected] = useState<ReportType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Derived stats
  const total = patients.length;
  const p1 = patients.filter((p) => (p.latestAssessment?.finalPriorityId || p.p) === 1).length;
  const p2 = patients.filter((p) => (p.latestAssessment?.finalPriorityId || p.p) === 2).length;
  const p3 = patients.filter((p) => (p.latestAssessment?.finalPriorityId || p.p) === 3).length;
  const p4 = patients.filter((p) => (p.latestAssessment?.finalPriorityId || p.p) === 4).length;
  const pending = patients.filter((p) => /Pending|Awaiting/i.test(p.status ?? "")).length;
  const today = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Reports
  const reports: {
    type: ReportType;
    title: string;
    sub: string;
    icon: string;
    gradient: string;
    stats: { l: string; v: string | number }[];
  }[] = [
    {
      type: "summary",
      title: "Daily Summary Report",
      sub: "Overview of all triage activity for today",
      icon: "📋",
      gradient: C.gradGreen,
      stats: [
        { l: "Total Triaged", v: total },
        { l: "Pending Review", v: pending },
        { l: "P1 Emergencies", v: p1 },
        { l: "Date", v: new Date().toLocaleDateString("en-ZA") },
      ],
    },
    {
      type: "priority",
      title: "Priority Distribution Report",
      sub: "Breakdown of patients by triage priority",
      icon: "📊",
      gradient: C.gradTeal,
      stats: [
        { l: "P1 Emergency", v: p1 },
        { l: "P2 Very Urgent", v: p2 },
        { l: "P3 Urgent", v: p3 },
        { l: "P4 Non-Urgent", v: p4 },
      ],
    },
    {
      type: "patient",
      title: "Full Patient Triage Report",
      sub: "Detailed record of every patient triaged today",
      icon: "👩‍⚕️",
      gradient: C.gradPurple,
      stats: [
        { l: "Total Records", v: total },
        { l: "With Vitals", v: patients.filter((p) => p.vitals).length },
        { l: "Completed", v: patients.filter((p) => p.status === "Completed").length },
        { l: "Active", v: patients.filter((p) => p.status !== "Completed").length },
      ],
    },
    {
      type: "shift",
      title: "Shift Handover Report",
      sub: "Concise handover summary for incoming shift",
      icon: "🔄",
      gradient: "linear-gradient(135deg,#D8D365,#A8A350)",
      stats: [
        { l: "Pending Handover", v: pending },
        { l: "P1 Active", v: p1 },
        { l: "Total Seen", v: total },
        { l: "Shift Date", v: new Date().toLocaleDateString("en-ZA") },
      ],
    },
  ];

  // ─────────────────────────────────────────────
  // Generate Preview
  // ─────────────────────────────────────────────
  function generatePDF(type: ReportType) {
    setGenerating(true);
    setDone(false);

    const r = reports.find((x) => x.type === type)!;

    const priorityRows = patients
      .map(
        (p, i) => `
        <tr style="background:${i % 2 === 0 ? "#f9fafb" : "#ffffff"
          }">
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">
            ${p.surname ?? ""}, ${p.name ?? ""}
          </td>

          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">
            <span style="
              background:${p.p === 1
            ? "#dc2626"
            : p.p === 2
              ? "#D8D365"
              : p.p === 3
                ? "#C8C480"
                : "#16a34a"
          };
              color:white;
              padding:2px 10px;
              border-radius:99px;
              font-size:11px;
              font-weight:700;
            ">
              P${p.p}
            </span>
          </td>

          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">
            ${resolveConditionName(p) || p.cond || "—"}
          </td>

          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">
            ${p.status ?? "—"}
          </td>
        </tr>
      `
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${r.title}</title>

<style>
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

body{
  font-family:Segoe UI, Arial, 'DM Sans';
  color:#111;
  background:#fff;
  padding:40px;
}

.header{
  border-bottom:3px solid #1E7B47;
  padding-bottom:20px;
  margin-bottom:28px;
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
}

.logo{
  font-size:22px;
  font-weight:900;
  color:#1E7B47;
}

.logo span{
  color:#0D6B3B;
}

.meta{
  font-size:11px;
  color:#666;
  text-align:right;
  line-height:1.7;
}

h1{
  font-size:20px;
  margin-bottom:4px;
}

.sub{
  font-size:13px;
  color:#666;
  margin-bottom:28px;
}

.stats-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:12px;
  margin-bottom:28px;
}

.stat{
  background:#f3f4f6;
  border-radius:10px;
  padding:14px;
}

.stat-val{
  font-size:26px;
  font-weight:900;
  color:#1E7B47;
}

.stat-label{
  font-size:11px;
  color:#666;
  margin-top:4px;
}

table{
  width:100%;
  border-collapse:collapse;
  font-size:13px;
}

thead tr{
  background:#1E7B47;
}

thead td{
  color:white;
  padding:10px 12px;
  font-weight:700;
}

.footer{
  margin-top:40px;
  padding-top:16px;
  border-top:1px solid #e5e7eb;
  font-size:11px;
  color:#999;
  display:flex;
  justify-content:space-between;
}

.disclaimer{
  background:#FAFAE8;
  border-left:3px solid #D8D365;
  padding:12px 16px;
  border-radius:0 8px 8px 0;
  margin-top:28px;
  font-size:12px;
  color:#555;
}

@media print{
  body{
    padding:20px;
  }
}
</style>
</head>

<body>

<div class="header">
  <div>
    <div class="logo">ObS<span>A</span>triage</div>
    <div style="font-size:11px;color:#666;margin-top:4px">
      Midwife-Led Obstetric Triage System
    </div>
  </div>

  <div class="meta">
    <div><strong>Report:</strong> ${r.title}</div>
    <div><strong>Generated:</strong> ${today}</div>
    <div><strong>Unit:</strong> KZN Maternity Unit</div>
    <div><strong>Clinician:</strong> Sister Jane Dlamini</div>
  </div>
</div>

<h1>${r.title}</h1>
<div class="sub">${r.sub}</div>

<div class="stats-grid">
${r.stats
        .map(
          (s) => `
<div class="stat">
<div class="stat-val">${s.v}</div>
<div class="stat-label">${s.l}</div>
</div>
`
        )
        .join("")}
</div>

${patients.length > 0
        ? `
<table>
<thead>
<tr>
<td>Patient Name</td>
<td style="text-align:center">Priority</td>
<td>Condition</td>
<td>Status</td>
</tr>
</thead>
<tbody>
${priorityRows}
</tbody>
</table>
`
        : `
<div style="padding:40px;text-align:center;color:#999">
No patient records found.
</div>
`
      }

<div class="disclaimer">
<strong>Disclaimer:</strong>
This report is generated by ObSAtriage.
All triage decisions remain responsibility of attending clinician.
</div>

<div class="footer">
<span>ObSAtriage v1.0</span>
<span>CONFIDENTIAL</span>
</div>

</body>
</html>
`;

    setTimeout(() => {
      setPreviewHtml(html);
      setShowPreview(true);
      setGenerating(false);
      setDone(true);

      setTimeout(() => setDone(false), 3000);
    }, 700);
  }

  const sel = reports.find((r) => r.type === selected);
  const priorityBreakdown = [
    { label: "P1", count: p1, color: C.p1, full: "Emergency" },
    { label: "P2", count: p2, color: C.p2, full: "Very Urgent" },
    { label: "P3", count: p3, color: C.p3, full: "Urgent" },
    { label: "P4", count: p4, color: C.p4, full: "Non-Urgent" },
  ];
  const maxCount = Math.max(1, ...priorityBreakdown.map((b) => b.count));

  return (
    <div
      className="fade-in"
      style={{
        minHeight: "100dvh",
        background: C.bgSoft,
        paddingBottom: 80,
      }}
    >
      <Hdr
        title="Reports"
        onBack={() => onNav("welcome")}
        gradient={C.gradPurple}
      />

      <div style={{ padding: "14px 14px 28px" }}>
        {/* HERO — modernized today's activity */}
        <div
          className="fade-up"
          style={{
            position: "relative",
            background: C.gradPurple,
            borderRadius: 20,
            padding: "20px 18px",
            marginBottom: 14,
            overflow: "hidden",
            boxShadow: "0 12px 30px rgba(124,58,237,.25)",
          }}
        >
          <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, left: -20, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.06)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,.75)", letterSpacing: ".14em", textTransform: "uppercase" }}>
              Today's Activity
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
              <div style={{ fontSize: 47, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-.02em" }}>{total}</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,.85)" }}>patients triaged</div>
            </div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,.75)", marginTop: 6, fontWeight: 500 }}>{today}</div>

            {/* Mini priority bars */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 16 }}>
              {priorityBreakdown.map((b) => (
                <div key={b.label} style={{ background: "rgba(255,255,255,.12)", backdropFilter: "blur(8px)", borderRadius: 10, padding: "8px 6px", border: "1px solid rgba(255,255,255,.18)" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.7)", letterSpacing: ".08em" }}>{b.label}</div>
                  <div style={{ fontSize: 21, fontWeight: 900, color: "white", lineHeight: 1.1, marginTop: 2 }}>{b.count}</div>
                  <div style={{ height: 3, background: "rgba(255,255,255,.18)", borderRadius: 2, marginTop: 5, overflow: "hidden" }}>
                    <div style={{ width: `${(b.count / maxCount) * 100}%`, height: "100%", background: b.color, borderRadius: 2, transition: "width .4s" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 2px" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.textMuted, letterSpacing: ".12em", textTransform: "uppercase" }}>
            Choose Report Type
          </div>
          <div style={{ fontSize: 13, color: C.textLight, fontWeight: 600 }}>{reports.length} templates</div>
        </div>

        {/* Modern report cards */}
        <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
          {reports.map((r) => {
            const active = selected === r.type;
            return (
              <div
                key={r.type}
                onClick={() => {
                  setSelected(r.type);
                  setDone(false);
                }}
                className="btn-press"
                style={{
                  position: "relative",
                  background: C.bg,
                  borderRadius: 16,
                  padding: "14px 14px",
                  cursor: "pointer",
                  border: active ? `2px solid transparent` : `1px solid ${C.border}`,
                  backgroundImage: active
                    ? `linear-gradient(${C.bg}, ${C.bg}), ${r.gradient}`
                    : undefined,
                  backgroundOrigin: active ? "border-box" : undefined,
                  backgroundClip: active ? "padding-box, border-box" : undefined,
                  boxShadow: active ? "0 8px 22px rgba(0,0,0,.10)" : "0 1px 3px rgba(0,0,0,.04)",
                  transition: "all .2s",
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: r.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 25,
                      flexShrink: 0,
                      boxShadow: active ? "0 6px 14px rgba(0,0,0,.18)" : "0 3px 8px rgba(0,0,0,.10)",
                    }}
                  >
                    {r.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 17, color: C.text, letterSpacing: "-.005em" }}>{r.title}</div>
                    <div style={{ fontSize: 15, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>{r.sub}</div>
                  </div>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: `2px solid ${active ? "transparent" : C.border}`,
                      background: active ? r.gradient : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all .2s",
                    }}
                  >
                    {active && <span style={{ color: "white", fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                  </div>
                </div>
                {active && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${C.border}` }}>
                    {r.stats.map((s, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 19, fontWeight: 900, color: C.text, lineHeight: 1 }}>{s.v}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginTop: 3, letterSpacing: ".04em", textTransform: "uppercase" }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Generate Button */}
        {selected && (
          <div className="fade-up" style={{ marginTop: 10, position: "sticky", bottom: 16, zIndex: 5 }}>
            <button
              type="button"
              className="btn-press"
              onClick={() => generatePDF(selected)}
              disabled={generating}
              style={{
                width: "100%",
                padding: "16px 18px",
                borderRadius: 16,
                border: "none",
                background: done ? C.gradGreen : (sel?.gradient ?? C.gradPurple),
                color: "white",
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: ".02em",
                cursor: generating ? "wait" : "pointer",
                boxShadow: "0 12px 28px rgba(0,0,0,.18)",
                opacity: generating ? 0.75 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {generating ? (
                <>
                  <span className="ctg-spin" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "white", borderRadius: "50%", display: "inline-block" }} />
                  Generating preview…
                </>
              ) : done ? (
                <>✓ Preview Ready</>
              ) : (
                <>Generate {sel?.title}</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {showPreview && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.85)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Modern header */}
          <div
            style={{
              background: "linear-gradient(135deg,#ffffff,#f8fafc)",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              borderBottom: `1px solid ${C.border}`,
              boxShadow: "0 2px 8px rgba(0,0,0,.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: sel?.gradient ?? C.gradPurple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, color: "white" }}>
                {sel?.icon}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>Report Preview</div>
                <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", marginTop: 2 }}>{sel?.title}</div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <button
                className="btn-press"
                onClick={() => {
                  const win = window.open("", "_blank");
                  if (win) {
                    win.document.write(previewHtml);
                    win.document.close();
                    win.print();
                  }
                }}
                style={{
                  border: "none",
                  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 15,
                  boxShadow: "0 4px 10px rgba(37,99,235,.25)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                🖨 <span>Print</span>
              </button>

              <button
                className="btn-press"
                onClick={() => {
                  const blob = new Blob([previewHtml], {
                    type: "text/html",
                  });

                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = "report.html";
                  link.click();
                }}
                style={{
                  border: "none",
                  background: "linear-gradient(135deg,#16a34a,#15803d)",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 15,
                  boxShadow: "0 4px 10px rgba(22,163,74,.25)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ⬇ <span>Download</span>
              </button>

              <button
                className="btn-press"
                onClick={() => setShowPreview(false)}
                style={{
                  border: `1px solid ${C.border}`,
                  background: "#fff",
                  color: C.textMid,
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 15,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Preview */}
          <iframe
            title="preview"
            srcDoc={previewHtml}
            style={{
              flex: 1,
              border: "none",
              background: "#fff",
            }}
          />
        </div>
      )}
    </div>
  );
}