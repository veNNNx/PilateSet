import React, { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FavoriteButton } from "../../components/FavoriteButton";
import { SequenceCard } from "../../components/SequenceCard";
import { BorderRadius, Spacing, type AppColors } from "../../constants/colors";
import { loadSequences, type Sequence } from "../../constants/sequenceStorage";
import { getSequenceLevels } from "../../constants/planLevels";
import { sortFavoritesByName } from "../../constants/sorting";
import { useAppTheme } from "../../constants/useAppTheme";
import { useFavorites } from "../../constants/useFavorites";
import exerciseLevels from "../../data/exerciseLevels.json";
import { useExercises } from "../../constants/useExercises";
import { formatPolishCount } from "../../constants/formatting";
import { ScreenMessage } from "../../components/ScreenMessage";

export default function SequencesScreen() {
  const { colors, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { exercises } = useExercises();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [draftLevelFilter, setDraftLevelFilter] = useState<string | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const { isFavorite, toggle, error: favoritesError } = useFavorites();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      loadSequences()
        .then((loaded) => {
          if (!active) return;
          setSequences(loaded);
          setError("");
        })
        .catch((loadError: unknown) => {
          if (active)
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Nie udało się wczytać sekwencji.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const visibleSequences = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matching = sequences.filter((sequence) => {
      const matchesFavorite =
        !favoritesOnly || isFavorite("sequence", sequence.id);
      const matchesSearch =
        !query ||
        sequence.name.toLocaleLowerCase().includes(query) ||
        sequence.description.toLocaleLowerCase().includes(query);
      const matchesLevel =
        levelFilter === null ||
        getSequenceLevels(sequence, exercises).includes(levelFilter);
      return matchesFavorite && matchesSearch && matchesLevel;
    });
    return sortFavoritesByName(
      matching,
      (sequence) => isFavorite("sequence", sequence.id),
      (sequence) => sequence.name,
    );
  }, [exercises, favoritesOnly, isFavorite, levelFilter, search, sequences]);
  const activeFilterCount = levelFilter === null ? 0 : 1;
  const openFilters = () => {
    setDraftLevelFilter(levelFilter);
    setFiltersVisible(true);
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Szukaj sekwencji"
            placeholderTextColor={colors.textSecondary}
            style={styles.search}
            returnKeyType="search"
            accessibilityLabel="Szukaj sekwencji"
          />
          <TouchableOpacity
            style={[
              styles.favoriteFilter,
              favoritesOnly && styles.favoriteFilterSelected,
            ]}
            onPress={() => setFavoritesOnly((current) => !current)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: favoritesOnly }}
            accessibilityLabel={
              favoritesOnly
                ? "Pokaż wszystkie sekwencje"
                : "Pokaż ulubione sekwencje"
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
        {levelFilter ? (
          <TouchableOpacity
            style={styles.activeChip}
            onPress={() => setLevelFilter(null)}
          >
            <Text style={styles.activeChipText}>Poziom: {levelFilter} ×</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.resultCount}>
          {formatPolishCount(
            visibleSequences.length,
            "sekwencja",
            "sekwencje",
            "sekwencji",
          )}
        </Text>
      </View>
      {favoritesError ? (
        <Text style={styles.error}>{favoritesError}</Text>
      ) : null}
      {loading || error ? (
        <ScreenMessage
          message={error || "Wczytywanie sekwencji…"}
          error={Boolean(error)}
        />
      ) : (
        <FlatList
          data={visibleSequences}
          keyExtractor={(sequence) => sequence.id}
          contentContainerStyle={[
            globalStyles.listContainer,
            visibleSequences.length === 0 && styles.emptyList,
          ]}
          renderItem={({ item }) => (
            <SequenceCard
              sequence={item}
              exercises={exercises}
              onPress={() => router.push(`/sequence/${item.id}`)}
              countLabel={`Ćwiczenia: ${item.exerciseIds.length}${
                item.exerciseIds.some(
                  (id) => !exercises.some((exercise) => exercise.id === id),
                )
                  ? " · część niedostępna"
                  : ""
              }`}
              trailing={
                <FavoriteButton
                  favorite={isFavorite("sequence", item.id)}
                  label={item.name}
                  onPress={() => void toggle("sequence", item.id)}
                />
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {sequences.length === 0
                  ? "Nie masz jeszcze sekwencji."
                  : "Nie znaleziono sekwencji."}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/sequence/new")}
                style={styles.createButton}
              >
                <Text style={styles.createButtonText}>Utwórz sekwencję</Text>
              </TouchableOpacity>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
      <Modal
        visible={filtersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setFiltersVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Zamknij filtry"
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Filtry sekwencji</Text>
                <Text style={styles.sheetSubtitle}>
                  Wybierz poziom ćwiczeń w sekwencji
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setFiltersVisible(false)}
                accessibilityRole="button"
              >
                <Text style={styles.closeButton}>Zamknij</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <Text style={styles.sectionTitle}>Poziom</Text>
              <View style={styles.filterOptions}>
                {exerciseLevels.map((level) => {
                  const selected = draftLevelFilter === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.filterChip,
                        selected && styles.filterChipSelected,
                      ]}
                      onPress={() =>
                        setDraftLevelFilter(selected ? null : level)
                      }
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          selected && styles.filterChipTextSelected,
                        ]}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setDraftLevelFilter(null)}
                accessibilityRole="button"
              >
                <Text style={styles.clearButtonText}>Wyczyść</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setLevelFilter(draftLevelFilter);
                  setFiltersVisible(false);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.applyButtonText}>Pokaż sekwencje</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    controls: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
    search: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: Spacing.md,
      color: colors.textPrimary,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    favoriteFilter: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.background,
    },
    filterButton: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    filterButtonTextActive: { color: colors.white },
    activeChip: {
      alignSelf: "flex-start",
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      marginTop: Spacing.sm,
      borderRadius: BorderRadius.lg,
      backgroundColor: colors.selectedBackground,
    },
    activeChipText: {
      color: colors.primaryDark,
      fontSize: 12,
      fontWeight: "600",
    },
    resultCount: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: Spacing.sm,
    },
    favoriteFilterSelected: {
      backgroundColor: colors.selectedBackground,
      borderColor: colors.primary,
    },
    error: { color: colors.danger, padding: Spacing.md },
    sheetRoot: { flex: 1, justifyContent: "flex-end" },
    sheetBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      maxHeight: "80%",
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Spacing.lg,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sheetTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
    sheetSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
    closeButton: { color: colors.primary, fontSize: 14, fontWeight: "600" },
    sheetContent: { padding: Spacing.md },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
      marginBottom: Spacing.sm,
    },
    filterOptions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
    filterChip: {
      minHeight: 36,
      justifyContent: "center",
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    filterChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "500",
    },
    filterChipTextSelected: { color: colors.white },
    sheetFooter: {
      flexDirection: "row",
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    clearButton: {
      minHeight: 46,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clearButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    applyButton: {
      flex: 1,
      minHeight: 46,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.md,
    },
    applyButtonText: { color: colors.white, fontSize: 14, fontWeight: "700" },
    emptyList: { flexGrow: 1 },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.md,
      padding: Spacing.xl,
    },
    emptyText: { color: colors.textSecondary, textAlign: "center" },
    createButton: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
    },
    createButtonText: { color: colors.white, fontWeight: "600" },
  });
