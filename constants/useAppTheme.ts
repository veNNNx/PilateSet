import { useColorScheme } from "react-native";
import { useMemo } from "react";
import { getColors } from "./colors";
import { createGlobalStyles } from "./globalStyles";
import { createTypography } from "./typography";

export function useAppTheme() {
  const isDark = useColorScheme() === "dark";

  return useMemo(() => {
    const colors = getColors(isDark);
    return {
      colors,
      isDark,
      globalStyles: createGlobalStyles(colors),
      typography: createTypography(colors),
    };
  }, [isDark]);
}
