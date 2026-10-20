import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

// Supabase wants somewhere to keep the login session. On the web that is a
// cookie; on the phone we use the device's secure storage (Keychain on iOS).
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// Placeholders keep a missing .env from crashing the app at startup (guests
// never touch Supabase). Sign-in and sync simply fail until it is filled in.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "missing-anon-key";

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
