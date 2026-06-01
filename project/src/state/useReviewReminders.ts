import { useCallback, useEffect, useRef, useState } from "react";
import { fullName } from "../utils/helpers";

export interface ReviewReminder {
  id: string;           // unique key: `${patientId}_${assessmentId}`
  patientId: number | string;
  patientName: string;
  priority: number;
  reassessDue: string;  // original label e.g. "30 min"
  dueAt: Date;          // computed absolute due time
  overdueBy: number;    // ms overdue (0 if not yet due)
  isOverdue: boolean;
  dismissed: boolean;
}

/** Parse a reassessDue string into milliseconds offset from assessment time */
function parseDueMs(reassessDue: string): number {
  if (!reassessDue) return 60 * 60 * 1000; // default 1 hr
  const s = reassessDue.toLowerCase().trim();
  if (s === "immediate") return 0;
  const minMatch = s.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]) * 60 * 1000;
  const hrMatch = s.match(/(\d+)\s*hr/);
  if (hrMatch) return parseInt(hrMatch[1]) * 60 * 60 * 1000;
  return 60 * 60 * 1000;
}

/** Format how overdue a patient is */
export function formatOverdue(ms: number): string {
  if (ms <= 0) return "Due now";
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 60) return `${totalMin} min overdue`;
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `${hrs}h ${mins}m overdue` : `${hrs}h overdue`;
}

/**
 * Shallow-compare two reminder lists to decide whether a state update is
 * actually needed. Avoids redundant re-renders that can otherwise feed back
 * into the polling effect.
 */
function remindersEqual(a: ReviewReminder[], b: ReviewReminder[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.isOverdue !== y.isOverdue ||
      x.overdueBy !== y.overdueBy ||
      x.dismissed !== y.dismissed ||
      x.reassessDue !== y.reassessDue
    ) {
      return false;
    }
  }
  return true;
}

/** Format time until due */
export function formatUntilDue(ms: number): string {

  if (ms <= 0) return "Due now";
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `in ${totalMin} min`;
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `in ${hrs}h ${mins}m` : `in ${hrs}h`;
}

interface UseReviewRemindersOptions {
  /** Called when a patient becomes overdue for the first time */
  onDue?: (reminder: ReviewReminder) => void;
  /** Poll interval in ms (default 30s) */
  pollInterval?: number;
  /** How many minutes before due to show a "coming up" warning (default 5 min) */
  warningMinutes?: number;
}

export function useReviewReminders(
  patients: any[],
  options: UseReviewRemindersOptions = {}
) {
  const { onDue, pollInterval = 30_000, warningMinutes = 5 } = options;

  const [reminders, setReminders] = useState<ReviewReminder[]>([]);
  const firedRef = useRef<Set<string>>(new Set()); // track which reminders have fired
  const dismissedRef = useRef<Set<string>>(new Set()); // track dismissed

  // Keep the latest props/callbacks in refs so the polling effect can read them
  // without being part of its dependency array. This prevents an infinite
  // re-render loop when callers pass an inline `onDue` or a freshly-derived
  // `patients` array on every render.
  const patientsRef = useRef(patients);
  patientsRef.current = patients;
  const onDueRef = useRef(onDue);
  onDueRef.current = onDue;
  const warningMinutesRef = useRef(warningMinutes);
  warningMinutesRef.current = warningMinutes;

  const computeReminders = useCallback(() => {
    const patients = patientsRef.current;
    const onDue = onDueRef.current;
    const warningMinutes = warningMinutesRef.current;

    const now = Date.now();
    const warningMs = warningMinutes * 60_000;

    const next: ReviewReminder[] = [];

    for (const p of patients) {
      // Skip drafts
      if (p.isDraft || p.p === 0) continue;

      const assessedAt = p.latestAssessment?.assessedAt;
      const reassessDue = p.reassessDue || p.latestAssessment?.reassessDue;
      if (!assessedAt || !reassessDue || reassessDue === "Immediate") continue;

      const assessedMs = new Date(assessedAt).getTime();
      if (isNaN(assessedMs)) continue;

      const dueMs = parseDueMs(reassessDue);
      const dueAt = new Date(assessedMs + dueMs);
      const dueAtMs = dueAt.getTime();
      const diffMs = now - dueAtMs; // positive = overdue, negative = not yet due
      const isOverdue = diffMs >= 0;
      const isWarning = !isOverdue && (dueAtMs - now) <= warningMs;

      // Only include if overdue OR within warning window
      if (!isOverdue && !isWarning) continue;

      const key = `${p.id}_${p.assessmentId ?? p.latestAssessment?.id ?? "x"}`;
      const dismissed = dismissedRef.current.has(key);

      next.push({
        id: key,
        patientId: p.id,
        patientName: fullName(p),
        priority: p.p ?? p.latestAssessment?.priority ?? 4,
        reassessDue,
        dueAt,
        overdueBy: Math.max(0, diffMs),
        isOverdue,
        dismissed,
      });

      // Fire onDue callback once per patient per assessment
      if (isOverdue && !firedRef.current.has(key) && !dismissed) {
        firedRef.current.add(key);
        onDue?.({
          id: key,
          patientId: p.id,
          patientName: fullName(p),
          priority: p.p ?? p.latestAssessment?.priority ?? 4,
          reassessDue,
          dueAt,
          overdueBy: Math.max(0, diffMs),
          isOverdue: true,
          dismissed: false,
        });
      }
    }

    // Sort: overdue first (most overdue at top), then upcoming
    next.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isOverdue && b.isOverdue) return b.overdueBy - a.overdueBy;
      return a.dueAt.getTime() - b.dueAt.getTime();
    });

    // Only update state when the computed reminders actually changed, to avoid
    // unnecessary re-renders (and any feedback loops with the caller).
    setReminders((prev) => (remindersEqual(prev, next) ? prev : next));
  }, []);

  // Run immediately when patient data changes, and on a stable interval.
  // `computeReminders` is stable (empty deps) so this effect never tears down
  // due to changing prop/callback identities.
  useEffect(() => {
    computeReminders();
    const id = setInterval(computeReminders, pollInterval);
    return () => clearInterval(id);
  }, [computeReminders, pollInterval, patients]);


  const dismiss = useCallback((reminderId: string) => {
    dismissedRef.current.add(reminderId);
    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, dismissed: true } : r))
    );
  }, []);

  const dismissAll = useCallback(() => {
    setReminders((prev) => {
      prev.forEach((r) => dismissedRef.current.add(r.id));
      return prev.map((r) => ({ ...r, dismissed: true }));
    });
  }, []);

  const activeReminders = reminders.filter((r) => !r.dismissed);
  const overdueCount = activeReminders.filter((r) => r.isOverdue).length;

  return { reminders, activeReminders, overdueCount, dismiss, dismissAll };
}
