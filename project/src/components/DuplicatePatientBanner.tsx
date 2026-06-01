import { useEffect, useRef, useState } from "react";
import { patientService } from "../services/Patientservice";
import type { PatientListItem } from "../services/Patientservice";
import { C } from "../constants/theme";

/**
 * A possible-duplicate patient match surfaced to the operator while they type
 * demographics. We compute a lightweight confidence score from the fields that
 * overlap (ID number is the strongest signal, then name + surname).
 */
export interface DuplicateMatch {
  id: number;
  patientFileId: number;
  name: string;
  surname: string;
  idNumber?: string;
  /** 0–100 confidence the typed details refer to this existing patient. */
  score: number;
  /** Which fields matched — used to explain *why* we flagged it. */
  reasons: string[];
  raw: PatientListItem;
}

interface DuplicatePatientBannerProps {
  /** Live demographics being typed in Step 1. */
  name?: string;
  surname?: string;
  idNumber?: string;
  /** When the operator confirms "this is the same patient". */
  onUseExisting: (match: DuplicateMatch) => void;
  /** If the current form is already bound to an existing patient, suppress matching. */
  boundPatientId?: number | string;
}

const norm = (v?: string) => (v ?? "").trim().toLowerCase();

/** Score how likely the typed details match an existing patient (0–100). */
function scoreMatch(
  typed: { name?: string; surname?: string; idNumber?: string },
  candidate: PatientListItem & { id_number?: string; idNumber?: string },
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const tName = norm(typed.name);
  const tSurname = norm(typed.surname);
  const tId = norm(typed.idNumber);

  const cName = norm(candidate.name);
  const cSurname = norm(candidate.surname);
  const cId = norm((candidate as any).id_number ?? (candidate as any).idNumber);

  // ID number is the strongest identifier in SA clinical context.
  if (tId && cId) {
    if (tId === cId) {
      score += 70;
      reasons.push("ID number matches exactly");
    } else if (tId.length >= 6 && cId.startsWith(tId)) {
      score += 35;
      reasons.push("ID number prefix matches");
    }
  }

  // Surname is a strong secondary signal.
  if (tSurname && cSurname) {
    if (tSurname === cSurname) {
      score += 20;
      reasons.push("Surname matches");
    } else if (cSurname.startsWith(tSurname) && tSurname.length >= 3) {
      score += 10;
    }
  }

  // First name rounds it out.
  if (tName && cName) {
    if (tName === cName) {
      score += 15;
      reasons.push("Name matches");
    } else if (cName.startsWith(tName) && tName.length >= 3) {
      score += 7;
    }
  }

  return { score: Math.min(100, score), reasons };
}

export function DuplicatePatientBanner({
  name,
  surname,
  idNumber,
  onUseExisting,
  boundPatientId,
}: DuplicatePatientBannerProps) {
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the dismissed state whenever the operator meaningfully changes inputs,
  // so a new potential match can re-surface.
  useEffect(() => {
    setDismissed(false);
  }, [idNumber, surname, name]);

  useEffect(() => {
    // Don't run matching once the form is bound to an existing patient
    // (i.e. they've already chosen, or this is a re-triage).
    if (boundPatientId) {
      setMatches([]);
      return;
    }

    const hasEnoughToSearch =
      (norm(idNumber).length >= 5) ||
      (norm(surname).length >= 2 && norm(name).length >= 2);

    if (!hasEnoughToSearch) {
      setMatches([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);

        // Query the backend /patients/search endpoint with each meaningful
        // identifier (name+surname combined, and ID number). This is the same
        // server-side search used by the dashboard, so duplicate detection and
        // search stay consistent everywhere. Results are de-duplicated by id.
        const queries: string[] = [];
        const combined = `${norm(name)} ${norm(surname)}`.trim();
        if (combined.length >= 2) queries.push(combined);
        if (norm(surname).length >= 2) queries.push(norm(surname));
        if (norm(idNumber).length >= 5) queries.push(norm(idNumber));

        const responses = await Promise.all(
          queries.map((q) =>
            patientService.searchPatients(q).catch(() => [] as PatientListItem[]),
          ),
        );

        const byId = new Map<number, PatientListItem>();
        for (const list of responses) {
          for (const p of list) {
            if (!byId.has(p.id)) byId.set(p.id, p);
          }
        }

        // Keep ALL qualifying matches (sorted strongest-first). The UI caps how
        // many are visible at once and makes the overflow scrollable, but we
        // retain the full list so we can show an accurate total-results count
        // even when hundreds of patients share the same name + surname.
        const scored: DuplicateMatch[] = Array.from(byId.values())
          .map((p) => {
            const { score, reasons } = scoreMatch({ name, surname, idNumber }, p as any);
            return {
              id: p.id,
              patientFileId: p.patientFileId,
              name: p.name,
              surname: p.surname,
              idNumber: (p as any).id_number ?? (p as any).idNumber,
              score,
              reasons,
              raw: p,
            };
          })
          .filter((m) => m.score >= 30)
          .sort((a, b) => b.score - a.score);

        setMatches(scored);

      } catch (err) {
        console.warn("[DUPLICATE-CHECK] patient lookup failed (non-blocking):", err);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name, surname, idNumber, boundPatientId]);


  if (dismissed || matches.length === 0) return null;

  const strong = matches[0].score >= 70;
  const accent = strong ? C.orange : C.teal;
  const accentBg = strong ? C.orangeL : C.tealL;

  return (
    <div
      className="fade-up"
      style={{
        background: accentBg,
        border: `1.5px solid ${accent}40`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 14,
        padding: "12px 14px",
        marginBottom: 14,
        boxShadow: `0 2px 10px ${accent}18`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              background: accent,
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 900,
              flexShrink: 0,
            }}
            aria-hidden
          >
            !
          </span>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: accent,
              textTransform: "uppercase",
              letterSpacing: "0.09em",
            }}
          >
            {strong ? "Possible existing patient" : "Similar records found"}
            {loading ? " · searching…" : ""}
          </div>
          {/* Total number of matching records found — important when many
              patients share the same name + surname so the operator knows the
              list below is only a preview of the strongest matches. */}
          {!loading && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: accent,
                background: "#fff",
                border: `1px solid ${accent}40`,
                borderRadius: 999,
                padding: "2px 8px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {matches.length} {matches.length === 1 ? "result" : "results"}
            </span>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss duplicate suggestion"
          style={{
            border: "none",
            background: "transparent",
            color: accent,
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
            padding: 0,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5, margin: "6px 0 10px", paddingLeft: 30 }}>
        {strong
          ? "This looks like a patient already on file. Continue with their record to keep one history?"
          : "These existing patients have similar details. Select one to re-use their file, or keep typing to create new."}
      </div>

      {/* Match list. Roughly the first 3 cards are visible; any extras stay in
          this scrollable container so the banner never grows unbounded when
          many patients share the same name + surname. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: matches.length > 3 ? 228 : undefined,
          overflowY: matches.length > 3 ? "auto" : "visible",
          paddingRight: matches.length > 3 ? 4 : 0,
          // Subtle fade hint that there's more to scroll to.
          WebkitMaskImage:
            matches.length > 3
              ? "linear-gradient(to bottom, #000 88%, transparent 100%)"
              : undefined,
          maskImage:
            matches.length > 3
              ? "linear-gradient(to bottom, #000 88%, transparent 100%)"
              : undefined,
        }}
      >
        {matches.map((m) => (

          <div
            key={m.id}
            style={{
              background: C.bg,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>
                {m.name} {m.surname}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                {m.idNumber ? `ID ${m.idNumber} · ` : ""}
                {m.reasons.join(" · ") || "Similar details"}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: m.score >= 70 ? C.orange : C.teal,
                  background: m.score >= 70 ? `${C.orange}15` : `${C.teal}15`,
                  borderRadius: 999,
                  padding: "3px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                {m.score}% match
              </span>
              <button
                onClick={() => onUseExisting(m)}
                className="btn-press"
                style={{
                  border: "none",
                  background: accent,
                  color: "#fff",
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Use record
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
