import { C, pC } from "../constants/theme";
import { priorityColor, resolveConditionName } from "../services/catalogService";
import { fullName } from "../utils/helpers";
import { Btn, Hdr, StatusChip } from "../components/ui";
import { PatientCardSkeleton } from "../components/Skeletons";
import { IconSearch, IconChevronRight } from "../components/icons";

interface PatientsScreenProps {
  onNav: (screen: string, filter?: string | null) => void;
  patients: any[];
  loading?: boolean;
  onOpenPatient: (patient: any) => void;
  onStartNewTriage: () => void;
  onOpenSearch: () => void;
  filter?: string | null;
}

export function PatientsScreen({ onNav, patients, loading, onOpenPatient, onStartNewTriage, onOpenSearch, filter }: PatientsScreenProps) {
  // Apply filter if provided
  let filteredPatients = patients;
  if (filter === "p2") {
    filteredPatients = patients.filter((p: any) => (p.latestAssessment?.finalPriorityId || p.p) === 2);
  } else if (filter === "pending") {
    filteredPatients = patients.filter((p: any) => /Pending|Awaiting/.test(p.status));
  }
  const showSkeletons = Boolean(loading) && filteredPatients.length === 0;
  return (
    <div className="fade-in" style={{ minHeight: "100dvh", background: C.bgSoft, paddingBottom: 156 }}>
      <Hdr title="Triage Queue" onBack={() => onNav("welcome")} />
      <div style={{ padding: "14px 14px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{showSkeletons ? "Loading queue…" : `${patients.length} patients triaged today`}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Btn variant="ghost" onClick={onOpenSearch} s={{ padding: "6px 10px", fontSize: 12, borderRadius: 999 }}><IconSearch size={12} style={{ marginRight: 4 }} /> Search Files</Btn>
            <StatusChip label="Sort by priority" tone={C.green} />
          </div>
        </div>
        {showSkeletons
          ? Array.from({ length: 5 }).map((_, i) => <PatientCardSkeleton key={i} delay={i * 0.05} />)
          : filteredPatients.map((p: any, i: number) => {
              const finalPid = (p.latestAssessment?.finalPriorityId || p.p);
              const col = priorityColor(finalPid) || pC(finalPid);
              return (
                <div key={p.id} className="card-hover fade-up" onClick={() => onOpenPatient(p)} style={{ animationDelay: `${i * 0.04}s`, background: C.bg, borderRadius: 16, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 3px 12px rgba(0,0,0,.07)", border: `1px solid ${C.border}`, borderLeft: `4px solid ${col}`, cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: col, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 10px ${col}40` }}>
                    <span style={{ fontWeight: 900, color: "white", fontSize: 14 }}>P{finalPid}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text, letterSpacing: "-.01em" }}>{fullName(p)}</div>
                      <StatusChip label={p.status} tone={col} />
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{resolveConditionName(p) || p.cond || "—"}</div>
                    <div style={{ fontSize: 11, color: C.textLight, marginTop: 1 }}>Age {p.age} · GA {p.ga}w · {p.location} · {p.t}</div>
                    <div style={{ fontSize: 11, color: col, fontWeight: 700, marginTop: 4 }}>Reassess: {p.reassessDue}</div>
                  </div>
                  <IconChevronRight size={16} color={C.textLight} />
                </div>
              );
            })}
      </div>
      <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 64, width: "100%", maxWidth: 480, padding: "0 14px", zIndex: 90, pointerEvents: "none" }}>
        <div style={{ background: "linear-gradient(180deg, rgba(246,248,247,0) 0%, rgba(246,248,247,0.94) 26%, rgba(246,248,247,1) 100%)", paddingTop: 24, pointerEvents: "auto" }}>
          <Btn full onClick={onStartNewTriage} s={{ padding: "14px 0", borderRadius: 14, boxShadow: "0 8px 20px rgba(30,123,71,.35)" }}>+ New Triage Assessment</Btn>
        </div>
      </div>
    </div>
  );
}
