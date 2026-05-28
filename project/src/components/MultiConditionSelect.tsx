import { useState } from "react";
import { CONDITIONS } from "../constants/conditions";
import { C } from "../constants/theme";

interface MultiConditionSelectProps {
  selectedKeys?: string[];
  onChange: (keys: string[]) => void;
  placeholder?: string;
  signsSymptomsObj?: Record<string, any>; // Optional backend data
}

export function MultiConditionSelect({
  selectedKeys = [],
  onChange,
  placeholder: _placeholder = "Select presenting conditions...",
  signsSymptomsObj,
}: MultiConditionSelectProps) {
  selectedKeys = selectedKeys || [];
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const validConditions = CONDITIONS.filter((c) => c.v !== "" && c.v !== "other");

  const isCustomKey = (k: string) => k.startsWith("custom:") || k.startsWith("custom_");
  const stripCustom = (k: string) => k.replace(/^custom[:_]/, "");

  // Gather custom entries from selectedKeys
  const customFromSelected = selectedKeys
    .filter(isCustomKey)
    .map((k) => ({ v: k, lb: stripCustom(k) }));

  // Gather custom entries from backend (signsSymptomsObj)
  let customFromBackend: { v: string; lb: string }[] = [];
  if (typeof signsSymptomsObj === "object" && signsSymptomsObj) {
    // 1. Boolean custom keys
    customFromBackend = Object.entries(signsSymptomsObj)
      .filter(([k, v]) => (k.startsWith("custom_") || k.startsWith("custom:")) && v && k !== "custom_symptom_labels")
      .map(([k, v]) => {
        // If value is a string, use it as label, else use key
        const label = typeof v === "string" ? v : k.replace(/^custom[:_]/, "").replace(/_/g, " ");
        return { v: `custom:${label}`, lb: label };
      });

    // 2. Labels field (comma-separated)
    const labels = signsSymptomsObj["custom_symptom_labels"];
    if (typeof labels === "string" && labels.trim().length > 0) {
      const labelList = labels.split(",").map(s => s.trim()).filter(Boolean);
      for (const label of labelList) {
        // Only add if not already present
        console.log("[MultiConditionSelect] Processing backend label:", label);
        if (!customFromBackend.some(e => e.lb.toLowerCase() === label.toLowerCase())) {
          customFromBackend.push({ v: `custom:${label}`, lb: label });
        }
      }
    }
  }

  // Merge and dedupe custom entries
  const customEntries = [...customFromSelected, ...customFromBackend].filter(
    (entry, idx, arr) => arr.findIndex(e => e.v === entry.v) === idx
  );

  // All options including custom ones already added
  const allOptions = [...validConditions, ...customEntries];

  // Filter by search
  const filtered = search.trim()
    ? allOptions.filter((c) =>
        c.lb.toLowerCase().includes(search.toLowerCase())
      )
    : allOptions;

  // Check if search term is new (not in list)
  const searchTrimmed = search.trim();
  const isNewEntry =
    searchTrimmed.length > 2 &&
    !allOptions.some(
      (c) => c.lb.toLowerCase() === searchTrimmed.toLowerCase()
    );

  // Toggle selection
  const toggleCondition = (value: string) => {
    const newSelected = selectedKeys.includes(value)
      ? selectedKeys.filter((k) => k !== value)
      : [...selectedKeys, value];
    onChange(newSelected);
  };

  // Add custom entry
  const addCustomEntry = () => {
    if (!searchTrimmed) return;
    const key = `custom:${searchTrimmed}`;
    if (!selectedKeys.includes(key)) {
      onChange([...selectedKeys, key]);
    }
    setSearch("");
  };

  // Remove condition
  const removeCondition = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedKeys.filter((k) => k !== value));
  };

  // Get label for display
  const getLabel = (key: string) => {
    if (isCustomKey(key)) return stripCustom(key);
    return CONDITIONS.find((c) => c.v === key)?.lb || key;
  };

  return (
    <div style={{ marginBottom: 16, position: "relative" }}>
      <label style={{
        display: "block", fontSize: 14, fontWeight: 700, color: C.textMuted,
        marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em",
      }}>
        SIGNS & SYMPTOMS
      </label>

      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%", padding: "12px 15px", border: `1.5px solid ${isOpen ? C.green : C.border}`,
          borderRadius: 12, fontSize: 17,
          color: selectedKeys.length ? C.text : C.textLight,
          background: C.bg, cursor: "pointer", display: "flex",
          justifyContent: "space-between", alignItems: "center",
          boxShadow: isOpen ? `0 0 0 3px ${C.green}15` : "0 1px 3px rgba(0,0,0,.04)",
          transition: "all .15s",
        }}
      >
        <span>
          {selectedKeys.length
            ? `${selectedKeys.length} sign(s) and symptom(s) selected`
            : "Select observed signs and symptoms..."}
        </span>
        <span style={{ fontSize: 15 }}>{isOpen ? "▲" : "▼"}</span>
      </div>

      {isOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12,
          zIndex: 30, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
          display: "flex", flexDirection: "column",
        }}>
          {/* Search / type input */}
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
              placeholder="Search or type a custom symptom..."
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", padding: "8px 12px",
                border: `1.5px solid ${C.border}`, borderRadius: 8,
                fontSize: 16, color: C.text, background: C.bgSoft,
                outline: "none", fontFamily: "'Outfit', sans-serif",
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.map((cond) => {
              const checked = selectedKeys.includes(cond.v);
              return (
                <div
                  key={cond.v}
                  onClick={() => toggleCondition(cond.v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", cursor: "pointer",
                    background: checked ? C.greenL : "transparent",
                    borderBottom: `1px solid ${C.border}`,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!checked) e.currentTarget.style.background = C.bgSoft;
                  }}
                  onMouseLeave={(e) => {
                    if (!checked) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      border: `1.5px solid ${checked ? C.green : C.borderMid || C.border}`,
                      background: checked ? C.green : "#fff",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 16, fontWeight: 900, lineHeight: 1,
                      boxShadow: checked ? `0 0 0 3px ${C.green}20` : "0 1px 2px rgba(0,0,0,.04)",
                      transition: "all .15s",
                    }}
                  >
                    {checked ? "✓" : ""}
                  </span>
                  <span style={{ fontSize: 17, color: C.text, fontWeight: checked ? 600 : 500 }}>{cond.lb}</span>
                  {/* Badge for custom entries */}
                  {isCustomKey(cond.v) && (
                    <span style={{
                      marginLeft: "auto", fontSize: 13, fontWeight: 700,
                      color: "#EA580C", background: "#FFF7ED",
                      padding: "2px 7px", borderRadius: 99,
                    }}>
                      Custom
                    </span>
                  )}
                </div>
              );
            })}

            {/* No results */}
            {filtered.length === 0 && !isNewEntry && (
              <div style={{ padding: "14px", fontSize: 16, color: C.textMuted, textAlign: "center" }}>
                No matching conditions found
              </div>
            )}

            {/* Add custom entry */}
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
                  justifyContent: "center", color: "white", fontSize: 17, fontWeight: 800,
                }}>
                  +
                </div>
                <span style={{ fontSize: 17, color: C.text }}>
                  Add "{searchTrimmed}"
                </span>
                <span style={{
                  marginLeft: "auto", fontSize: 13, fontWeight: 700,
                  color: C.purple || "#7C3AED", background: C.purpleL || "#F5F3FF",
                  padding: "2px 7px", borderRadius: 99,
                }}>
                  Custom
                </span>
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div style={{
            padding: "8px 14px", borderTop: `1px solid ${C.border}`,
            fontSize: 14, color: C.textMuted,
          }}>
            {isNewEntry
              ? `Press Enter or tap "Add" to add as custom symptom`
              : `${selectedKeys.length} selected · Search or type to add a custom symptom. Priority based on most urgent sign or symptom selected.`}
          </div>
        </div>
      )}

      {/* Selected chips */}
      {selectedKeys.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {selectedKeys.map((key) => (
            <div key={key} style={{
              background: isCustomKey(key) ? C.purpleL || "#F5F3FF" : C.bgDeep,
              borderRadius: 32, padding: "5px 12px", fontSize: 15, fontWeight: 600,
              color: isCustomKey(key) ? C.purple || "#7C3AED" : C.green,
              display: "inline-flex", alignItems: "center", gap: 6,
              border: `1px solid ${isCustomKey(key) ? (C.purpleM || "#7C3AED") + "40" : C.borderMid}`,
            }}>
              {getLabel(key)}
              <button
                onClick={(e) => removeCondition(key, e)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 17, fontWeight: 800, color: C.textMuted,
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

      <div style={{ fontSize: 14, color: C.textMuted, marginTop: 4, paddingLeft: 2 }}>
        Search or type to add a custom symptom. Priority based on most urgent signs and symptoms selected.
      </div>
    </div>
  );
}