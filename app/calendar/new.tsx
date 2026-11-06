import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Spacing, BorderRadius, type AppColors } from "../../constants/colors";
import { useAppTheme } from "../../constants/useAppTheme";
import {
  loadCalendarEntries,
  type CalendarEntry,
  saveCalendarEntries,
  updateCalendarEntry,
} from "../../constants/calendarStorage";
import { loadPlans, type Plan } from "../../constants/planStorage";
import { getPlanLevels } from "../../constants/planLevels";
import { loadSequences, type Sequence } from "../../constants/sequenceStorage";
import { navigateBack } from "../../constants/navigation";
import { getJsonFileLocation } from "../../constants/jsonFileStorage";
import { useFavorites } from "../../constants/useFavorites";
import { FavoriteIndicator } from "../../components/FavoriteIndicator";
import exerciseLevels from "../../data/exerciseLevels.json";
import { sortFavoritesByName } from "../../constants/sorting";
import { useExercises } from "../../constants/useExercises";
import {
  dateKeyFromDate,
  formatDateInput,
  formatHour,
  parseDateInput,
} from "../../constants/dateUtils";
import { formatPolishCount } from "../../constants/formatting";

const hours = [16, 17, 18, 19, 20, 21];

export default function NewCalendarEntryScreen() {
  const { colors: Colors, globalStyles } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { exercises } = useExercises();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [webDate, setWebDate] = useState(formatDateInput(today));
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [description, setDescription] = useState("");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [planSearch, setPlanSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const { isFavorite, error: favoritesError } = useFavorites();

  const visiblePlans = useMemo(() => {
    const query = planSearch.trim().toLocaleLowerCase();
    const matchingPlans = plans.filter((plan) => {
      const isSelected = selectedPlan?.id === plan.id;
      const matchesFavorite =
        !favoritesOnly || isFavorite("plan", plan.id) || isSelected;
      const matchesSearch =
        !query ||
        plan.name.toLocaleLowerCase().includes(query) ||
        plan.description.toLocaleLowerCase().includes(query);
      const matchesLevel =
        levelFilter === null ||
        getPlanLevels(plan, exercises, sequences).includes(levelFilter);
      return matchesFavorite && matchesSearch && matchesLevel;
    });
    const selectedPlans = matchingPlans.filter(
      (plan) => plan.id === selectedPlan?.id,
    );
    return [
      ...selectedPlans,
      ...sortFavoritesByName(
        matchingPlans.filter((plan) => plan.id !== selectedPlan?.id),
        (plan) => isFavorite("plan", plan.id),
        (plan) => plan.name,
      ),
    ];
  }, [
    exercises,
    favoritesOnly,
    isFavorite,
    levelFilter,
    planSearch,
    plans,
    selectedPlan,
    sequences,
  ]);
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      Promise.all([
        loadPlans(),
        loadSequences(),
        id ? loadCalendarEntries() : Promise.resolve([]),
      ])
        .then(([loadedPlans, loadedSequences, entries]) => {
          if (!isActive) return;
          setPlans(loadedPlans);
          setSequences(loadedSequences);
          if (id) {
            const entry = entries.find((item) => item.id === id);
            if (!entry) {
              setError("Nie znaleziono zaplanowanego treningu.");
              return;
            }
            const [year, month, day] = entry.date.split("-").map(Number);
            const date = new Date(year, month - 1, day);
            setSelectedDate(date);
            setWebDate(formatDateInput(date));
            setSelectedHours([entry.hour]);
            setSelectedPlan(
              loadedPlans.find((plan) => plan.id === entry.planId) ?? null,
            );
            setDescription(entry.description);
            setError("");
          }
        })
        .catch((loadError: unknown) => {
          if (isActive) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Nie udało się wczytać danych treningu.",
            );
          }
        });
      return () => {
        isActive = false;
      };
    }, [id]),
  );

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setDatePickerVisible(false);
    if (event.type === "dismissed" || !date) return;
    setSelectedDate(date);
    setWebDate(formatDateInput(date));
  };

  const handleHourPress = (hour: number) => {
    if (id) {
      setSelectedHours([hour]);
      return;
    }

    setSelectedHours((current) =>
      current.includes(hour)
        ? current.filter((selectedHour) => selectedHour !== hour)
        : [...current, hour].sort((a, b) => a - b),
    );
  };

  const handleSave = async () => {
    const isoDate =
      Platform.OS === "web"
        ? parseDateInput(webDate)
        : dateKeyFromDate(selectedDate);
    if (!isoDate) {
      setError("Wpisz prawidłową datę w formacie DD.MM.RRRR.");
      return;
    }
    if (selectedHours.length === 0 || selectedPlan === null) {
      setError("Wybierz godzinę i plan treningowy.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (id) {
        const entry: CalendarEntry = {
          id,
          date: isoDate,
          hour: selectedHours[0],
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          description: description.trim(),
        };
        await updateCalendarEntry(entry);
      } else {
        const entries: CalendarEntry[] = selectedHours.map((hour) => ({
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          date: isoDate,
          hour,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          description: description.trim(),
        }));
        await saveCalendarEntries(entries);
      }
      navigateBack("/calendar");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Nie udało się zapisać treningu.",
      );
      setSaving(false);
    }
  };

  return (
    <View style={[globalStyles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigateBack("/calendar")}
          accessibilityRole="button"
          accessibilityLabel="Wróć"
        >
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {id ? "Edytuj trening" : "Dodaj trening"}
        </Text>
        <View style={styles.headerSpacer} />
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={id ? "Zapisz zmiany treningu" : "Zapisz trening"}
        >
          <Ionicons
            name="checkmark"
            size={24}
            color={saving ? Colors.textSecondary : Colors.primary}
          />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.headerError}>{error}</Text> : null}

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Data</Text>
        {Platform.OS === "web" ? (
          <TextInput
            value={webDate}
            onChangeText={setWebDate}
            placeholder="DD.MM.RRRR"
            keyboardType="numbers-and-punctuation"
            style={styles.input}
            accessibilityLabel="Data, dzień miesiąc rok"
          />
        ) : (
          <>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setDatePickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Wybierz datę"
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.dateText}>
                {formatDateInput(selectedDate)}
              </Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
            {datePickerVisible && Platform.OS === "android" && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
            {Platform.OS === "ios" && (
              <Modal
                visible={datePickerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setDatePickerVisible(false)}
              >
                <View style={styles.pickerBackdrop}>
                  <View style={styles.pickerSheet}>
                    <View style={styles.pickerHeader}>
                      <Text style={styles.pickerTitle}>Wybierz datę</Text>
                      <TouchableOpacity
                        onPress={() => setDatePickerVisible(false)}
                      >
                        <Text style={styles.pickerDone}>Gotowe</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      style={styles.nativeDatePicker}
                    />
                  </View>
                </View>
              </Modal>
            )}
          </>
        )}

        <Text style={styles.label}>
          {id ? "Godzina" : "Godziny (możesz wybrać kilka)"}
        </Text>
        <View style={styles.options}>
          {hours.map((hour) => {
            const selected = selectedHours.includes(hour);
            return (
              <TouchableOpacity
                key={hour}
                style={[styles.hourOption, selected && styles.optionSelected]}
                onPress={() => handleHourPress(hour)}
                accessibilityRole={id ? "radio" : "checkbox"}
                accessibilityState={id ? { selected } : { checked: selected }}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                  ]}
                >
                  {formatHour(hour)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Opis (opcjonalnie)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Dodaj notatkę do treningu"
          placeholderTextColor={Colors.textSecondary}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.descriptionInput]}
          accessibilityLabel="Opis treningu"
        />

        <Text style={styles.label}>Plan treningowy</Text>
        <View style={styles.planSearchRow}>
          <TextInput
            value={planSearch}
            onChangeText={setPlanSearch}
            placeholder="Szukaj planu"
            placeholderTextColor={Colors.textSecondary}
            style={[styles.input, styles.planSearchInput]}
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
        </View>
        <Text style={styles.levelFilterLabel}>Poziom</Text>
        <View style={styles.levelOptions}>
          <TouchableOpacity
            style={[
              styles.levelChip,
              levelFilter === null && styles.levelChipSelected,
            ]}
            onPress={() => setLevelFilter(null)}
            accessibilityRole="radio"
            accessibilityState={{ selected: levelFilter === null }}
          >
            <Text
              style={[
                styles.levelChipText,
                levelFilter === null && styles.levelChipTextSelected,
              ]}
            >
              Wszystkie
            </Text>
          </TouchableOpacity>
          {exerciseLevels.map((level) => {
            const selected = levelFilter === level;
            return (
              <TouchableOpacity
                key={level}
                style={[styles.levelChip, selected && styles.levelChipSelected]}
                onPress={() => setLevelFilter(selected ? null : level)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.levelChipText,
                    selected && styles.levelChipTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {favoritesError ? (
          <Text style={styles.error}>{favoritesError}</Text>
        ) : null}

        <View style={styles.planList}>
          {visiblePlans.map((plan) => {
            const selected = selectedPlan?.id === plan.id;
            return (
              <View
                key={plan.id}
                style={[
                  styles.planOption,
                  selected && styles.planOptionSelected,
                ]}
              >
                <TouchableOpacity
                  style={styles.planOptionInfo}
                  onPress={() => setSelectedPlan(plan)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planMeta}>
                    {getPlanLevels(plan, exercises, sequences).join(" · ") ||
                      "—"}{" "}
                    ·{" "}
                    {formatPolishCount(
                      plan.content.reduce(
                        (count, item) =>
                          count +
                          (item.type === "exercise"
                            ? 1
                            : (sequences.find(
                                (sequence) => sequence.id === item.id,
                              )?.exerciseIds.length ?? 0)),
                        0,
                      ),
                      "ćwiczenie",
                      "ćwiczenia",
                      "ćwiczeń",
                    )}
                  </Text>
                </TouchableOpacity>
                <FavoriteIndicator
                  favorite={isFavorite("plan", plan.id)}
                  label={plan.name}
                />
                {selected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={Colors.primary}
                  />
                )}
              </View>
            );
          })}
          {visiblePlans.length === 0 ? (
            <Text style={styles.error}>
              Brak planów spełniających kryteria.
            </Text>
          ) : null}
        </View>

        <Text style={styles.storageNote}>
          Dane JSON:{" "}
          {getJsonFileLocation("calendar.json", "pilateset.calendar.v1")}
        </Text>
      </ScrollView>
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
      color: Colors.textPrimary,
      fontSize: 18,
      fontWeight: "600",
    },
    headerSpacer: { flex: 1 },
    headerIconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerError: {
      color: Colors.danger,
      fontSize: 12,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      backgroundColor: Colors.cardBackground,
    },
    content: {
      padding: Spacing.md,
      paddingBottom: Spacing.xl,
    },
    label: {
      color: Colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.cardBackground,
      paddingHorizontal: Spacing.md,
      color: Colors.textPrimary,
      fontSize: 15,
    },
    planSearchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    planSearchInput: { flex: 1 },
    favoriteIconButton: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.cardBackground,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    favoriteIconButtonSelected: {
      backgroundColor: Colors.selectedBackground,
      borderColor: Colors.primary,
    },
    dateButton: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.cardBackground,
      paddingHorizontal: Spacing.md,
    },
    dateText: {
      flex: 1,
      color: Colors.textPrimary,
      fontSize: 15,
    },
    options: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.sm,
    },
    hourOption: {
      minWidth: 76,
      minHeight: 42,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.cardBackground,
    },
    optionSelected: {
      backgroundColor: Colors.selectedBackground,
      borderColor: Colors.primary,
    },
    optionText: {
      color: Colors.textSecondary,
      fontWeight: "600",
    },
    optionTextSelected: { color: Colors.primaryDark },
    levelFilterLabel: {
      color: Colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
    },
    levelOptions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
    levelChip: {
      minHeight: 36,
      justifyContent: "center",
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.cardBackground,
    },
    levelChipSelected: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    levelChipText: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: "500",
    },
    levelChipTextSelected: { color: Colors.white },
    categoryChipSelected: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    categoryText: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: "500",
    },
    categoryTextSelected: { color: Colors.white },
    planList: { gap: Spacing.sm, marginTop: Spacing.md },
    planOption: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.cardBackground,
    },
    planOptionSelected: {
      borderColor: Colors.primary,
      backgroundColor: Colors.selectedBackground,
    },
    planOptionInfo: { flex: 1 },
    planName: {
      color: Colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    planMeta: {
      color: Colors.textSecondary,
      fontSize: 12,
      marginTop: 4,
    },
    descriptionInput: {
      minHeight: 100,
      paddingTop: Spacing.md,
    },
    storageNote: {
      color: Colors.textSecondary,
      fontSize: 12,
      marginTop: Spacing.sm,
    },
    error: {
      color: Colors.danger,
      fontSize: 13,
      marginTop: Spacing.md,
    },
    pickerBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0, 0, 0, 0.35)",
    },
    pickerSheet: {
      backgroundColor: Colors.cardBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Spacing.lg,
    },
    pickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    pickerTitle: {
      color: Colors.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    pickerDone: {
      color: Colors.primary,
      fontSize: 15,
      fontWeight: "600",
    },
    nativeDatePicker: { alignSelf: "center" },
  });
