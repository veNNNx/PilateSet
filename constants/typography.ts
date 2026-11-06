import { Colors } from "./colors";

export function createTypography(colors: typeof Colors) {
  return {
    h1: {
      fontSize: 24,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    h2: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: colors.textPrimary,
    },
    body: {
      fontSize: 15,
      fontWeight: "400" as const,
      color: colors.textPrimary,
    },
    caption: {
      fontSize: 13,
      fontWeight: "400" as const,
      color: colors.textSecondary,
    },
  };
}

export const Typography = createTypography(Colors);
