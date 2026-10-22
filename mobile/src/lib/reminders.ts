import * as Notifications from "expo-notifications";

// Local reminders only: they are scheduled on the phone, no server involved.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Turn the weekly check-in reminder on or off. Returns false if the user
// refused permission, so the switch can go back to off.
export async function setWeeklyReminder(on: boolean): Promise<boolean> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!on) return true;

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.status === "granted";
  if (!granted) {
    const asked = await Notifications.requestPermissionsAsync();
    granted = asked.status === "granted";
  }
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: { title: "Vitals check-in", body: "A minute to update your numbers and see how your score moved." },
    // weekday 1 is Sunday
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 18, minute: 0 },
  });
  return true;
}
