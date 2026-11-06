import React, { useMemo, type ReactNode } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Spacing } from "../constants/colors";
import { useAppTheme } from "../constants/useAppTheme";
import { useExerciseImagePreference } from "../constants/exerciseImagePreference";
import type { Exercise } from "../constants/exercises";
import { formatBodyAreas, formatExercisePosition } from "../constants/taxonomy";
import { getExerciseImage } from "../constants/exerciseImages";

type ExerciseCardProps = {
  exercise: Exercise;
  onPress?: () => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
  selected?: boolean;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  activeOpacity?: number;
};

export function ExerciseCard({
  exercise,
  onPress,
  onLongPress,
  accessibilityLabel,
  selected,
  trailing,
  style,
  activeOpacity = 0.75,
}: ExerciseCardProps) {
  const { colors, globalStyles, typography } = useAppTheme();
  const { showExerciseImages } = useExerciseImagePreference();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const position = formatExercisePosition(exercise.position);

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
        onLongPress={onLongPress}
        delayLongPress={onLongPress ? 250 : undefined}
        activeOpacity={activeOpacity}
        accessibilityRole={selected === undefined ? "button" : "checkbox"}
        accessibilityLabel={accessibilityLabel ?? exercise.name}
        accessibilityState={
          selected === undefined ? undefined : { checked: selected }
        }
      >
        {showExerciseImages ? (
          <Image
            source={getExerciseImage(exercise.id, exercise.images[0])}
            style={globalStyles.cardImage}
            testID="exercise-card-image"
          />
        ) : null}
        <View style={globalStyles.cardInfo}>
          <View style={styles.titleRow}>
            <Text
              style={[typography.h2, styles.exerciseName]}
              numberOfLines={1}
            >
              {exercise.name}
            </Text>
            <Text style={styles.sets} numberOfLines={1}>
              {exercise.sets}
            </Text>
          </View>
          <View style={styles.metaTags}>
            <Text style={styles.level} numberOfLines={1}>
              {exercise.level}
            </Text>
            {position ? (
              <View style={styles.positionBadge}>
                <Text style={styles.positionBadgeText} numberOfLines={1}>
                  {position}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[typography.caption, styles.bodyAreas]}
            numberOfLines={1}
          >
            {formatBodyAreas(exercise.bodyAreas)}
          </Text>
        </View>
      </TouchableOpacity>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    card: {
      alignItems: "center",
      gap: Spacing.xs,
    },
    content: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      minWidth: 0,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: Spacing.xs,
      marginBottom: 2,
    },
    exerciseName: {
      flex: 1,
      minWidth: 0,
      marginRight: Spacing.xs,
    },
    metaTags: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      flexWrap: "wrap",
      marginBottom: 2,
    },
    bodyAreas: {
      flexShrink: 1,
    },
    positionBadge: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 7,
      paddingVertical: 2,
      flexShrink: 1,
    },
    positionBadgeText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: "600",
    },
    level: {
      color: colors.primaryDark,
      backgroundColor: colors.selectedBackground,
      borderRadius: 12,
      paddingHorizontal: 7,
      paddingVertical: 3,
      overflow: "hidden",
      fontSize: 10,
      fontWeight: "600",
    },
    sets: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: "600",
      flexShrink: 0,
      textAlign: "right",
    },
    trailing: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.xs,
    },
  });
