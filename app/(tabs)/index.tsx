import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, BorderRadius, type AppColors } from "../../constants/colors";
import { useAppTheme } from "../../constants/useAppTheme";
import { loadPlans, type Plan } from "../../constants/planStorage";
import { loadSequences, type Sequence } from "../../constants/sequenceStorage";
import exerciseLevels from "../../data/exerciseLevels.json";
import { useFavorites } from "../../constants/useFavorites";
import { FavoriteButton } from "../../components/FavoriteButton";
import { getPlanExerciseIds, getPlanLevels } from "../../constants/planLevels";
import { sortFavoritesByName } from "../../constants/sorting";
import { useExercises } from "../../constants/useExercises";
import { formatPolishCount } from "../../constants/formatting";

export default function PlansScreen() {
  const {
    colors: Colors,
    globalStyles,
    typography: Typography,
  } = useAppTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [draftLevelFilter, setDraftLevelFilter] = useState<string | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const { isFavorite, toggle, error: favoritesError } = useFavorites();
  const { exercises } = useExercises();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setLoading(true);
      Promise.all([loadPlans(), loadSequences()])
        .then(([loadedPlans, loadedSequences]) => {
          if (!isActive) return;
          setPlans(loadedPlans);
          setSequences(loadedSequences);
          setError("");
        })
        .catch((loadError: unknown) => {
          if (!isActive) return;
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nie udało się wczytać planów.",
          );
        })
        .finally(() => {
          if (isActive) setLoading(false);
        });
      return () => {
        isActive = false;
      };
    }, []),
  );

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matchingPlans = plans.filter((plan) => {
      const matchesFavorite = !favoritesOnly || isFavorite("plan", plan.id);
      const matchesSearch =
        !query ||
        plan.name.toLocaleLowerCase().includes(query) ||
        plan.description.toLocaleLowerCase().includes(query);
      const matchesLevel =
        levelFilter === null ||
        getPlanLevels(plan, exercises, sequences).includes(levelFilter);
      return matchesFavorite && matchesSearch && matchesLevel;
    });
    return sortFavoritesByName(
      matchingPlans,
      (plan) => isFavorite("plan", plan.id),
      (plan) => plan.name,
    );
  }, [
    exercises,
    favoritesOnly,
    isFavorite,
    levelFilter,
    plans,
    search,
    sequences,
  ]);

  const openFilters = () => {
    setDraftLevelFilter(levelFilter);
    setFiltersVisible(true);
  };
  const activeFilterCount = levelFilter === null ? 0 : 1;
  const renderItem = ({ item }: { item: Plan }) => (
    <View style={styles.planCard}>
      <View style={styles.planTitleRow}>
        <TouchableOpacity
          style={styles.planTitleButton}
          activeOpacity={0.7}
          onPress={() => router.push(`/plan/${item.id}`)}
        >
          <View>
            <Text style={Typography.h2}>{item.name}</Text>
            <Text style={styles.planLevel}>
              {getPlanLevels(item, exercises, sequences).join(" · ") || "—"}
            </Text>
          </View>
        </TouchableOpacity>
        <FavoriteButton
          favorite={isFavorite("plan", item.id)}
          label={item.name}
          onPress={() => void toggle("plan", item.id)}
        />
      </View>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/plan/${item.id}`)}
      >
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      </TouchableOpacity>
      <View style={styles.planMeta}>
        <Text style={styles.exercisesCount} numberOfLines={1}>
          Ćwiczenia: {getPlanExerciseIds(item, sequences).length}
        </Text>
        {item.content.filter((content) => content.type === "sequence").length >
        0 ? (
          <Text style={styles.exercisesCount} numberOfLines={1}>
            Sekwencje:{" "}
            {
              item.content.filter((content) => content.type === "sequence")
                .length
            }
          </Text>
        ) : null}
      </View>
    </View>
  );

  const controls = (
    <View style={styles.controls}>
      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Szukaj planu"
          placeholderTextColor={Colors.textSecondary}
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="Szukaj planu"
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
            favoritesOnly ? "Pokaż wszystkie plany" : "Pokaż ulubione plany"
          }
        >
          <Ionicons
            name={favoritesOnly ? "heart" : "heart-outline"}
            size={22}
            color={favoritesOnly ? Colors.primary : Colors.textSecondary}
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
        <Text style={styles.error}>{favoritesError}</Text>
      ) : null}
      {levelFilter ? (
        <TouchableOpacity
          style={styles.activeChip}
          onPress={() => setLevelFilter(null)}
        >
          <Text style={styles.activeChipText}>Poziom: {levelFilter} ×</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={styles.resultCount}>
        {formatPolishCount(filteredPlans.length, "plan", "plany", "planów")}
      </Text>
    </View>
  );

  return (
    <View style={globalStyles.container}>
      {loading ? (
        <View style={styles.messageContainer}>
          <Text style={styles.message}>Wczytywanie planów…</Text>
        </View>
      ) : error ? (
        <View style={styles.messageContainer}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {controls}
          <FlatList
            data={filteredPlans}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              globalStyles.listContainer,
              filteredPlans.length === 0 && styles.emptyList,
            ]}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.message}>Nie znaleziono planów.</Text>
              </View>
            }
            keyboardShouldPersistTaps="handled"
          />
        </View>
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
                <Text style={styles.sheetTitle}>Filtry planów</Text>
                <Text style={styles.sheetSubtitle}>
                  Wybierz poziom ćwiczeń w planie
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
                <Text style={styles.applyButtonText}>Pokaż plany</Text>
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
    list: { flex: 1 },
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
    filterButtonTextActive: { color: Colors.white },
    activeChip: {
      alignSelf: "flex-start",
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      marginTop: Spacing.sm,
      borderRadius: BorderRadius.lg,
      backgroundColor: Colors.selectedBackground,
    },
    activeChipText: {
      color: Colors.primaryDark,
      fontSize: 12,
      fontWeight: "600",
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
    sheetRoot: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0, 0, 0, 0.4)",
    },
    sheetBackdrop: { ...StyleSheet.absoluteFill },
    sheet: {
      maxHeight: "80%",
      backgroundColor: Colors.cardBackground,
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
      borderBottomColor: Colors.border,
    },
    sheetTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: "700" },
    sheetSubtitle: { color: Colors.textSecondary, fontSize: 12, marginTop: 3 },
    closeButton: { color: Colors.primary, fontSize: 14, fontWeight: "600" },
    sheetContent: { padding: Spacing.md },
    sectionTitle: {
      color: Colors.textPrimary,
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
      borderColor: Colors.border,
      backgroundColor: Colors.cardBackground,
    },
    filterChipSelected: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    filterChipText: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: "500",
    },
    filterChipTextSelected: { color: Colors.white },
    sheetFooter: {
      flexDirection: "row",
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
    clearButton: {
      minHeight: 46,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    clearButtonText: {
      color: Colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    applyButton: {
      flex: 1,
      minHeight: 46,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.md,
    },
    applyButtonText: { color: Colors.white, fontSize: 14, fontWeight: "700" },
    resultCount: {
      color: Colors.textSecondary,
      fontSize: 12,
      marginTop: Spacing.sm,
    },
    planCard: {
      backgroundColor: Colors.cardBackground,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    planTitleRow: { flexDirection: "row", alignItems: "center" },
    planTitleButton: { flex: 1, justifyContent: "center", minHeight: 48 },
    planLevel: {
      color: Colors.primary,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 2,
    },
    description: {
      fontSize: 14,
      color: Colors.textSecondary,
      marginTop: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    planMeta: {
      flexDirection: "row",
      gap: Spacing.md,
      justifyContent: "flex-end",
    },
    exercisesCount: {
      fontSize: 12,
      color: Colors.textSecondary,
      fontWeight: "500",
      textAlign: "right",
    },
    messageContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: Spacing.lg,
    },
    message: { color: Colors.textSecondary, fontSize: 14 },
    error: { color: Colors.danger, fontSize: 14, textAlign: "center" },
    emptyList: { flexGrow: 1 },
    emptyState: { paddingVertical: Spacing.xl, alignItems: "center" },
  });
