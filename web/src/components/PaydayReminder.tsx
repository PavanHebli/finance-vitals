"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { analytics } from "@/lib/analytics";

// "Remind me on payday": adds a repeating event to the person's own calendar
// (an .ics file). Nothing is stored on our side. The link in the event carries
// utm_source=reminder, so a visit that comes from the reminder shows up in
// analytics. The point is to measure whether anyone wants to come back.

const LINK = "https://myfinancevitals.app/?utm_source=reminder";

// 2026-11-14 -> 20261114
function icsDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function buildIcs(payday: string, frequency: "biweekly" | "monthly"): string {
  const start = new Date(payday + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const rule = frequency === "biweekly" ? "FREQ=WEEKLY;INTERVAL=2" : "FREQ=MONTHLY";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vitals//Payday reminder//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@myfinancevitals.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(start)}`,
    `DTEND;VALUE=DATE:${icsDate(end)}`,
    `RRULE:${rule}`,
    "SUMMARY:Payday money check-in (Vitals)",
    `DESCRIPTION:Two minutes: see where your money stands this paycheck. ${LINK}`,
    `URL:${LINK}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function PaydayReminder() {
  const [open, setOpen] = useState(false);
  const [payday, setPayday] = useState("");
  const [frequency, setFrequency] = useState<"biweekly" | "monthly">("biweekly");
  const [done, setDone] = useState(false);

  function handleOpen() {
    setOpen(true);
    analytics.track("reminder_opened");
  }

  function handleAdd() {
    if (!payday) return;
    const file = new Blob([buildIcs(payday, frequency)], { type: "text/calendar" });
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vitals-payday-reminder.ics";
    a.click();
    URL.revokeObjectURL(url);
    analytics.track("reminder_set", { frequency });
    setDone(true);
  }

  if (done) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Reminder file downloaded. Open it to add the reminder to your calendar.
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={handleOpen} className="btn-secondary inline-flex items-center gap-2 text-sm">
        <CalendarPlus size={15} />
        Remind me to check in on payday
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="text-sm flex-1">
          <span className="label">Your next payday</span>
          <input type="date" value={payday} onChange={(e) => setPayday(e.target.value)} className="input" />
        </label>
        <label className="text-sm flex-1">
          <span className="label">You get paid</span>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as "biweekly" | "monthly")}
            className="input"
          >
            <option value="biweekly">Every 2 weeks</option>
            <option value="monthly">Once a month</option>
          </select>
        </label>
      </div>
      <button type="button" onClick={handleAdd} disabled={!payday} className="btn-primary text-sm disabled:opacity-40">
        Add to my calendar
      </button>
      <p className="text-xs text-[var(--text-muted)]">Goes into your own calendar. We don&apos;t store your date.</p>
    </div>
  );
}
