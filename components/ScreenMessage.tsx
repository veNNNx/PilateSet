import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Spacing } from "../constants/colors";
import { useAppTheme } from "../constants/useAppTheme";

type ScreenMessageProps = {
  message: string;
  error?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ScreenMessage({
  message,
  error = false,
  style,
}: ScreenMessageProps) {
  const { colors, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[globalStyles.centerContainer, styles.container, style]}>
      <Text style={[styles.message, error && styles.error]}>{message}</Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      padding: Spacing.lg,
    },
    message: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: "center",
    },
    error: {
      color: colors.danger,
    },
  });
