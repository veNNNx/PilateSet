import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Spacing, type AppColors } from "../constants/colors";
import { useAppTheme } from "../constants/useAppTheme";
import type { Exercise } from "../constants/exercises";
import type { PlanContentItem } from "../constants/planStorage";
import type { Sequence } from "../constants/sequenceStorage";
import { useFavorites } from "../constants/useFavorites";
import { ExerciseCard } from "./ExerciseCard";
import { FavoriteIndicator } from "./FavoriteIndicator";
import { SequenceCard } from "./SequenceCard";
import { sortFavoritesByName } from "../constants/sorting";
import exerciseLevels from "../data/exerciseLevels.json";
import exercisePositions from "../data/exercisePositions.json";

type PlanContentPickerProps = {
  visible: boolean;
  type: PlanContentItem["type"];
  owner?: "plan" | "sequence";
  exercises: Exercise[];
  sequences: Sequence[];
  content: PlanContentItem[];
  onToggle: (item: PlanContentItem) => void;
  onClose: () => void;
};

type PickerItem =
  | { type: "exercise"; exercise: Exercise }
  | { type: "sequence"; sequence: Sequence };

export function PlanContentPicker({
  visible,
  type,
  owner = "plan",
  exercises,
  sequences,
  content,
  onToggle,
  onClose,
}: PlanContentPickerProps) {
  const { colors: Colors } = useAppTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { isFavorite, error: favoritesError } = useFavorites();
  const ownerLabel = owner === "plan" ? "planu" : "sekwencji";
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const selectedIds = useMemo(
    () =>
      new Set(
        content.filter((item) => item.type === type).map((item) => item.id),
      ),
    [content, type],
  );
  const visibleExercises = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matching = exercises.filter(
      (exercise) =>
        (!query ||
          exercise.name.toLocaleLowerCase().includes(query) ||
          exercise.bodyAreas.some((area) =>
            area.toLocaleLowerCase().includes(query),
          ) ||
          exercise.position?.toLocaleLowerCase().includes(query)) &&
        (level === null || exercise.level === level) &&
        (position === null || exercise.position === position) &&
        (!favoritesOnly ||
          selectedIds.has(exercise.id) ||
          isFavorite("exercise", exercise.id)),
    );
    const selected = matching.filter((exercise) =>
      selectedIds.has(exercise.id),
    );
    const orderedSelected = [...selected].sort(
      (a, b) =>
        content.findIndex((item) => item.type === type && item.id === a.id) -
        content.findIndex((item) => item.type === type && item.id === b.id),
    );
    const others = sortFavoritesByName(
      matching.filter((exercise) => !selectedIds.has(exercise.id)),
      (exercise) => isFavorite("exercise", exercise.id),
      (exercise) => exercise.name,
    );
    return [...orderedSelected, ...others];
  }, [
    content,
    exercises,
    favoritesOnly,
    isFavorite,
    level,
    position,
    selectedIds,
    type,
    search,
  ]);
  const visibleSequences = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matching = sequences.filter(
      (sequence) =>
        (!query || sequence.name.toLocaleLowerCase().includes(query)) &&
        (level === null ||
          sequence.exerciseIds.some(
            (id) =>
              exercises.find((exercise) => exercise.id === id)?.level === level,
          )) &&
        (!favoritesOnly ||
          selectedIds.has(sequence.id) ||
          isFavorite("sequence", sequence.id)),
    );
    const selected = matching.filter((sequence) =>
      selectedIds.has(sequence.id),
    );
    const orderedSelected = [...selected].sort(
      (a, b) =>
        content.findIndex((item) => item.type === type && item.id === a.id) -
        content.findIndex((item) => item.type === type && item.id === b.id),
    );
    const others = sortFavoritesByName(
      matching.filter((sequence) => !selectedIds.has(sequence.id)),
      (sequence) => isFavorite("sequence", sequence.id),
      (sequence) => sequence.name,
    );
    return [...orderedSelected, ...others];
  }, [
    content,
    exercises,
    favoritesOnly,
    isFavorite,
    level,
    search,
    selectedIds,
    sequences,
    type,
  ]);

  const toggle = (id: string) => onToggle({ type, id });
  const data: PickerItem[] =
    type === "exercise"
      ? visibleExercises.map((exercise) => ({ type: "exercise", exercise }))
      : visibleSequences.map((sequence) => ({ type: "sequence", sequence }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Zamknij wybór"
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                Dodaj {type === "exercise" ? "ćwiczenia" : "sekwencje"}
              </Text>
              <Text style={styles.subtitle}>
                {selectedIds.size} wybranych · {data.length} widocznych
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Zamknij"
            >
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={
                type === "exercise"
                  ? "Szukaj po nazwie lub partii"
                  : "Szukaj sekwencji po nazwie"
              }
              placeholderTextColor={Colors.textSecondary}
              style={styles.searchInput}
              accessibilityLabel={
                type === "exercise"
                  ? `Szukaj ćwiczenia do ${ownerLabel}`
                  : `Szukaj sekwencji do ${ownerLabel}`
              }
            />
            <TouchableOpacity
              style={[
                styles.favoriteButton,
                favoritesOnly && styles.favoriteButtonSelected,
              ]}
              onPress={() => setFavoritesOnly((current) => !current)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: favoritesOnly }}
              accessibilityLabel={
                favoritesOnly ? "Pokaż wszystkie" : "Pokaż ulubione"
              }
            >
              <Ionicons
                name={favoritesOnly ? "heart" : "heart-outline"}
                size={22}
                color={favoritesOnly ? Colors.primary : Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {favoritesError ? (
            <Text style={styles.error}>{favoritesError}</Text>
          ) : null}
          <Text style={styles.filterLabel}>Poziom</Text>
          <View style={styles.filters}>
            {[null, ...exerciseLevels].map((itemLevel) => {
              const isSelected = level === itemLevel;
              return (
                <TouchableOpacity
                  key={itemLevel ?? "all"}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setLevel(isSelected ? null : itemLevel)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {itemLevel ?? "Każdy"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {type === "exercise" ? (
            <>
              <Text style={styles.filterLabel}>Pozycja</Text>
              <View style={styles.filters}>
                {[null, ...exercisePositions].map((itemPosition) => {
                  const isSelected = position === itemPosition;
                  return (
                    <TouchableOpacity
                      key={itemPosition ?? "all"}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() =>
                        setPosition(isSelected ? null : itemPosition)
                      }
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {itemPosition ?? "Dowolna"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}
          <FlatList
            data={data}
            keyExtractor={(item) =>
              item.type === "exercise" ? item.exercise.id : item.sequence.id
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              if (item.type === "exercise") {
                const { exercise } = item;
                const selected = selectedIds.has(exercise.id);
                return (
                  <ExerciseCard
                    exercise={exercise}
                    onPress={() => toggle(exercise.id)}
                    accessibilityLabel={`${selected ? "Usuń" : "Dodaj"} ${exercise.name} ${selected ? "z" : "do"} ${ownerLabel}`}
                    selected={selected === true}
                    style={styles.exerciseCard}
                    trailing={
                      <>
                        <FavoriteIndicator
                          favorite={isFavorite("exercise", exercise.id)}
                          label={exercise.name}
                        />
                        <Ionicons
                          name={
                            selected ? "checkmark-circle" : "add-circle-outline"
                          }
                          size={24}
                          color={
                            selected ? Colors.primary : Colors.textSecondary
                          }
                        />
                      </>
                    }
                  />
                );
              }
              const { sequence } = item;
              const selected = selectedIds.has(sequence.id);
              return (
                <SequenceCard
                  sequence={sequence}
                  exercises={exercises}
                  onPress={() => toggle(sequence.id)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${selected ? "Usuń" : "Dodaj"} sekwencję ${sequence.name}`}
                  selected={selected}
                  descriptionFallback={`${sequence.exerciseIds.length} ćwiczeń`}
                  trailing={
                    <>
                      <FavoriteIndicator
                        favorite={isFavorite("sequence", sequence.id)}
                        label={sequence.name}
                      />
                      <Ionicons
                        name={
                          selected ? "checkmark-circle" : "add-circle-outline"
                        }
                        size={24}
                        color={selected ? Colors.primary : Colors.textSecondary}
                      />
                    </>
                  }
                />
              );
            }}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {data.length === 0 &&
                (type === "sequence"
                  ? sequences.length === 0
                  : exercises.length === 0)
                  ? `Nie masz jeszcze ${type === "exercise" ? "ćwiczeń" : "sekwencji"}.`
                  : `Brak ${type === "exercise" ? "ćwiczeń" : "sekwencji"} spełniających filtry.`}
              </Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (Colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end" },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      height: "92%",
      backgroundColor: Colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: Spacing.md,
    },
    title: { color: Colors.textPrimary, fontSize: 18, fontWeight: "700" },
    subtitle: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
    searchRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
    searchInput: {
      flex: 1,
      minHeight: 44,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.cardBackground,
      paddingHorizontal: Spacing.md,
      color: Colors.textPrimary,
    },
    favoriteButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.cardBackground,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    favoriteButtonSelected: {
      backgroundColor: Colors.selectedBackground,
      borderColor: Colors.primary,
    },
    filterLabel: {
      color: Colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    filters: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.xs,
      paddingBottom: Spacing.xs,
    },
    chip: {
      minHeight: 34,
      justifyContent: "center",
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.cardBackground,
    },
    chipSelected: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "500" },
    chipTextSelected: { color: Colors.white },
    error: { color: Colors.danger, fontSize: 13, marginTop: Spacing.xs },
    list: { paddingTop: Spacing.md, paddingBottom: Spacing.xl },
    empty: { color: Colors.textSecondary, marginBottom: Spacing.md },
    exerciseCard: { marginTop: 0, marginBottom: Spacing.sm },
  });
