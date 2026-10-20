import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { SchemeName } from "@/constants/schemes";

// Small settings kept on the phone itself (not in the database), so the
// chosen theme survives closing the app even for guests.

const PREFS_KEY = "vitals-prefs";

export type ModeChoice = "system" | "light" | "dark";

interface PrefsState {
  scheme: SchemeName;
  mode: ModeChoice;
  weeklyCheckin: boolean;
  goalMilestones: boolean;
  loaded: boolean;
  setScheme: (scheme: SchemeName) => void;
  setMode: (mode: ModeChoice) => void;
  setWeeklyCheckin: (on: boolean) => void;
  setGoalMilestones: (on: boolean) => void;
  load: () => Promise<void>;
}

function saveSoon(state: PrefsState) {
  const { scheme, mode, weeklyCheckin, goalMilestones } = state;
  SecureStore.setItemAsync(PREFS_KEY, JSON.stringify({ scheme, mode, weeklyCheckin, goalMilestones })).catch(() => {});
}

export const usePrefs = create<PrefsState>()((set, get) => ({
  scheme: "vitals",
  mode: "system",
  weeklyCheckin: true,
  goalMilestones: true,
  loaded: false,

  setScheme: (scheme) => {
    set({ scheme });
    saveSoon(get());
  },
  setMode: (mode) => {
    set({ mode });
    saveSoon(get());
  },
  setWeeklyCheckin: (on) => {
    set({ weeklyCheckin: on });
    saveSoon(get());
  },
  setGoalMilestones: (on) => {
    set({ goalMilestones: on });
    saveSoon(get());
  },

  load: async () => {
    try {
      const raw = await SecureStore.getItemAsync(PREFS_KEY);
      if (raw) set({ ...JSON.parse(raw) });
    } catch {
      // Unreadable settings are ignored and the defaults stay.
    }
    set({ loaded: true });
  },
}));
