import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Spacing, type AppColors } from "../constants/colors";
import type { Exercise } from "../constants/exercises";
import { useAppTheme } from "../constants/useAppTheme";

type ExerciseInfoButtonProps = {
  exercise: Exercise;
  onPress: () => void;
};

export function ExerciseInfoButton({
  exercise,
  onPress,
}: ExerciseInfoButtonProps) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Pokaż informacje o ćwiczeniu ${exercise.name}`}
      hitSlop={8}
    >
      <Ionicons
        name="information-circle-outline"
        size={22}
        color={colors.primary}
      />
    </TouchableOpacity>
  );
}

type ExerciseInfoPopupProps = {
  exercise: Exercise | null;
  onClose: () => void;
};

export function ExerciseInfoPopup({
  exercise,
  onClose,
}: ExerciseInfoPopupProps) {
  const { colors: Colors } = useAppTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  if (!exercise) return null;

  const details = [
    { label: "Pozycja wejściowa", value: exercise.startingPosition },
    { label: "Sekwencja ruchu", value: exercise.movementSequence },
    { label: "Modyfikacje", value: exercise.modifications },
  ].filter((item) => item.value.trim());

  return (
    <View style={styles.overlay} testID="exercise-info-popup">
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Zamknij informacje o ćwiczeniu"
      />
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.title}>Informacje o ćwiczeniu</Text>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Zamknij popup informacji o ćwiczeniu"
            hitSlop={8}
          >
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.details}
          showsVerticalScrollIndicator
        >
          {details.length > 0 ? (
            details.map(({ label, value }) => (
              <View key={label} style={styles.section}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>
              Brak dodatkowych informacji o ćwiczeniu.
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

export function useExerciseInfo() {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const showExerciseInfo = useCallback(
    (selectedExercise: Exercise) => setExercise(selectedExercise),
    [],
  );
  const closeExerciseInfo = useCallback(() => setExercise(null), []);

  return {
    showExerciseInfo,
    closeExerciseInfo,
    popup: (
      <ExerciseInfoPopup exercise={exercise} onClose={closeExerciseInfo} />
    ),
  };
}

const createStyles = (Colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 2,
      elevation: 2,
      alignItems: "center",
      justifyContent: "center",
      padding: Spacing.md,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    card: {
      width: "100%",
      maxWidth: 480,
      maxHeight: "80%",
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.cardBackground,
      padding: Spacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    heading: { flex: 1, gap: Spacing.xs },
    title: { color: Colors.textPrimary, fontSize: 18, fontWeight: "700" },
    exerciseName: {
      color: Colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
    },
    scroll: { flexShrink: 1 },
    details: { gap: Spacing.md },
    section: { gap: Spacing.xs },
    label: { color: Colors.primaryDark, fontSize: 13, fontWeight: "700" },
    value: { color: Colors.textPrimary, fontSize: 14, lineHeight: 20 },
    empty: { color: Colors.textSecondary },
  });
