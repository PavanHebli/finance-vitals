import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { syncPaydayReminder } from "@/lib/reminders";
import { usePrefs } from "@/lib/prefs";
import { useStore } from "@/lib/store";

// Draws nothing. Mounted once at the app root.
// - Keeps the payday reminder in step with the pay schedule: setting up the
//   plan or starting a paycheck moves the reminder to the new next payday.
// - Tapping the reminder while the app is open or in the background opens the
//   check-in. If the app was fully closed it just opens; the Budget tab then
//   shows the "It's payday" banner.
export function PaydayReminder() {
  const schedule = useStore((s) => s.paySchedule);
  const on = usePrefs((s) => s.paydayReminder);
  const prefsLoaded = usePrefs((s) => s.loaded);

  useEffect(() => {
    if (!prefsLoaded) return;
    syncPaydayReminder(schedule, on).then((allowed) => {
      if (!allowed) usePrefs.getState().setPaydayReminder(false);
    }).catch(() => {});
    // Only the payday and the switch matter, not the rest of the schedule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule?.nextPayday, on, prefsLoaded]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (url === "/paycheck") router.push("/paycheck");
    });
    return () => subscription.remove();
  }, []);

  return null;
}
