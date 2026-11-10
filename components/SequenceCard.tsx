import React, { useMemo, type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Spacing } from "../constants/colors";
import type { Exercise } from "../constants/exercises";
import { getSequenceLevels } from "../constants/planLevels";
import { exerciseLevelLabels } from "../constants/taxonomy";
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
        <View style={styles.titleRow}>
          <Text style={[typography.h2, styles.name]} numberOfLines={1}>
            {sequence.name}
          </Text>
          <Text style={styles.levels} numberOfLines={1}>
            {levels
              .map((level) => exerciseLevelLabels[level] ?? level)
              .join(" · ") || "—"}
          </Text>
        </View>
        {sequence.load ? (
          <View
            style={styles.loadBadge}
            accessible
            accessibilityLabel={`Obciążenie: ${sequence.load}`}
          >
            <Ionicons
              name="barbell-outline"
              size={12}
              color={colors.primaryDark}
            />
            <Text style={styles.loadText} numberOfLines={1}>
              {sequence.load}
            </Text>
          </View>
        ) : null}
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
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: Spacing.xs,
    },
    name: {
      flex: 1,
      minWidth: 0,
      color: colors.textPrimary,
    },
    levels: {
      color: colors.primaryDark,
      backgroundColor: colors.selectedBackground,
      borderRadius: 12,
      paddingHorizontal: 7,
      paddingVertical: 3,
      overflow: "hidden",
      fontSize: 10,
      fontWeight: "600",
    },
    loadBadge: {
      alignSelf: "flex-start",
      maxWidth: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 2,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    loadText: {
      flexShrink: 1,
      color: colors.primaryDark,
      fontSize: 10,
      fontWeight: "600",
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
