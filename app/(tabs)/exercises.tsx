import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Spacing, BorderRadius, type AppColors } from "../../constants/colors";
import { useAppTheme } from "../../constants/useAppTheme";
import type { Exercise } from "../../constants/exercises";
import bodyAreas from "../../data/bodyAreas.json";
import exerciseLevels from "../../data/exerciseLevels.json";
import exercisePositions from "../../data/exercisePositions.json";
import { useFavorites } from "../../constants/useFavorites";
import { FavoriteButton } from "../../components/FavoriteButton";
import { ExerciseCard } from "../../components/ExerciseCard";
import { Ionicons } from "@expo/vector-icons";
import { sortFavoritesByName } from "../../constants/sorting";
import { useExercises } from "../../constants/useExercises";
import { formatPolishCount } from "../../constants/formatting";

type Filters = {
  category: string | null;
  position: string | null;
  level: string | null;
};

const emptyFilters: Filters = { category: null, position: null, level: null };

function getFilteredExercises(
  filters: Filters,
  search: string,
  isFavorite: (id: string) => boolean,
  favoritesOnly: boolean,
  exercises: Exercise[],
) {
  const query = search.trim().toLocaleLowerCase();
  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch =
      !query ||
      exercise.name.toLocaleLowerCase().includes(query) ||
      exercise.bodyAreas.some((area) =>
        area.toLocaleLowerCase().includes(query),
      ) ||
      exercise.position?.toLocaleLowerCase().includes(query);
    const matchesCategory =
      filters.category === null ||
      exercise.bodyAreas.includes(filters.category);
    const matchesPosition =
      filters.position === null || exercise.position === filters.position;
    const matchesLevel =
      filters.level === null || exercise.level === filters.level;
    const matchesFavorite = !favoritesOnly || isFavorite(exercise.id);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesPosition &&
      matchesLevel &&
      matchesFavorite
    );
  });
  return sortFavoritesByName(
    filteredExercises,
    (exercise) => isFavorite(exercise.id),
    (exercise) => exercise.name,
  );
}

export default function ExercisesScreen() {
  const { colors, globalStyles } = useAppTheme();
  const { exercises } = useExercises();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [draftFilters, setDraftFilters] = useState<Filters>(emptyFilters);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const {
    isFavorite: hasFavorite,
    toggle: toggleFavorite,
    error: favoritesError,
  } = useFavorites();

  const filteredExercises = useMemo(
    () =>
      getFilteredExercises(
        filters,
        search,
        (id) => hasFavorite("exercise", id),
        favoritesOnly,
        exercises,
      ),
    [exercises, favoritesOnly, filters, hasFavorite, search],
  );
  const draftResultsCount = useMemo(
    () =>
      getFilteredExercises(
        draftFilters,
        search,
        (id) => hasFavorite("exercise", id),
        favoritesOnly,
        exercises,
      ).length,
    [draftFilters, exercises, favoritesOnly, hasFavorite, search],
  );

  const openFilters = () => {
    setDraftFilters({
      category: filters.category,
      position: filters.position,
      level: filters.level,
    });
    setFiltersVisible(true);
  };

  const renderItem = ({ item }: { item: Exercise }) => (
    <ExerciseCard
      exercise={item}
      onPress={() => router.push(`/exercise/${item.id}`)}
      activeOpacity={0.7}
      trailing={
        <FavoriteButton
          favorite={hasFavorite("exercise", item.id)}
          label={item.name}
          onPress={() => void toggleFavorite("exercise", item.id)}
        />
      }
    />
  );

  const activeFilterCount =
    (filters.category === null ? 0 : 1) +
    (filters.position === null ? 0 : 1) +
    (filters.level === null ? 0 : 1);

  return (
    <View style={globalStyles.container}>
      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Szukaj ćwiczenia"
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Szukaj ćwiczenia"
          />
          <TouchableOpacity
            style={[
              styles.favoriteIconButton,
              favoritesOnly && styles.favoriteIconButtonSelected,
            ]}
            onPress={() => setFavoritesOnly((current) => !current)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: favoritesOnly }}
            accessibilityLabel={
              favoritesOnly
                ? "Pokaż wszystkie ćwiczenia"
                : "Pokaż ulubione ćwiczenia"
            }
          >
            <Ionicons
              name={favoritesOnly ? "heart" : "heart-outline"}
              size={22}
              color={favoritesOnly ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilterCount > 0 && styles.filterButtonActive,
            ]}
            onPress={openFilters}
            accessibilityRole="button"
            accessibilityLabel={`Filtry${activeFilterCount ? `, aktywne: ${activeFilterCount}` : ""}`}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilterCount > 0 && styles.filterButtonTextActive,
              ]}
            >
              Filtry{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
            </Text>
          </TouchableOpacity>
        </View>
        {favoritesError ? (
          <Text style={styles.filterError}>{favoritesError}</Text>
        ) : null}

        {activeFilterCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFilters}
          >
            {filters.category !== null && (
              <TouchableOpacity
                key={`category-${filters.category}`}
                style={styles.activeChip}
                onPress={() =>
                  setFilters((current) => ({ ...current, category: null }))
                }
                accessibilityRole="button"
                accessibilityLabel={`Usuń filtr kategorii ${filters.category}`}
              >
                <Text style={styles.activeChipText}>{filters.category} ×</Text>
              </TouchableOpacity>
            )}
            {filters.position !== null && (
              <TouchableOpacity
                style={styles.activeChip}
                onPress={() =>
                  setFilters((current) => ({ ...current, position: null }))
                }
                accessibilityRole="button"
                accessibilityLabel={`Usuń filtr pozycji ${filters.position}`}
              >
                <Text style={styles.activeChipText}>
                  Pozycja: {filters.position} ×
                </Text>
              </TouchableOpacity>
            )}
            {filters.level !== null && (
              <TouchableOpacity
                style={styles.activeChip}
                onPress={() =>
                  setFilters((current) => ({ ...current, level: null }))
                }
                accessibilityRole="button"
                accessibilityLabel={`Usuń filtr poziomu ${filters.level}`}
              >
                <Text style={styles.activeChipText}>{filters.level} ×</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
        <Text style={styles.resultCount}>
          {formatPolishCount(
            filteredExercises.length,
            "ćwiczenie",
            "ćwiczenia",
            "ćwiczeń",
          )}
        </Text>
      </View>

      <FlatList
        data={filteredExercises}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          globalStyles.listContainer,
          filteredExercises.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Brak pasujących ćwiczeń</Text>
            <Text style={styles.emptyDescription}>
              Zmień wyszukiwanie lub usuń część filtrów.
            </Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
      />

      <Modal
        visible={filtersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setFiltersVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Zamknij filtry"
          />
          <View style={styles.filterSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Filtry</Text>
                <Text style={styles.sheetSubtitle}>
                  Dopasuj ćwiczenia do swojego treningu
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setFiltersVisible(false)}
                accessibilityRole="button"
              >
                <Text style={styles.closeButton}>Zamknij</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionTitle}>Poziom</Text>
              <Text style={styles.sectionHint}>Poziom trudności ćwiczenia</Text>
              <View style={styles.options}>
                {exerciseLevels.map((level) => {
                  const selected = draftFilters.level === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() =>
                        setDraftFilters((current) => ({
                          ...current,
                          level: selected ? null : level,
                        }))
                      }
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>Pozycja</Text>
              <Text style={styles.sectionHint}>
                Pozycja ciała podczas ćwiczenia
              </Text>
              <View style={styles.options}>
                {exercisePositions.map((position) => {
                  const selected = draftFilters.position === position;
                  return (
                    <TouchableOpacity
                      key={position}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() =>
                        setDraftFilters((current) => ({
                          ...current,
                          position: selected ? null : position,
                        }))
                      }
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {position}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>Partia ciała</Text>
              <Text style={styles.sectionHint}>
                Wybierz jedną partię ciała lub pozostaw bez filtra
              </Text>
              <View style={styles.options}>
                {bodyAreas.map((category) => {
                  const selected = draftFilters.category === category;
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() =>
                        setDraftFilters((current) => ({
                          ...current,
                          category:
                            current.category === category ? null : category,
                        }))
                      }
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setDraftFilters(emptyFilters)}
                accessibilityRole="button"
              >
                <Text style={styles.clearButtonText}>Wyczyść</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setFilters(draftFilters);
                  setFiltersVisible(false);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.applyButtonText}>
                  Pokaż{" "}
                  {formatPolishCount(
                    draftResultsCount,
                    "ćwiczenie",
                    "ćwiczenia",
                    "ćwiczeń",
                  )}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (Colors: AppColors) =>
  StyleSheet.create({
    controls: {
      backgroundColor: Colors.cardBackground,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      height: 44,
      backgroundColor: Colors.background,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      color: Colors.textPrimary,
      fontSize: 14,
    },
    favoriteIconButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.background,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    favoriteIconButtonSelected: {
      backgroundColor: Colors.selectedBackground,
      borderColor: Colors.primary,
    },
    filterButton: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.background,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    filterButtonActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    filterButtonText: {
      color: Colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    filterButtonTextActive: {
      color: Colors.white,
    },
    filterError: { color: Colors.danger, fontSize: 12, marginTop: Spacing.xs },
    activeFilters: {
      gap: Spacing.xs,
      paddingTop: Spacing.sm,
    },
    activeChip: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.lg,
      backgroundColor: Colors.selectedBackground,
    },
    activeChipText: {
      color: Colors.primaryDark,
      fontSize: 12,
      fontWeight: "600",
    },
    resultCount: {
      color: Colors.textSecondary,
      fontSize: 12,
      marginTop: Spacing.sm,
    },
    emptyList: {
      flexGrow: 1,
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: Spacing.lg,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: Colors.textPrimary,
      textAlign: "center",
    },
    emptyDescription: {
      fontSize: 14,
      color: Colors.textSecondary,
      textAlign: "center",
      marginTop: Spacing.xs,
    },
    modalRoot: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0, 0, 0, 0.35)",
    },
    backdrop: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    filterSheet: {
      maxHeight: "88%",
      backgroundColor: Colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: Colors.border,
      marginBottom: Spacing.md,
    },
    sheetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    sheetTitle: {
      color: Colors.textPrimary,
      fontSize: 20,
      fontWeight: "700",
    },
    sheetSubtitle: {
      color: Colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    closeButton: {
      color: Colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    sheetScroll: {
      flexShrink: 1,
    },
    sheetContent: {
      padding: Spacing.md,
      paddingBottom: Spacing.lg,
    },
    sectionTitle: {
      color: Colors.textPrimary,
      fontSize: 16,
      fontWeight: "600",
      marginTop: Spacing.md,
    },
    sectionHint: {
      color: Colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
      marginBottom: Spacing.sm,
    },
    options: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.sm,
    },
    option: {
      minHeight: 38,
      justifyContent: "center",
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      backgroundColor: Colors.background,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    optionSelected: {
      backgroundColor: Colors.selectedBackground,
      borderColor: Colors.primary,
    },
    optionText: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: "500",
    },
    optionTextSelected: {
      color: Colors.primaryDark,
      fontWeight: "600",
    },
    sheetFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
    clearButton: {
      minHeight: 48,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    clearButtonText: {
      color: Colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
    },
    applyButton: {
      flex: 1,
      minHeight: 48,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.primary,
    },
    applyButtonText: {
      color: Colors.white,
      fontSize: 14,
      fontWeight: "600",
    },
  });
