import React, { useMemo, type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Spacing } from "../constants/colors";
import type { Exercise } from "../constants/exercises";
import { getSequenceLevels } from "../constants/planLevels";
import type { Sequence } from "../constants/sequenceStorage";
import { useAppTheme } from "../constants/useAppTheme";

type SequenceCardProps = {
  sequence: Sequence;
  exercises: Exercise[];
  onPress: () => void;
  accessibilityRole?: "button" | "checkbox";
  accessibilityLabel?: string;
  selected?: boolean;
  descriptionFallback?: string;
  countLabel?: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SequenceCard({
  sequence,
  exercises,
  onPress,
  accessibilityRole = "button",
  accessibilityLabel,
  selected,
  descriptionFallback = "Brak opisu sekwencji.",
  countLabel,
  trailing,
  style,
}: SequenceCardProps) {
  const { colors, globalStyles, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const levels = getSequenceLevels(sequence, exercises);

  return (
    <View
      style={[
        globalStyles.card,
        styles.card,
        selected && globalStyles.selectedCard,
        style,
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel ?? sequence.name}
        accessibilityState={
          selected === undefined ? undefined : { checked: selected }
        }
      >
        <Text style={[typography.h2, styles.name]} numberOfLines={1}>
          {sequence.name}
        </Text>
        <Text style={styles.levels} numberOfLines={1}>
          {levels.join(" · ") || "—"}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {sequence.description || descriptionFallback}
        </Text>
        {countLabel ? <Text style={styles.count}>{countLabel}</Text> : null}
      </TouchableOpacity>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    card: {
      minHeight: 82,
      gap: Spacing.sm,
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      color: colors.textPrimary,
    },
    levels: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 2,
    },
    description: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginTop: Spacing.xs,
    },
    count: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "600",
      marginTop: Spacing.sm,
    },
    trailing: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.xs,
    },
  });
