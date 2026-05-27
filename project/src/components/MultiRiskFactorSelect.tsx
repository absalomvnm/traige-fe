import { useState } from "react";
import { C } from "../constants/theme";
import { RISK_FACTORS } from "../constants/riskFactors";

interface MultiRiskFactorSelectProps {
  selectedKeys?: string[];
  onChange: (keys: string[]) => void;
  placeholder?: string;
  riskFactorsObj?: Record<string, any>;
}

export function MultiRiskFactorSelect({
  selectedKeys = [],
  onChange,
  placeholder: _placeholder = "Select risk factors...",
  riskFactorsObj,
}: MultiRiskFactorSelectProps) {
  selectedKeys = selectedKeys || [];
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const validFactors = RISK_FACTORS.map((rf) => ({ v: rf.k, lb: rf.l }));

  const isCustomKey = (k: string) => k.startsWith("custom:") || k.startsWith("custom_");
  const stripCustom = (k: string) => k.replace(/^custom[:_]/, "");

  const customFromSelected = selectedKeys
    .filter(isCustomKey)
    .map((k) => ({ v: k, lb: stripCustom(k) }));

  let customFromBackend: { v: string; lb: string }[] = [];
  if (typeof riskFactorsObj === "object" && riskFactorsObj) {
    customFromBackend = Object.entries(riskFactorsObj)
      .filter(([k, v]) => (k.startsWith("custom_") || k.startsWith("custom:")) && v && k !== "custom_risk_factor_labels")
      .map(([k, v]) => {
        const label = typeof v === "string" ? v : k.replace(/^custom[:_]/, "").replace(/_/g, " ");
        return { v: `custom:${label}`, lb: label };
      });

    const labels = riskFactorsObj["custom_risk_factor_labels"];
    if (typeof labels === "string" && labels.trim().length > 0) {
      const labelList = labels.split(",").map((s: string) => s.trim()).filter(Boolean);
      for (const label of labelList) {
        if (!customFromBackend.some((e) => e.lb.toLowerCase() === label.toLowerCase())) {
          customFromBackend.push({ v: `custom:${label}`, lb: label });
        }
      }
    }
  }

  const customEntries = [...customFromSelected, ...customFromBackend].filter(
    (entry, idx, arr) => arr.findIndex((e) => e.v === entry.v) === idx
  );

  const allOptions = [...validFactors, ...customEntries];

  const filtered = search.trim()
    ? allOptions.filter((c) => c.lb.toLowerCase().includes(search.toLowerCase()))
    : allOptions;

  const searchTrimmed = search.trim();
  const isNewEntry =
    searchTrimmed.length > 2 &&
    !allOptions.some((c) => c.lb.toLowerCase() === searchTrimmed.toLowerCase());

  const toggleFactor = (value: string) => {
    const newSelected = selectedKeys.includes(value)
      ? selectedKeys.filter((k) => k !== value)
      : [...selectedKeys, value];
    onChange(newSelected);
  };

  const addCustomEntry = () => {
    if (!searchTrimmed) return;
    const key = `custom:${searchTrimmed}`;
    if (!selectedKeys.includes(key)) {
      onChange([...selectedKeys, key]);
    }
    setSearch("");
  };

  const removeFactor = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedKeys.filter((k) => k !== value));
  };

  const getLabel = (key: string) => {
    if (isCustomKey(key)) return stripCustom(key);
    return RISK_FACTORS.find((rf) => rf.k === key)?.l || key;
  };

  return (
    <div style={{ marginBottom: 16, position: "relative" }}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 700, color: C.textMuted,
        marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em",
      }}>
        RISK FACTORS
      </label>

      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%", padding: "12px 15px", border: `1.5px solid ${isOpen ? C.green : C.border}`,
          borderRadius: 12, fontSize: 14,
          color: selectedKeys.length ? C.text : C.textLight,
          background: C.bg, cursor: "pointer", display: "flex",
          justifyContent: "space-between", alignItems: "center",
          boxShadow: isOpen ? `0 0 0 3px ${C.green}15` : "0 1px 3px rgba(0,0,0,.04)",
          transition: "all .15s",
        }}
      >
        <span>
          {selectedKeys.length
            ? `${selectedKeys.length} risk factor${selectedKeys.length > 1 ? "s" : ""} selected`
            : "Select risk factors..."}
        </span>
        <span style={{ fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
      </div>

      {isOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12,
          zIndex: 30, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
          display: "flex", flexDirection: "column",
        }}>
          {/* Search */}
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isNewEntry) addCustomEntry();
                if (e.key === "Escape") setIsOpen(false);
              }}
              placeholder="Search or type a custom risk factor..."
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", padding: "8px 12px",
                border: `1.5px solid ${C.border}`, borderRadius: 8,
                fontSize: 13, color: C.text, background: C.bgSoft,
                outline: "none", fontFamily: "'Outfit', sans-serif",
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.map((opt) => {
              const checked = selectedKeys.includes(opt.v);
              return (
                <div
                  key={opt.v}
                  onClick={() => toggleFactor(opt.v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", cursor: "pointer",
                    background: checked ? C.greenL : "transparent",
                    borderBottom: `1px solid ${C.border}`,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = C.bgSoft; }}
                  onMouseLeave={(e) => { if (!checked) e.currentTarget.style.background = "transparent"; }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      border: `1.5px solid ${checked ? C.green : C.borderMid || C.border}`,
                      background: checked ? C.green : "#fff",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 13, fontWeight: 900, lineHeight: 1,
                      boxShadow: checked ? `0 0 0 3px ${C.green}20` : "0 1px 2px rgba(0,0,0,.04)",
                      transition: "all .15s",
                    }}
                  >
                    {checked ? "✓" : ""}
                  </span>
                  <span style={{ fontSize: 14, color: C.text, fontWeight: checked ? 600 : 500 }}>{opt.lb}</span>
                  {isCustomKey(opt.v) && (
                    <span style={{
                      marginLeft: "auto", fontSize: 10, fontWeight: 700,
                      color: "#EA580C", background: "#FFF7ED",
                      padding: "2px 7px", borderRadius: 99,
                    }}>
                      Custom
                    </span>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && !isNewEntry && (
              <div style={{ padding: "14px", fontSize: 13, color: C.textMuted, textAlign: "center" }}>
                No matching risk factors found
              </div>
            )}

            {isNewEntry && (
              <div
                onClick={addCustomEntry}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px", cursor: "pointer",
                  background: "transparent", borderBottom: `1px solid ${C.border}`,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = C.bgSoft}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  background: C.green, display: "flex", alignItems: "center",
                  justifyContent: "center", color: "white", fontSize: 14, fontWeight: 800,
                }}>
                  +
                </div>
                <span style={{ fontSize: 14, color: C.text }}>
                  Add "{searchTrimmed}"
                </span>
                <span style={{
                  marginLeft: "auto", fontSize: 10, fontWeight: 700,
                  color: C.purple || "#7C3AED", background: C.purpleL || "#F5F3FF",
                  padding: "2px 7px", borderRadius: 99,
                }}>
                  Custom
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "8px 14px", borderTop: `1px solid ${C.border}`,
            fontSize: 11, color: C.textMuted,
          }}>
            {isNewEntry
              ? `Press Enter or tap "Add" to add as custom risk factor`
              : `${selectedKeys.length} selected · Search or type to add a custom risk factor.`}
          </div>
        </div>
      )}

      {/* Selected chips */}
      {selectedKeys.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {selectedKeys.map((key) => (
            <div key={key} style={{
              background: isCustomKey(key) ? C.purpleL || "#F5F3FF" : C.bgDeep,
              borderRadius: 32, padding: "5px 12px", fontSize: 12, fontWeight: 600,
              color: isCustomKey(key) ? C.purple || "#7C3AED" : C.green,
              display: "inline-flex", alignItems: "center", gap: 6,
              border: `1px solid ${isCustomKey(key) ? (C.purpleM || "#7C3AED") + "40" : C.borderMid}`,
            }}>
              {getLabel(key)}
              <button
                onClick={(e) => removeFactor(key, e)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 800, color: C.textMuted,
                  padding: "0 2px", lineHeight: 1,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.p1)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, paddingLeft: 2 }}>
        Search or type to add a custom risk factor. Priority adjusted based on risk factors selected.
      </div>
    </div>
  );
}