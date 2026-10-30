"use client";

import { useCallback, useEffect, useState } from "react";
import { getMonthlyFinancialImportSchedule, type MonthlyFinancialImportSchedule } from "@/lib/api/monthly-financial-schedule";

export function useMonthlyImportSchedule(societyId: string, enabled: boolean) {
  const [schedule, setSchedule] = useState<MonthlyFinancialImportSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !societyId) {
      setSchedule(null);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const response = await getMonthlyFinancialImportSchedule(societyId);
      setSchedule(response.success ? response.data : null);
    } catch {
      setSchedule(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [enabled, societyId]);

  useEffect(() => {
    void refresh();
    window.addEventListener("monthly-import-schedule-updated", refresh);
    const timer = window.setInterval(() => { void refresh(); }, 5 * 60 * 1000);
    return () => {
      window.removeEventListener("monthly-import-schedule-updated", refresh);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { schedule, loading, refresh, error, duePeriods: schedule?.duePeriods ?? [] };
}
