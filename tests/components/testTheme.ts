import { getColors } from "../../constants/colors";
import { createGlobalStyles } from "../../constants/globalStyles";
import { createTypography } from "../../constants/typography";

let dark = false;

export function setTestTheme(isDark: boolean) {
  dark = isDark;
}

export function useAppTheme() {
  const colors = getColors(dark);
  return {
    colors,
    isDark: dark,
    globalStyles: createGlobalStyles(colors),
    typography: createTypography(colors),
  };
}
