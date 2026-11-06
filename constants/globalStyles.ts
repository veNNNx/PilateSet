import { StyleSheet } from "react-native";
import { Colors, Spacing, BorderRadius, type AppColors } from "./colors";

export function createGlobalStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    listContainer: {
      padding: Spacing.md,
    },
    card: {
      flexDirection: "row",
      backgroundColor: colors.cardBackground,
      borderRadius: BorderRadius.md,
      padding: Spacing.sm,
      marginBottom: Spacing.sm,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedCard: {
      borderColor: colors.primary,
      backgroundColor: colors.selectedBackground,
    },
    cardImage: {
      width: 64,
      height: 64,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.border,
    },
    cardInfo: {
      marginLeft: Spacing.md,
      flex: 1,
    },
  });
}

export const globalStyles = createGlobalStyles(Colors);
