import { fetch as expoFetch } from "expo/fetch";
import { setApiBaseUrl, setApiFetch } from "@vitals/shared";

// Tells the shared API functions where the backend lives (Expo reads
// EXPO_PUBLIC_* variables from mobile/.env) and which fetch to use. Expo's
// fetch can read streaming responses, which the AI narrative and chat need.
// Imported once from the root layout.
setApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
setApiFetch(expoFetch as unknown as typeof fetch);

export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
