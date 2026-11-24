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
import { PlanNoteCard } from "./PlanNoteCard";
import { BorderRadius, Spacing } from "../constants/colors";
import type { Exercise } from "../constants/exercises";
import { getSequenceLevels } from "../constants/planLevels";
import { formatPolishCount } from "../constants/formatting";
import { exerciseLevelLabels } from "../constants/taxonomy";
import { getSequenceContent } from "../constants/sequenceContent";
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
  const sequenceContent = getSequenceContent(sequence);
  const sequenceExercises = sequenceContent
    .filter((item) => item.type === "exercise")
    .map((item) => exercises.find((exercise) => exercise.id === item.id))
    .filter((exercise): exercise is Exercise => exercise !== undefined);
  const levels = getSequenceLevels(sequence, exercises)
    .map((level) => exerciseLevelLabels[level] ?? level)
    .join(" · ");

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
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={1}>
                {sequence.name}
              </Text>
              <Text style={styles.levels} numberOfLines={1}>
                {levels || "—"}
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
          {sequenceContent.map((item, index) => {
            if (item.type === "note") {
              return (
                <View
                  key={`${sequence.id}:note:${item.id}:${index}`}
                  style={styles.noteCard}
                >
                  <PlanNoteCard text={item.text} />
                </View>
              );
            }
            const exercise = exercises.find(
              (candidate) => candidate.id === item.id,
            );
            return exercise ? (
              <ExerciseCard
                key={`${sequence.id}-${item.id}-${index}`}
                exercise={exercise}
                onPress={
                  onExercisePress ? () => onExercisePress(exercise) : undefined
                }
                style={styles.exerciseCard}
              />
            ) : null;
          })}
          {sequenceExercises.length === 0 &&
          !sequenceContent.some((item) => item.type === "note") ? (
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
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: Spacing.xs,
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
      marginTop: 2,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
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
    noteCard: {
      marginTop: Spacing.sm,
    },
  });
