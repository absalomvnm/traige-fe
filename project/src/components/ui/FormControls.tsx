import { useState, useRef, useEffect } from "react";
import { C, pC, pBg } from "../../constants/theme";
import { IconSiren, IconBolt, IconWarning } from "../icons";

export function Inp({ label, hint, alert, compact, ...p }: any) {
  return (
    <div style={{ marginBottom: compact ? 8 : 16 }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 700,
            color: C.textMuted,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </label>
      )}
      <input
        {...p}
        style={{
          width: "100%",
          padding: "12px 15px",
          border: `1.5px solid ${alert ? pC(alert.priority) : C.border}`,
          borderRadius: 12,
          fontSize: 14,
          color: C.text,
          background: C.bg,
          transition: "all .15s",
          boxShadow: alert
            ? `0 0 0 3px ${pC(alert.priority)}20`
            : "0 1px 3px rgba(0,0,0,.04)",
          ...p.style,
        }}
      />
      {alert && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 6,
            padding: "5px 10px",
            borderRadius: 999,
            background: pBg(alert.priority),
            border: `1px solid ${pC(alert.priority)}40`,
            fontSize: 11,
            fontWeight: 700,
            color: pC(alert.priority),
          }}
        >
          <span>
            {alert.priority === 1 ? <IconSiren size={12} /> : alert.priority === 2 ? <IconBolt size={12} /> : <IconWarning size={12} />}
          </span>
          <span>{alert.text}</span>
        </div>
      )}
      {hint && (
        <div
          style={{ fontSize: 11, color: C.textMuted, marginTop: 4, paddingLeft: 2 }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

export function Sel({ label, opts, ...p }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 700,
            color: C.textMuted,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </label>
      )}
      <select
        {...p}
        style={{
          width: "100%",
          padding: "12px 15px",
          border: `1.5px solid ${C.border}`,
          borderRadius: 12,
          fontSize: 14,
          color: C.text,
          background: C.bg,
          cursor: "pointer",
          boxShadow: "0 1px 3px rgba(0,0,0,.04)",
          ...p.style,
        }}
      >
        {opts.map((o: any) => (
          <option key={o.v || o.value} value={o.v || o.value}>
            {o.lb || o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ComboSel({ label, opts, value, onChange }: { label?: string; opts: { v: string; lb: string }[]; value: string; onChange: (e: { target: { value: string } }) => void }) {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const matchedLabel = opts.find((o) => o.v === value)?.lb;
  const filtered = opts.filter((o) => o.lb.toLowerCase().includes((value || "").toLowerCase()) || o.v.includes(value || ""));

  return (
    <div style={{ marginBottom: 16, position: "relative" }} ref={ref}>
      {label && (
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={typing ? value : (matchedLabel || value)}
          onChange={(e) => { setTyping(true); setOpen(true); onChange({ target: { value: e.target.value } }); }}
          onFocus={() => { setOpen(true); setTyping(true); }}
          onBlur={() => setTimeout(() => setTyping(false), 200)}
          placeholder="Type or select…"
          style={{
            width: "100%", padding: "12px 36px 12px 15px", border: `1.5px solid ${open ? C.teal : C.border}`, borderRadius: 12,
            fontSize: 14, color: C.text, background: C.bg, transition: "all .15s",
            boxShadow: open ? `0 0 0 3px ${C.teal}20` : "0 1px 3px rgba(0,0,0,.04)",
          }}
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", padding: 4, color: C.textMuted, fontSize: 12, lineHeight: 1 }}
        >
          ▾
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, marginTop: 4,
          background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
          maxHeight: 180, overflowY: "auto",
        }}>
          {filtered.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => { onChange({ target: { value: o.v } }); setOpen(false); setTyping(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "10px 15px", border: "none", cursor: "pointer",
                fontSize: 14, color: o.v === value ? C.teal : C.text, fontWeight: o.v === value ? 700 : 500,
                background: o.v === value ? `${C.teal}10` : "transparent", transition: "background .1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = `${C.teal}10`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = o.v === value ? `${C.teal}10` : "transparent")}
            >
              {o.lb}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Txt({ label, hint, rows = 4, ...p }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 700,
            color: C.textMuted,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </label>
      )}
      <textarea
        {...p}
        rows={rows}
        style={{
          width: "100%",
          padding: "12px 15px",
          border: `1.5px solid ${C.border}`,
          borderRadius: 12,
          fontSize: 14,
          color: C.text,
          background: C.bg,
          resize: "vertical",
          transition: "all .15s",
          boxShadow: "0 1px 3px rgba(0,0,0,.04)",
          lineHeight: 1.7,
          ...p.style,
        }}
      />
      {hint && (
        <div
          style={{ fontSize: 11, color: C.textMuted, marginTop: 4, paddingLeft: 2 }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
