export interface AppColors {
  primary: string;
  primaryDark: string;
  background: string;
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  white: string;
  selectedBackground: string;
  danger: string;
}

export const Colors = {
  primary: "#2A9D8F",
  primaryDark: "#217A6F",
  background: "#F8F9FA",
  cardBackground: "#FFFFFF",
  textPrimary: "#2B2D42",
  textSecondary: "#8D99AE",
  border: "#E2E8F0",
  white: "#FFFFFF",
  selectedBackground: "#E4F3F1",
  danger: "#B42318",
};

export const DarkColors: AppColors = {
  primary: "#67C9B9",
  primaryDark: "#91DED2",
  background: "#101918",
  cardBackground: "#1B2524",
  textPrimary: "#E7EFED",
  textSecondary: "#A6B5B2",
  border: "#354340",
  white: "#FFFFFF",
  selectedBackground: "#263F3A",
  danger: "#FF8A80",
};

export function getColors(dark: boolean): AppColors {
  return dark ? DarkColors : Colors;
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
};
