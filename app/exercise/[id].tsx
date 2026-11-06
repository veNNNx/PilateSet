import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type { Exercise } from "../../constants/exercises";
import { loadPlans, type Plan } from "../../constants/planStorage";
import { getPlanExerciseIds } from "../../constants/planLevels";
import { loadSequences, type Sequence } from "../../constants/sequenceStorage";
import { getExerciseImage } from "../../constants/exerciseImages";
import { navigateBack } from "../../constants/navigation";
import { Ionicons } from "@expo/vector-icons";
import { type AppColors } from "../../constants/colors";
import { useAppTheme } from "../../constants/useAppTheme";
import { useExerciseImagePreference } from "../../constants/exerciseImagePreference";
import {
  formatBodyAreas,
  formatExercisePosition,
} from "../../constants/taxonomy";
import {
  loadExerciseNotes,
  saveExerciseNote,
} from "../../constants/exerciseNotesStorage";
import { useFavorites } from "../../constants/useFavorites";
import { FavoriteButton } from "../../components/FavoriteButton";
import { sortFavoritesByName } from "../../constants/sorting";
import { useExercises } from "../../constants/useExercises";
import bodyAreas from "../../data/bodyAreas.json";
import exerciseLevels from "../../data/exerciseLevels.json";
import exercisePositions from "../../data/exercisePositions.json";

type ExerciseDraft = Pick<
  Exercise,
  | "name"
  | "sets"
  | "load"
  | "startingPosition"
  | "movementSequence"
  | "modifications"
  | "bodyAreas"
  | "level"
  | "position"
>;

export default function ExerciseDetailScreen() {
  const { colors, globalStyles } = useAppTheme();
  const { showExerciseImages } = useExerciseImagePreference();
  const { exercises, error: exercisesError, updateExercise } = useExercises();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [isPlansExpanded, setIsPlansExpanded] = useState(false);
  const [isSequencesExpanded, setIsSequencesExpanded] = useState(false);
  const [relatedPlans, setRelatedPlans] = useState<Plan[]>([]);
  const [relatedSequences, setRelatedSequences] = useState<Sequence[]>([]);
  const [plansError, setPlansError] = useState("");
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [draft, setDraft] = useState<ExerciseDraft | null>(null);
  const [savingExercise, setSavingExercise] = useState(false);
  const [exerciseError, setExerciseError] = useState("");
  const {
    isFavorite,
    toggle: toggleFavorite,
    error: favoritesError,
  } = useFavorites();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      Promise.all([loadPlans(), loadSequences()])
        .then(([plans, sequences]) => {
          if (isActive) {
            setRelatedPlans(
              sortFavoritesByName(
                plans.filter((plan) =>
                  getPlanExerciseIds(plan, sequences).includes(String(id)),
                ),
                (plan) => isFavorite("plan", plan.id),
                (plan) => plan.name,
              ),
            );
            setRelatedSequences(
              sortFavoritesByName(
                sequences.filter((sequence) =>
                  sequence.exerciseIds.includes(String(id)),
                ),
                (sequence) => isFavorite("sequence", sequence.id),
                (sequence) => sequence.name,
              ),
            );
            setPlansError("");
          }
        })
        .catch((loadError: unknown) => {
          if (isActive) {
            setPlansError(
              loadError instanceof Error
                ? loadError.message
                : "Nie udało się wczytać planów.",
            );
          }
        });
      loadExerciseNotes()
        .then((notes) => {
          if (!isActive) return;
          const currentNote =
            notes.find((item) => item.exerciseId === String(id))?.note ?? "";
          setNote(currentNote);
          setSavedNote(currentNote);
          setNoteError("");
        })
        .catch((loadError: unknown) => {
          if (isActive) {
            setNoteError(
              loadError instanceof Error
                ? loadError.message
                : "Nie udało się wczytać notatki.",
            );
          }
        });
      return () => {
        isActive = false;
      };
    }, [id, isFavorite]),
  );

  const exercise = exercises.find((item) => item.id === id);

  const startEditing = () => {
    if (!exercise) return;
    setDraft({
      name: exercise.name,
      sets: exercise.sets,
      load: exercise.load,
      startingPosition: exercise.startingPosition,
      movementSequence: exercise.movementSequence,
      modifications: exercise.modifications,
      bodyAreas: [...exercise.bodyAreas],
      level: exercise.level,
      position: exercise.position ?? null,
    });
    setExerciseError("");
  };

  const saveExerciseEdits = async () => {
    if (!exercise || !draft) return;
    const name = draft.name.trim();
    if (!name) {
      setExerciseError("Nazwa ćwiczenia nie może być pusta.");
      return;
    }

    setSavingExercise(true);
    setExerciseError("");
    try {
      await updateExercise({
        ...exercise,
        ...draft,
        name,
        sets: draft.sets.trim(),
        load: draft.load.trim(),
        startingPosition: draft.startingPosition.trim(),
        movementSequence: draft.movementSequence.trim(),
        modifications: draft.modifications.trim(),
        bodyAreas: [...draft.bodyAreas],
      });
      setDraft(null);
    } catch (saveError) {
      setExerciseError(
        saveError instanceof Error
          ? saveError.message
          : "Nie udało się zapisać ćwiczenia.",
      );
    } finally {
      setSavingExercise(false);
    }
  };

  const renderDetail = (
    title: string,
    value: string,
    onChangeText: (nextValue: string) => void,
  ) => {
    if (!draft && !value.trim()) return null;
    return (
      <View style={styles.descriptionCard}>
        <Text style={styles.descriptionTitle}>{title}</Text>
        {draft ? (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={title}
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
            style={styles.exerciseInput}
            accessibilityLabel={title}
          />
        ) : (
          <Text style={styles.descriptionText}>{value}</Text>
        )}
      </View>
    );
  };

  const saveNote = async () => {
    if (!exercise) return;
    setSavingNote(true);
    setNoteError("");
    try {
      await saveExerciseNote(exercise.id, note);
      setSavedNote(note.trim());
      setNote(note.trim());
    } catch (saveError) {
      setNoteError(
        saveError instanceof Error
          ? saveError.message
          : "Nie udało się zapisać notatki.",
      );
    } finally {
      setSavingNote(false);
    }
  };

  if (!exercise) {
    return (
      <View style={[globalStyles.container, { paddingTop: insets.top }]}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity
            onPress={() => navigateBack("/exercises")}
            accessibilityRole="button"
            accessibilityLabel="Wróć"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navigationTitle}>Szczegóły ćwiczenia</Text>
        </View>
        <Text style={{ color: colors.textPrimary, padding: 16 }}>
          Nie znaleziono ćwiczenia.
        </Text>
      </View>
    );
  }

  return (
    <View style={[globalStyles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={globalStyles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.navigationHeader}>
          <TouchableOpacity
            onPress={() => navigateBack("/exercises")}
            accessibilityRole="button"
            accessibilityLabel="Wróć"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navigationTitle}>Szczegóły ćwiczenia</Text>
          <View style={styles.headerActions}>
            {!draft ? (
              <FavoriteButton
                favorite={isFavorite("exercise", exercise.id)}
                label={exercise.name}
                onPress={() => void toggleFavorite("exercise", exercise.id)}
              />
            ) : null}
            {draft ? (
              <>
                <TouchableOpacity
                  style={styles.headerActionButton}
                  onPress={() => {
                    setDraft(null);
                    setExerciseError("");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Anuluj edycję ćwiczenia"
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerActionButton}
                  onPress={() => void saveExerciseEdits()}
                  disabled={savingExercise}
                  accessibilityRole="button"
                  accessibilityLabel="Zapisz zmiany ćwiczenia"
                >
                  <Ionicons
                    name="checkmark"
                    size={24}
                    color={
                      savingExercise ? colors.textSecondary : colors.primary
                    }
                  />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={startEditing}
                accessibilityRole="button"
                accessibilityLabel="Edytuj ćwiczenie"
              >
                <Ionicons
                  name="create-outline"
                  size={22}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* 1. Tytuł i serie/powtórzenia w jednej linii */}
        <View style={styles.headerRow}>
          {draft ? (
            <TextInput
              value={draft.name}
              onChangeText={(name) =>
                setDraft((current) =>
                  current ? { ...current, name } : current,
                )
              }
              placeholder="Nazwa ćwiczenia"
              placeholderTextColor={colors.textSecondary}
              style={[styles.title, styles.titleInput]}
              accessibilityLabel="Nazwa ćwiczenia"
            />
          ) : (
            <Text style={styles.title}>{exercise.name}</Text>
          )}
          {draft ? (
            <TextInput
              value={draft.sets}
              onChangeText={(sets) =>
                setDraft((current) =>
                  current ? { ...current, sets } : current,
                )
              }
              placeholder="Serie"
              placeholderTextColor={colors.textSecondary}
              style={styles.setsInput}
              accessibilityLabel="Serie i powtórzenia"
            />
          ) : exercise.sets ? (
            <Text style={styles.setsText}>{exercise.sets}</Text>
          ) : null}
        </View>

        {draft ? (
          <View style={styles.editorFilters}>
            <Text style={styles.editorLabel}>Poziom</Text>
            <View style={styles.editorOptions}>
              {exerciseLevels.map((level) => {
                const selected = draft.level === level;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.editorChip,
                      selected && styles.editorChipSelected,
                    ]}
                    onPress={() =>
                      setDraft((current) =>
                        current ? { ...current, level } : current,
                      )
                    }
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.editorChipText,
                        selected && styles.editorChipTextSelected,
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.editorLabel}>Pozycja</Text>
            <View style={styles.editorOptions}>
              <TouchableOpacity
                style={[
                  styles.editorChip,
                  draft.position === null && styles.editorChipSelected,
                ]}
                onPress={() =>
                  setDraft((current) =>
                    current ? { ...current, position: null } : current,
                  )
                }
                accessibilityRole="radio"
                accessibilityState={{ selected: draft.position === null }}
              >
                <Text
                  style={[
                    styles.editorChipText,
                    draft.position === null && styles.editorChipTextSelected,
                  ]}
                >
                  Brak
                </Text>
              </TouchableOpacity>
              {exercisePositions.map((position) => {
                const selected = draft.position === position;
                return (
                  <TouchableOpacity
                    key={position}
                    style={[
                      styles.editorChip,
                      selected && styles.editorChipSelected,
                    ]}
                    onPress={() =>
                      setDraft((current) =>
                        current ? { ...current, position } : current,
                      )
                    }
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.editorChipText,
                        selected && styles.editorChipTextSelected,
                      ]}
                    >
                      {position}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.editorLabel}>Partie ciała</Text>
            <View style={styles.editorOptions}>
              {bodyAreas.map((area) => {
                const selected = draft.bodyAreas.includes(area);
                return (
                  <TouchableOpacity
                    key={area}
                    style={[
                      styles.editorChip,
                      selected && styles.editorChipSelected,
                    ]}
                    onPress={() =>
                      setDraft((current) => {
                        if (!current) return current;
                        return {
                          ...current,
                          bodyAreas: selected
                            ? current.bodyAreas.filter((item) => item !== area)
                            : [...current.bodyAreas, area],
                        };
                      })
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text
                      style={[
                        styles.editorChipText,
                        selected && styles.editorChipTextSelected,
                      ]}
                    >
                      {area}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.metaTags}>
              <Text style={styles.level}>{exercise.level}</Text>
              {formatExercisePosition(exercise.position) ? (
                <View style={styles.positionBadge}>
                  <Text style={styles.positionBadgeText}>
                    {formatExercisePosition(exercise.position)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.bodyAreas}>
              {formatBodyAreas(exercise.bodyAreas)}
            </Text>
          </>
        )}
        {favoritesError ? (
          <Text style={styles.noteError}>{favoritesError}</Text>
        ) : null}
        {exercisesError ? (
          <Text style={styles.noteError}>{exercisesError}</Text>
        ) : null}
        {exerciseError ? (
          <Text style={styles.noteError}>{exerciseError}</Text>
        ) : null}

        {renderDetail(
          "Pozycja wejściowa",
          draft?.startingPosition ?? exercise.startingPosition,
          (startingPosition) =>
            setDraft((current) =>
              current ? { ...current, startingPosition } : current,
            ),
        )}
        {renderDetail("Obciążenie", draft?.load ?? exercise.load, (load) =>
          setDraft((current) => (current ? { ...current, load } : current)),
        )}
        {renderDetail(
          "Sekwencja ruchu",
          draft?.movementSequence ?? exercise.movementSequence,
          (movementSequence) =>
            setDraft((current) =>
              current ? { ...current, movementSequence } : current,
            ),
        )}
        {renderDetail(
          "Modyfikacje",
          draft?.modifications ?? exercise.modifications,
          (modifications) =>
            setDraft((current) =>
              current ? { ...current, modifications } : current,
            ),
        )}

        <View style={styles.noteCard}>
          <View style={styles.noteHeading}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.noteTitle}>Moja notatka</Text>
          </View>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Dodaj własną wskazówkę do ćwiczenia"
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
            style={styles.noteInput}
            accessibilityLabel="Notatka do ćwiczenia"
          />
          {noteError ? <Text style={styles.noteError}>{noteError}</Text> : null}
          <View style={styles.noteFooter}>
            {note !== savedNote ? (
              <TouchableOpacity
                style={[
                  styles.noteSaveButton,
                  savingNote && styles.noteSaveButtonDisabled,
                ]}
                onPress={saveNote}
                disabled={savingNote}
                accessibilityRole="button"
                accessibilityLabel="Zapisz notatkę do ćwiczenia"
              >
                <Ionicons name="checkmark" size={16} color={colors.white} />
                <Text style={styles.noteSaveButtonText}>
                  {savingNote ? "Zapisywanie…" : "Zapisz"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.noteSavedStatus}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.noteSavedText}>Notatka aktualna</Text>
              </View>
            )}
          </View>
        </View>

        {/* 3. Zdjęcia */}
        {showExerciseImages ? (
          <View style={styles.imagesContainer}>
            {exercise.images.map((imgName, index) => {
              const imageSource = getExerciseImage(exercise.id, imgName);
              return (
                <Image
                  key={index}
                  source={imageSource}
                  style={styles.exerciseImage}
                  resizeMode="cover"
                  testID="exercise-detail-image"
                />
              );
            })}
          </View>
        ) : null}

        {/* 4. Zwijana sekcja: Dodane do planu */}
        {relatedPlans.length > 0 && (
          <View style={styles.plansSection}>
            <TouchableOpacity
              style={styles.plansHeader}
              onPress={() => setIsPlansExpanded(!isPlansExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.plansHeaderTitle}>
                Dodane do planu ({relatedPlans.length})
              </Text>
              <Ionicons
                name={isPlansExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {isPlansExpanded && (
              <View style={styles.plansList}>
                {relatedPlans.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    style={styles.planItem}
                    onPress={() => router.push(`/plan/${plan.id}`)}
                  >
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        {relatedSequences.length > 0 && (
          <View style={styles.plansSection}>
            <TouchableOpacity
              style={styles.plansHeader}
              onPress={() => setIsSequencesExpanded((expanded) => !expanded)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ expanded: isSequencesExpanded }}
            >
              <Text style={styles.plansHeaderTitle}>
                Dodane do sekwencji ({relatedSequences.length})
              </Text>
              <Ionicons
                name={isSequencesExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {isSequencesExpanded ? (
              <View style={styles.plansList}>
                {relatedSequences.map((sequence) => (
                  <TouchableOpacity
                    key={sequence.id}
                    style={styles.planItem}
                    onPress={() => router.push(`/sequence/${sequence.id}`)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.planName}>{sequence.name}</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        )}
        {plansError ? (
          <Text style={styles.plansError}>{plansError}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    navigationHeader: {
      height: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 12,
    },
    navigationTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "600",
      flex: 1,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerActionButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 4,
    },
    metaTags: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8,
    },
    level: {
      color: colors.primaryDark,
      backgroundColor: colors.selectedBackground,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 4,
      fontSize: 12,
      fontWeight: "600",
      overflow: "hidden",
    },
    bodyAreas: {
      fontSize: 14,
      color: colors.textSecondary,
      flexShrink: 1,
      marginBottom: 16,
    },
    positionBadge: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    positionBadgeText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    titleInput: {
      minHeight: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    setsText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
    },
    setsInput: {
      minWidth: 70,
      maxWidth: 110,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 8,
      paddingVertical: 6,
      color: colors.textPrimary,
    },
    editorFilters: {
      gap: 8,
      marginBottom: 16,
    },
    editorLabel: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      marginTop: 4,
    },
    editorOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 4,
    },
    editorChip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    editorChipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.selectedBackground,
    },
    editorChipText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    editorChipTextSelected: {
      color: colors.primaryDark,
      fontWeight: "600",
    },
    descriptionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    descriptionTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 8,
    },
    descriptionText: {
      color: colors.textPrimary,
      fontSize: 15,
      lineHeight: 23,
    },
    exerciseInput: {
      minHeight: 92,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.background,
      padding: 12,
      color: colors.textPrimary,
      fontSize: 15,
      lineHeight: 23,
    },
    noteCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 24,
    },
    noteHeading: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    noteTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
    noteInput: {
      minHeight: 88,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.background,
      padding: 12,
      color: colors.textPrimary,
    },
    noteSaveButton: {
      minHeight: 40,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingHorizontal: 16,
      gap: 6,
    },
    noteSaveButtonDisabled: { opacity: 0.6 },
    noteSaveButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "600",
    },
    noteFooter: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 10,
    },
    noteSavedStatus: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    noteSavedText: { color: colors.textSecondary, fontSize: 13 },
    noteError: { color: colors.danger, fontSize: 13, marginTop: 8 },
    imagesContainer: {
      gap: 16,
      marginBottom: 24,
    },
    exerciseImage: {
      width: "100%",
      height: 220,
      borderRadius: 12,
      backgroundColor: colors.border,
    },
    plansSection: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 16,
    },
    plansError: {
      fontSize: 13,
      color: colors.danger,
      marginTop: 12,
    },
    plansHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
    },
    plansHeaderTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    plansList: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 8,
    },
    planItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 8,
    },
    planName: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: "500",
    },
  });
