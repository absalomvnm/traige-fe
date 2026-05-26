import { useState } from "react";
import { C, pC } from "../constants/theme";
import { fullName } from "../utils/helpers";
import { IconClose } from "./icons";
import { Btn, SectionLabel, StatusChip } from "./ui";

interface SearchDrawerProps {
  open: boolean;
  onClose: () => void;
  patientFiles: any[];
  onOpenPatient: (patient: any) => void;
  onStartTriageFromFile: (file: any) => void;
  onViewAll: () => void;
}

export function SearchDrawer({
  open,
  onClose,
  patientFiles,
  onOpenPatient,
  onStartTriageFromFile,
  onViewAll,
}: SearchDrawerProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all-files");

  if (!open) return null;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredPatients = patientFiles
    .filter((patient: any) => {
      const matchesQuery =
        !normalizedQuery ||
        [fullName(patient), patient.cond, String(patient.id), patient.location, patient.status]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      if (!matchesQuery) return false;
      if (filter === "all-files") return true;
      if (filter === "in-queue") return Boolean(patient.inQueue);
      if (filter === "file-only") return !patient.inQueue;
      if (filter === "p1") return patient.p === 1;
      return true;
    })
    .slice(0, 5);

  const recentPatients = patientFiles.slice(0, 3);
  const openFromSearch = (patient: any) => {
    if (!patient.inQueue) {
      onStartTriageFromFile(patient);
      onClose();
      return;
    }
    onOpenPatient(patient);
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15,23,42,.42)",
          backdropFilter: "blur(6px)",
          zIndex: 140,
        }}
      />
      <div
        className="slide-up"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          margin: "0 auto",
          width: "100%",
          background: C.bg,
          borderRadius: "22px 22px 0 0",
          boxShadow: "0 -14px 40px rgba(0,0,0,.22)",
          zIndex: 141,
          padding: "12px 14px max(18px, env(safe-area-inset-bottom))",
          maxHeight: "78dvh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: 42,
            height: 4,
            borderRadius: 999,
            background: C.borderMid,
            margin: "0 auto 12px",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
              Search Patient Files
            </div>
            <div style={{ fontSize: 12, color: C.textMuted }}>
              Retrieve records across active triage queue and non-queue patient files
            </div>
          </div>
          <button
            type="button"
            className="btn-press"
            onClick={onClose}
            style={{
              border: `1px solid ${C.border}`,
              background: C.bgSoft,
              borderRadius: 10,
              width: 34,
              height: 34,
              cursor: "pointer",
              fontSize: 16,
              color: C.textMid,
            }}
          >
            <IconClose size={16} />
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
            placeholder="Search name, file ID, condition, status, or location"
            style={{
              width: "100%",
              padding: "13px 14px",
              border: `1.5px solid ${C.border}`,
              borderRadius: 14,
              fontSize: 14,
              color: C.text,
              background: C.bgSoft,
              boxShadow: "0 1px 3px rgba(0,0,0,.04)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
            marginBottom: 12,
          }}
        >
          {(
            [
              ["all-files", "All Files"],
              ["in-queue", "In Queue"],
              ["file-only", "File Only"],
              ["p1", "P1"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              style={{
                border: `1px solid ${filter === value ? C.green : C.border}`,
                background: filter === value ? C.greenL : C.bg,
                borderRadius: 999,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: filter === value ? C.green : C.textMid,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {query.trim() === "" && (
          <div style={{ marginBottom: 14 }}>
            <SectionLabel mb={8}>Recent Files</SectionLabel>
            {recentPatients.map((patient: any) => (
              <button
                key={`recent-${patient.id}`}
                type="button"
                onClick={() => openFromSearch(patient)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  border: `1px solid ${C.border}`,
                  background: C.bg,
                  borderRadius: 14,
                  padding: "12px 13px",
                  marginBottom: 8,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
                    {fullName(patient)}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    {patient.cond} · {patient.location} · {patient.inQueue ? "Queue" : "File"}
                  </div>
                </div>
                <StatusChip
                  label={patient.p ? `P${patient.p}` : "Untriaged"}
                  tone={patient.p ? pC(patient.p) : C.sky}
                />
              </button>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <SectionLabel mb={8}>Patient File Matches</SectionLabel>
          {filteredPatients.length ? (
            filteredPatients.map((patient: any) => (
              <button
                key={`match-${patient.id}`}
                type="button"
                onClick={() => openFromSearch(patient)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  border: `1px solid ${C.border}`,
                  background: C.bg,
                  borderRadius: 14,
                  padding: "12px 13px",
                  marginBottom: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: "0 1px 4px rgba(0,0,0,.04)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
                    {fullName(patient)}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    {patient.cond || "No active condition captured"}
                  </div>
                  <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
                    ID {patient.id} · {patient.location} · {patient.status} ·{" "}
                    {patient.inQueue ? "Queue" : "File"}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <StatusChip
                    label={patient.p ? `P${patient.p}` : "Untriaged"}
                    tone={patient.p ? pC(patient.p) : C.sky}
                  />
                </div>
              </button>
            ))
          ) : (
            <div
              style={{
                background: C.bgSoft,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: "14px 12px",
                fontSize: 12,
                color: C.textMuted,
              }}
            >
              No patients match the current search.
            </div>
          )}
        </div>

        <Btn
          full
          variant="ghost"
          onClick={() => {
            onViewAll();
            onClose();
          }}
          s={{ padding: "12px 0" }}
        >
          Open Triage Queue
        </Btn>
      </div>
    </>
  );
}
