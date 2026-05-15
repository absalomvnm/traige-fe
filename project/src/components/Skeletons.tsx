import ContentLoader from "react-content-loader";
import { C } from "../constants/theme";

const BG = "#E2E8F0";
const FG = "#F1F5F9";

/** Patient queue row skeleton — matches PatientsScreen card layout. */
export function PatientCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="fade-up"
      style={{
        animationDelay: `${delay}s`,
        background: C.bg,
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 3px 12px rgba(0,0,0,.05)",
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${C.border}`,
      }}
    >
      <ContentLoader speed={1.4} width={44} height={44} backgroundColor={BG} foregroundColor={FG}>
        <rect x="0" y="0" rx="14" ry="14" width="44" height="44" />
      </ContentLoader>
      <div style={{ flex: 1 }}>
        <ContentLoader speed={1.4} width="100%" height={56} backgroundColor={BG} foregroundColor={FG}>
          <rect x="0" y="2" rx="4" ry="4" width="55%" height="11" />
          <rect x="0" y="20" rx="4" ry="4" width="80%" height="9" />
          <rect x="0" y="36" rx="4" ry="4" width="65%" height="9" />
          <rect x="0" y="50" rx="4" ry="4" width="40%" height="8" />
        </ContentLoader>
      </div>
    </div>
  );
}

/** P1 alert card skeleton — matches AlertsScreen card layout. */
export function AlertCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="fade-up"
      style={{
        animationDelay: `${delay}s`,
        background: C.bg,
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,.05)",
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${C.p1b}`,
      }}
    >
      <ContentLoader speed={1.4} width="100%" height={110} backgroundColor={BG} foregroundColor={FG}>
        <rect x="0" y="0" rx="4" ry="4" width="55%" height="12" />
        <rect x="0" y="20" rx="4" ry="4" width="40%" height="11" />
        <rect x="0" y="38" rx="4" ry="4" width="60%" height="9" />
        <rect x="0" y="58" rx="8" ry="8" width="100%" height="22" />
        <rect x="0" y="92" rx="8" ry="8" width="48%" height="16" />
        <rect x="52%" y="92" rx="8" ry="8" width="48%" height="16" />
      </ContentLoader>
    </div>
  );
}

/** Single vital/urinalysis tile skeleton. */
export function VitalTileSkeleton() {
  return (
    <div
      style={{
        background: C.bgDeep,
        borderRadius: 12,
        padding: "11px 12px",
        border: `1px solid ${C.border}`,
      }}
    >
      <ContentLoader speed={1.4} width="100%" height={42} backgroundColor={BG} foregroundColor={FG}>
        <rect x="0" y="0" rx="3" ry="3" width="40%" height="7" />
        <rect x="0" y="12" rx="4" ry="4" width="60%" height="14" />
        <rect x="0" y="32" rx="3" ry="3" width="30%" height="6" />
      </ContentLoader>
    </div>
  );
}

/** Grid of vital tiles (default 3 across). */
export function VitalGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <VitalTileSkeleton key={i} />
      ))}
    </div>
  );
}

/** Single checklist row skeleton (checkbox + text). */
export function ChecklistRowSkeleton() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
      <ContentLoader speed={1.4} width={20} height={20} backgroundColor={BG} foregroundColor={FG}>
        <rect x="0" y="0" rx="6" ry="6" width="20" height="20" />
      </ContentLoader>
      <div style={{ flex: 1 }}>
        <ContentLoader speed={1.4} width="100%" height={12} backgroundColor={BG} foregroundColor={FG}>
          <rect x="0" y="2" rx="4" ry="4" width={`${50 + Math.random() * 40}%`} height="8" />
        </ContentLoader>
      </div>
    </div>
  );
}

/** Stack of checklist rows. */
export function ChecklistSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <ChecklistRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** Single note/timeline row skeleton. */
export function NoteRowSkeleton() {
  return (
    <div
      style={{
        background: C.bgDeep,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 8,
        border: `1px solid ${C.border}`,
      }}
    >
      <ContentLoader speed={1.4} width="100%" height={38} backgroundColor={BG} foregroundColor={FG}>
        <rect x="0" y="0" rx="3" ry="3" width="35%" height="8" />
        <rect x="0" y="14" rx="4" ry="4" width="92%" height="8" />
        <rect x="0" y="28" rx="4" ry="4" width="70%" height="8" />
      </ContentLoader>
    </div>
  );
}

/** Stat tile skeleton — for ReportsScreen. */
export function StatTileSkeleton() {
  return (
    <div
      style={{
        background: C.bg,
        borderRadius: 14,
        padding: "14px 12px",
        border: `1px solid ${C.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,.04)",
      }}
    >
      <ContentLoader speed={1.4} width="100%" height={48} backgroundColor={BG} foregroundColor={FG}>
        <rect x="0" y="0" rx="3" ry="3" width="55%" height="8" />
        <rect x="0" y="16" rx="5" ry="5" width="45%" height="20" />
        <rect x="0" y="42" rx="3" ry="3" width="35%" height="6" />
      </ContentLoader>
    </div>
  );
}
