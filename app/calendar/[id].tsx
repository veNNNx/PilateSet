import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, BorderRadius, type AppColors } from "../../constants/colors";
import { useAppTheme } from "../../constants/useAppTheme";
import {
  deleteCalendarEntry,
  loadCalendarEntries,
  type CalendarEntry,
} from "../../constants/calendarStorage";
import { navigateBack } from "../../constants/navigation";
import { loadPlans, type Plan } from "../../constants/planStorage";
import { getPlanLevels } from "../../constants/planLevels";
import { loadSequences, type Sequence } from "../../constants/sequenceStorage";
import { useExercises } from "../../constants/useExercises";
import { ExerciseCard } from "../../components/ExerciseCard";
import { formatHour, formatLongDateKey } from "../../constants/dateUtils";
import { SequenceContentCard } from "../../components/SequenceContentCard";

export default function CalendarEntryDetailsScreen() {
  const { colors: Colors, globalStyles } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { exercises: exercisesData } = useExercises();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<CalendarEntry | null>(null);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [planError, setPlanError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [expandedSequenceIds, setExpandedSequenceIds] = useState<Set<string>>(
    new Set(),
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setPlan(null);
      setPlanError("");
      setExpandedSequenceIds(new Set());
      loadCalendarEntries()
        .then((entries) => {
          if (!isActive) return;
          const matchingEntry = entries.find((item) => item.id === id) ?? null;
          setEntry(matchingEntry);
          setError(
            matchingEntry ? "" : "Nie znaleziono zaplanowanego treningu.",
          );
          if (!matchingEntry) {
            setPlan(null);
            return;
          }
          Promise.all([loadPlans(), loadSequences()])
            .then(([plans, loadedSequences]) => {
              if (!isActive) return;
              setSequences(loadedSequences);
              setPlan(
                plans.find((item) => item.id === matchingEntry.planId) ?? null,
              );
              setPlanError("");
            })
            .catch((loadError: unknown) => {
              if (!isActive) return;
              setPlanError(
                loadError instanceof Error
                  ? loadError.message
                  : "Nie udało się wczytać planu.",
              );
            });
        })
        .catch((loadError: unknown) => {
          if (!isActive) return;
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nie udało się wczytać treningu.",
          );
        });
      return () => {
        isActive = false;
      };
    }, [id]),
  );

  const confirmDeleteEntry = () => {
    if (!entry) return;
    Alert.alert(
      "Usunąć wpis z kalendarza?",
      `„${entry.planName}” — ${formatLongDateKey(entry.date)}, ${formatHour(entry.hour)}`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: () => {
            setDeleting(true);
            void deleteCalendarEntry(entry.id)
              .then(() => navigateBack("/calendar"))
              .catch((deleteError: unknown) => {
                setError(
                  deleteError instanceof Error
                    ? deleteError.message
                    : "Nie udało się usunąć wpisu z kalendarza.",
                );
              })
              .finally(() => setDeleting(false));
          },
        },
      ],
    );
  };

  return (
    <View style={[globalStyles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigateBack("/calendar")}
          accessibilityRole="button"
          accessibilityLabel="Wróć"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Szczegóły treningu</Text>
        {entry ? (
          <>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() =>
                router.push(`/calendar/new?id=${encodeURIComponent(entry.id)}`)
              }
              accessibilityRole="button"
              accessibilityLabel="Edytuj trening"
              hitSlop={8}
            >
              <Ionicons
                name="create-outline"
                size={22}
                color={Colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={confirmDeleteEntry}
              disabled={deleting}
              accessibilityRole="button"
              accessibilityLabel="Usuń wpis z kalendarza"
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={21} color={Colors.danger} />
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      {entry ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.dateCard}>
            <View style={styles.dateIcon}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={Colors.primary}
              />
            </View>
            <View style={styles.dateInfo}>
              <Text style={styles.dateText}>
                {formatLongDateKey(entry.date)}
              </Text>
              <Text style={styles.timeText}>{formatHour(entry.hour)}</Text>
            </View>
          </View>

          <Text style={styles.label}>Opis treningu</Text>
          <View style={styles.infoCard}>
            <Text
              style={[
                styles.description,
                !entry.description && styles.noDescription,
              ]}
            >
              {entry.description || "Brak opisu"}
            </Text>
          </View>

          <Text style={styles.label}>Plan treningowy</Text>
          <View style={styles.infoCard}>
            <Text style={styles.planName}>{entry.planName}</Text>
            {plan ? (
              <Text style={styles.planLevel}>
                Poziom:{" "}
                {getPlanLevels(plan, exercisesData, sequences).join(" · ") ||
                  "—"}
              </Text>
            ) : null}
            <TouchableOpacity
              style={styles.planLink}
              onPress={() => router.push(`/plan/${entry.planId}`)}
              accessibilityRole="link"
            >
              <Text style={styles.planLinkText}>Zobacz plan</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
            {planError ? <Text style={styles.error}>{planError}</Text> : null}
            {plan ? (
              <View style={styles.planDetails}>
                <Text style={styles.planDescriptionTitle}>Opis planu</Text>
                <Text
                  style={[
                    styles.planDescription,
                    !plan.description && styles.noDescription,
                  ]}
                >
                  {plan.description || "Plan nie ma opisu."}
                </Text>
                <Text style={styles.planDescriptionTitle}>Skład planu</Text>
                <View style={styles.planContent}>
                  {plan.content.map((item, index) => {
                    if (item.type === "exercise") {
                      const exercise = exercisesData.find(
                        (candidate) => candidate.id === item.id,
                      );
                      return exercise ? (
                        <ExerciseCard
                          key={`exercise:${item.id}:${index}`}
                          exercise={exercise}
                          onPress={() =>
                            router.push(`/exercise/${exercise.id}`)
                          }
                        />
                      ) : null;
                    }

                    const sequence = sequences.find(
                      (candidate) => candidate.id === item.id,
                    );
                    if (!sequence) return null;
                    const expanded = expandedSequenceIds.has(sequence.id);
                    return (
                      <SequenceContentCard
                        key={`sequence:${sequence.id}:${index}`}
                        sequence={sequence}
                        exercises={exercisesData}
                        expanded={expanded}
                        onToggle={() =>
                          setExpandedSequenceIds((current) => {
                            const next = new Set(current);
                            if (next.has(sequence.id)) next.delete(sequence.id);
                            else next.add(sequence.id);
                            return next;
                          })
                        }
                        onExercisePress={(exercise) =>
                          router.push(`/exercise/${exercise.id}`)
                        }
                        onSequencePress={() =>
                          router.push(`/sequence/${sequence.id}`)
                        }
                      />
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error || "Wczytywanie treningu…"}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (Colors: AppColors) =>
  StyleSheet.create({
    header: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      gap: Spacing.md,
      backgroundColor: Colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    headerTitle: {
      flex: 1,
      color: Colors.textPrimary,
      fontSize: 18,
      fontWeight: "600",
    },
    deleteButton: {
      width: 40,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: Spacing.md,
      paddingBottom: Spacing.xl,
    },
    dateCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.cardBackground,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    dateIcon: {
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: Colors.selectedBackground,
      borderRadius: BorderRadius.sm,
      marginRight: Spacing.md,
    },
    dateInfo: { flex: 1 },
    dateText: {
      color: Colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    timeText: {
      color: Colors.primary,
      fontSize: 15,
      fontWeight: "700",
      marginTop: Spacing.xs,
    },
    label: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
      marginTop: Spacing.lg,
      marginBottom: Spacing.xs,
    },
    infoCard: {
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.cardBackground,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    planName: {
      color: Colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    planLevel: {
      color: Colors.primary,
      fontSize: 13,
      fontWeight: "600",
      marginTop: Spacing.xs,
    },
    planLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      marginTop: Spacing.md,
    },
    planLinkText: {
      color: Colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    planDetails: {
      borderTopWidth: 1,
      borderTopColor: Colors.border,
      marginTop: Spacing.md,
      paddingTop: Spacing.md,
    },
    planDescriptionTitle: {
      color: Colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    planDescription: {
      color: Colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
    },
    planContent: {
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    description: {
      color: Colors.textPrimary,
      fontSize: 15,
      lineHeight: 22,
    },
    noDescription: { color: Colors.textSecondary },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: Spacing.lg,
    },
    error: {
      color: Colors.danger,
      fontSize: 14,
      textAlign: "center",
    },
  });
