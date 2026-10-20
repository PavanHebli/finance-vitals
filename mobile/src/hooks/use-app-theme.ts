import { useColorScheme } from "@/hooks/use-color-scheme";
import { SCHEMES, type ThemeTokens } from "@/constants/schemes";
import { usePrefs } from "@/lib/prefs";

// True when the app should currently show its dark colors: the user's own
// choice if they made one, otherwise whatever the phone is set to.
export function useIsDark(): boolean {
  const systemIsDark = useColorScheme() === "dark";
  const mode = usePrefs((s) => s.mode);
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return systemIsDark;
}

// The colors for the chosen theme, in light or dark.
export function useAppTheme(): ThemeTokens {
  const scheme = usePrefs((s) => s.scheme);
  const isDark = useIsDark();
  return SCHEMES[scheme][isDark ? "dark" : "light"];
}
