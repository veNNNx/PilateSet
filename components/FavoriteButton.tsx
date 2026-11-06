import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../constants/useAppTheme";

interface FavoriteButtonProps {
  favorite: boolean;
  label: string;
  onPress: () => void;
}

export function FavoriteButton({
  favorite,
  label,
  onPress,
}: FavoriteButtonProps) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        favorite
          ? `Usuń z ulubionych: ${label}`
          : `Dodaj do ulubionych: ${label}`
      }
      accessibilityState={{ selected: favorite }}
    >
      <Ionicons
        name={favorite ? "heart" : "heart-outline"}
        size={23}
        color={favorite ? colors.danger : colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
