import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { PaySchedule } from "@vitals/shared";

// Local reminders only: they are scheduled on the phone, no server involved.
// One reminder at a time: the morning of the next payday. It is rescheduled
// whenever the pay schedule changes (setup, or starting a paycheck).

const REMINDER_HOUR = 9; // 9:00 in the morning, phone time

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Asks for permission if it hasn't been asked yet. Returns false if refused.
export async function allowNotifications(): Promise<boolean> {
  // Android 13+ only shows the permission prompt once a channel exists.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("payday", {
      name: "Payday reminder",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === "granted";
}

// "2026-12-02" at 9:00 phone time, as a Date.
export function reminderTime(payday: string): Date {
  const [year, month, day] = payday.split("-").map(Number);
  return new Date(year, month - 1, day, REMINDER_HOUR, 0);
}

// Clears the old reminder and, if on, schedules the one for the next payday.
// Returns false if the user refused permission, so the switch can go back to off.
export async function syncPaydayReminder(schedule: PaySchedule | null, on: boolean): Promise<boolean> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!on || !schedule) return true;
  if (!(await allowNotifications())) return false;

  // A payday whose morning has already passed isn't scheduled: the
  // "It's payday" banner on the plan covers it.
  const when = reminderTime(schedule.nextPayday);
  if (when.getTime() <= Date.now()) return true;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "It's payday",
      body: "Plan this paycheck in about a minute.",
      data: { url: "/paycheck" },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: "payday" },
  });
  return true;
}

// For testing on a phone in development: the same reminder in 5 seconds.
export async function sendTestReminder(): Promise<boolean> {
  if (!(await allowNotifications())) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "It's payday",
      body: "Plan this paycheck in about a minute.",
      data: { url: "/paycheck" },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: "payday" },
  });
  return true;
}
