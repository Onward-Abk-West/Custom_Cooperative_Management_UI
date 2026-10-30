"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api-client";
import { saveMonthlyFinancialImportSchedule } from "@/lib/api/monthly-financial-schedule";
import { isSuperadmin, type Role } from "@/lib/roles";
import { readSessionInfo } from "@/lib/session";
import { useSociety } from "@/lib/society-context";
import { useMonthlyImportSchedule } from "@/lib/use-monthly-import-schedule";
import { showError, showSuccess } from "@/lib/feedback";

export default function MonthlyImportSchedulePage() {
  const [role, setRole] = useState<Role | null>(null);
  const [ownSocietyId, setOwnSocietyId] = useState("");
  const { societyId: selectedSocietyId } = useSociety();
  const societyId = isSuperadmin(role ?? "member") ? selectedSocietyId : ownSocietyId;
  const canConfigure = !!role && (role === "supervisor" || role === "admin" || isSuperadmin(role));
  const { schedule, refresh, loading } = useMonthlyImportSchedule(societyId, canConfigure);
  const [windowStartDay, setWindowStartDay] = useState("1");
  const [windowEndDay, setWindowEndDay] = useState("7");
  const [repeatMonthly, setRepeatMonthly] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const info = readSessionInfo();
    setRole(info?.role ?? null);
    setOwnSocietyId(info?.societyId ?? "");
  }, []);

  useEffect(() => {
    if (!schedule) return;
    if (schedule.windowStartDay) setWindowStartDay(String(schedule.windowStartDay));
    if (schedule.windowEndDay) setWindowEndDay(String(schedule.windowEndDay));
    setRepeatMonthly(schedule.repeatMonthly);
    setScheduleEnabled(schedule.enabled);
  }, [schedule]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null); setNotice(null);
    const start = Number(windowStartDay); const end = Number(windowEndDay);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 31 || start > end) {
      setError("Choose a valid submission window from day 1 through day 31."); return;
    }
    setSaving(true);
    try {
      const response = await saveMonthlyFinancialImportSchedule(societyId, start, end, repeatMonthly, scheduleEnabled);
      if (!response.success) throw new Error(response.message || "Could not save the schedule.");
      await refresh();
      setNotice("Monthly upload schedule saved.");
      await showSuccess("Schedule saved", `Monthly uploads are ${scheduleEnabled ? "enabled" : "disabled"}.`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not save the schedule.";
      setError(message); await showError("Schedule not saved", message);
    } finally { setSaving(false); }
  }

  if (!role) return <p className="text-sm text-brand-ink/60">Loading…</p>;
  if (!canConfigure) return <p className="text-sm text-brand-ink/60">You cannot configure this schedule.</p>;
  if (!societyId) return <div className="rounded-2xl border border-dashed border-brand-line bg-surface-card p-6 text-sm text-brand-ink/60">{isSuperadmin(role) ? "Choose a society from the sidebar switcher to configure its schedule." : "Your society could not be determined from your session. Try signing in again."}</div>;

  return <div className="flex flex-col gap-6">
    <header>
      <h1 className="font-heading text-2xl font-bold text-heading">Schedule</h1>
      <p className="mt-1 max-w-3xl text-sm text-brand-ink/60">Set the submission window for the previous month&apos;s transaction workbook. Admins see a due notice when the window opens.</p>
    </header>
    <form onSubmit={submit} className="max-w-3xl rounded-2xl border border-brand-line bg-surface-card p-5">
      <h2 className="font-heading text-lg font-bold text-heading">Submission window</h2>
      <label className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-brand-line/10 p-3"><span><span className="block text-sm font-semibold text-heading">Monthly Schedule: {scheduleEnabled ? "Enabled" : "Disabled"}</span><span className="block text-xs text-brand-ink/60">When disabled, due reminders pause. Previous months can still be imported manually.</span></span><input aria-label="Enable monthly upload schedule" type="checkbox" role="switch" checked={scheduleEnabled} onChange={(event) => setScheduleEnabled(event.target.checked)} className="h-5 w-5 accent-brand-green" /></label>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input id="schedule-start" label="Window opens on day" type="number" min="1" max="31" value={windowStartDay} onChange={(event) => setWindowStartDay(event.target.value)} required />
        <Input id="schedule-end" label="Window ends on day" type="number" min="1" max="31" value={windowEndDay} onChange={(event) => setWindowEndDay(event.target.value)} required />
      </div>
      <label className="mt-4 flex items-start gap-3 text-sm text-brand-ink"><input type="checkbox" checked={repeatMonthly} onChange={(event) => setRepeatMonthly(event.target.checked)} className="mt-1 accent-brand-green" /><span><span className="font-semibold text-heading">Repeat for subsequent months</span><span className="block text-xs text-brand-ink/60">When off, this schedule applies to the next reporting month only.</span></span></label>
      <Button type="submit" className="mt-4" disabled={saving || loading}>{saving ? "Saving…" : "Save schedule"}</Button>
    </form>
    {notice && <p role="status" className="max-w-3xl rounded-xl bg-brand-green/10 p-3 text-sm font-medium text-brand-green">{notice}</p>}
    {error && <p role="alert" className="max-w-3xl rounded-xl bg-status-bad/10 p-3 text-sm font-semibold text-status-bad">{error}</p>}
    {schedule?.configured && <section className="max-w-3xl rounded-2xl border border-brand-line bg-surface-card p-5 text-sm text-brand-ink">
      <h2 className="font-semibold text-heading">Current schedule</h2>
      <p className="mt-1">Days {schedule.windowStartDay}–{schedule.windowEndDay} each month{schedule.repeatMonthly ? ", repeating monthly." : ", one time only."}</p>
      <p className="mt-2 text-xs text-brand-ink/60">The window is checked against the local calendar. Days beyond a month&apos;s last day fall on that month&apos;s final day.</p>
    </section>}
  </div>;
}
