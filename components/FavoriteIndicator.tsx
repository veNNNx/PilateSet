import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../constants/useAppTheme";

interface FavoriteIndicatorProps {
  favorite: boolean;
  label: string;
}

export function FavoriteIndicator({ favorite, label }: FavoriteIndicatorProps) {
  const { colors } = useAppTheme();
  if (!favorite) return null;

  return (
    <View
      style={styles.indicator}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Ulubione: ${label}`}
    >
      <Ionicons name="heart" size={23} color={colors.danger} />
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
