import { setApiBaseUrl } from "@vitals/shared";

// Tells the shared API functions where the backend lives. Expo reads
// EXPO_PUBLIC_* variables from mobile/.env. Imported once from the root layout.
setApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
