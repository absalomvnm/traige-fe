import { useEffect, useState } from "react";
import { patientService } from "../services/Patientservice";

export interface ProfileReport {
  acknowledgementsApproved: number;
  triagedCount: number;
  notesAdded: number;
  checklistsCompleted: number;
  timelineEventsLogged: number;
}

export function useProfileReport(userId?: number) {
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    patientService.getProfileReport(userId)
      .then(setReport)
      .catch(e => setError(e.message || "Failed to load report"))
      .finally(() => setLoading(false));
  }, [userId]);

  return { report, loading, error };
}
