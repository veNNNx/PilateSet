import React, { useMemo, type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ExerciseCard } from "./ExerciseCard";
import { BorderRadius, Spacing } from "../constants/colors";
import type { Exercise } from "../constants/exercises";
import { formatPolishCount } from "../constants/formatting";
import type { Sequence } from "../constants/sequenceStorage";
import { useAppTheme } from "../constants/useAppTheme";

type SequenceContentCardProps = {
  sequence: Sequence;
  exercises: Exercise[];
  expanded: boolean;
  onToggle: () => void;
  onExercisePress?: (exercise: Exercise) => void;
  onSequencePress?: () => void;
  onHeaderLongPress?: (event: GestureResponderEvent) => void;
  headerAccessibilityLabel?: string;
  trailing?: ReactNode;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SequenceContentCard({
  sequence,
  exercises,
  expanded,
  onToggle,
  onExercisePress,
  onSequencePress,
  onHeaderLongPress,
  headerAccessibilityLabel,
  trailing,
  active = false,
  style,
}: SequenceContentCardProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sequenceExercises = sequence.exerciseIds
    .map((exerciseId) =>
      exercises.find((exercise) => exercise.id === exerciseId),
    )
    .filter((exercise): exercise is Exercise => exercise !== undefined);

  return (
    <View style={[styles.card, active && styles.activeCard, style]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.expandButton}
          onPress={onToggle}
          onLongPress={onHeaderLongPress}
          delayLongPress={onHeaderLongPress ? 250 : undefined}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={
            headerAccessibilityLabel ??
            `${expanded ? "Zwiń" : "Rozwiń"} sekwencję ${sequence.name}`
          }
        >
          <Ionicons
            name={expanded ? "chevron-down" : "chevron-forward"}
            size={20}
            color={colors.primary}
          />
          <View style={styles.copy}>
            <Text style={styles.name} numberOfLines={1}>
              {sequence.name}
            </Text>
            <Text style={styles.meta}>
              {formatPolishCount(
                sequenceExercises.length,
                "ćwiczenie",
                "ćwiczenia",
                "ćwiczeń",
              )}
            </Text>
          </View>
        </TouchableOpacity>
        {trailing ??
          (onSequencePress ? (
            <TouchableOpacity
              onPress={onSequencePress}
              accessibilityRole="button"
              accessibilityLabel={`Otwórz sekwencję ${sequence.name}`}
              hitSlop={8}
            >
              <Ionicons
                name="open-outline"
                size={19}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ) : null)}
      </View>
      {expanded ? (
        <View style={styles.preview}>
          {sequenceExercises.map((exercise) => (
            <ExerciseCard
              key={`${sequence.id}-${exercise.id}`}
              exercise={exercise}
              onPress={
                onExercisePress ? () => onExercisePress(exercise) : undefined
              }
              style={styles.exerciseCard}
            />
          ))}
          {sequenceExercises.length === 0 ? (
            <Text style={styles.meta}>Brak dostępnych ćwiczeń.</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    card: {
      minHeight: 82,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.cardBackground,
      overflow: "hidden",
    },
    activeCard: {
      borderColor: colors.primary,
      backgroundColor: colors.selectedBackground,
    },
    header: {
      minHeight: 80,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      gap: Spacing.sm,
    },
    expandButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    copy: {
      flex: 1,
    },
    name: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    meta: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    preview: {
      paddingHorizontal: Spacing.sm,
      paddingBottom: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    exerciseCard: {
      marginTop: Spacing.sm,
    },
  });
