import { useColorScheme } from "@/hooks/use-color-scheme";
import { SCHEMES, type SchemeName, type ThemeTokens } from "@/constants/schemes";

// Scheme is fixed to "vitals" for now. When the Me screen adds the theme
// picker, this is the one place that will read the saved choice.
const CURRENT_SCHEME: SchemeName = "vitals";

export function useAppTheme(): ThemeTokens {
  const systemMode = useColorScheme();
  const mode = systemMode === "dark" ? "dark" : "light";
  return SCHEMES[CURRENT_SCHEME][mode];
}
