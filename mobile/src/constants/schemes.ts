// Color tokens for the 5 app themes x light/dark, copied from the
// "Vitals iOS v5" design artifact. Scheme names match the allowed values of
// user_settings.color_scheme in the database.

export type SchemeName = "vitals" | "forest" | "ocean" | "dusk" | "rose";

export interface ThemeTokens {
  brand: string;
  brandSoft: string;
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
}

interface Scheme {
  dot: string;
  light: ThemeTokens;
  dark: ThemeTokens;
}

export const SCHEMES: Record<SchemeName, Scheme> = {
  vitals: {
    dot: "#4f6ef7",
    light: { brand: "#4f6ef7", brandSoft: "rgba(79,110,247,0.1)", bg: "#ffffff", surface: "#f8f9fc", surface2: "#f0f2f8", border: "#e2e6f0", text: "#1a1d2e", textMuted: "#6b7280" },
    dark:  { brand: "#6b84f9", brandSoft: "rgba(107,132,249,0.13)", bg: "#0f1117", surface: "#181c27", surface2: "#1e2235", border: "#2a2f42", text: "#e8eaf2", textMuted: "#9099b0" },
  },
  forest: {
    dot: "#00a043",
    light: { brand: "#00a043", brandSoft: "rgba(0,160,67,0.1)", bg: "#ffffff", surface: "#f7faf8", surface2: "#edf4f0", border: "#d4e8dc", text: "#0f1f16", textMuted: "#5a7a67" },
    dark:  { brand: "#22c55e", brandSoft: "rgba(34,197,94,0.12)", bg: "#0d1a12", surface: "#131f18", surface2: "#192a1f", border: "#1f3828", text: "#e0f0e8", textMuted: "#5a8a6a" },
  },
  ocean: {
    dot: "#0284c7",
    light: { brand: "#0284c7", brandSoft: "rgba(2,132,199,0.1)", bg: "#ffffff", surface: "#f0f7fc", surface2: "#e0eff8", border: "#c8dff0", text: "#0c1e2d", textMuted: "#4a6a82" },
    dark:  { brand: "#38bdf8", brandSoft: "rgba(56,189,248,0.12)", bg: "#09141e", surface: "#0f1e2d", surface2: "#142534", border: "#1c3248", text: "#daeefa", textMuted: "#4e7a98" },
  },
  dusk: {
    dot: "#7c3aed",
    light: { brand: "#7c3aed", brandSoft: "rgba(124,58,237,0.1)", bg: "#ffffff", surface: "#f8f5ff", surface2: "#ede8fe", border: "#ddd5fd", text: "#18103a", textMuted: "#6b5b8e" },
    dark:  { brand: "#a78bfa", brandSoft: "rgba(167,139,250,0.13)", bg: "#100c1c", surface: "#1a1228", surface2: "#221833", border: "#2e2248", text: "#ede8ff", textMuted: "#8270aa" },
  },
  rose: {
    dot: "#e11d48",
    light: { brand: "#e11d48", brandSoft: "rgba(225,29,72,0.1)", bg: "#ffffff", surface: "#fff5f7", surface2: "#ffe4ea", border: "#fecdd6", text: "#1f0a10", textMuted: "#8c4a5c" },
    dark:  { brand: "#fb7185", brandSoft: "rgba(251,113,133,0.13)", bg: "#1a0810", surface: "#261018", surface2: "#321420", border: "#481828", text: "#fce8ec", textMuted: "#b06070" },
  },
};

// Status colors used by metric pills and progress bars — same in every theme.
export const STATUS = {
  good: "#00a043",
  amber: "#dc6e00",
  red: "#dc3535",
};
