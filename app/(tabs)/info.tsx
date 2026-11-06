import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Spacing, type AppColors } from "../../constants/colors";
import { useAppTheme } from "../../constants/useAppTheme";
import { loadCalendarEntries } from "../../constants/calendarStorage";
import { loadPlans } from "../../constants/planStorage";
import { loadSequences } from "../../constants/sequenceStorage";
import { loadFavorites } from "../../constants/favoritesStorage";
import { loadExerciseNotes } from "../../constants/exerciseNotesStorage";
import { loadSequenceNotes } from "../../constants/sequenceNotesStorage";
import { exportJson } from "../../constants/jsonExport";
import { importJsonBackup } from "../../constants/jsonImport";
import { readPickedJson } from "../../constants/readPickedJson";
import * as DocumentPicker from "expo-document-picker";
import appInfo from "../../data/appInfo.json";
import { useExercises } from "../../constants/useExercises";
import bodyAreas from "../../data/bodyAreas.json";
import exerciseLevels from "../../data/exerciseLevels.json";
import exercisePositions from "../../data/exercisePositions.json";
import { formatDateKey } from "../../constants/dateUtils";
import { useExerciseImagePreference } from "../../constants/exerciseImagePreference";

function formatReleaseDate(value: string) {
  return formatDateKey(value, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function InfoScreen() {
  const { colors: Colors, globalStyles } = useAppTheme();
  const { exercises } = useExercises();
  const {
    showExerciseImages,
    loading: imagePreferenceLoading,
    saving: imagePreferenceSaving,
    error: imagePreferenceError,
    setShowExerciseImages,
  } = useExerciseImagePreference();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [changelogExpanded, setChangelogExpanded] = useState(false);

  const exportAllJson = async () => {
    setExporting(true);
    setMessage("");
    setError("");
    try {
      const [
        plans,
        sequences,
        calendar,
        favorites,
        exerciseNotes,
        sequenceNotes,
      ] = await Promise.all([
        loadPlans(),
        loadSequences(),
        loadCalendarEntries(),
        loadFavorites(),
        loadExerciseNotes(),
        loadSequenceNotes(),
      ]);
      await exportJson("pilateset-wszystkie-dane.json", {
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        "exercises.json": exercises,
        "bodyAreas.json": bodyAreas,
        "exerciseLevels.json": exerciseLevels,
        "exercisePositions.json": exercisePositions,
        "favorites.json": favorites,
        "exercise-notes.json": exerciseNotes,
        "sequence-notes.json": sequenceNotes,
        "plans.json": plans,
        "sequences.json": sequences,
        "calendar.json": calendar,
      });
      setMessage("Eksport danych został przygotowany.");
    } catch (exportError) {
      const errorMessage =
        exportError instanceof Error
          ? exportError.message
          : "Spróbuj ponownie.";
      setError(errorMessage);
      Alert.alert("Nie udało się wyeksportować danych", errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const importAllJson = async () => {
    setImporting(true);
    setMessage("");
    setError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset.name.toLowerCase().endsWith(".json")) {
        throw new Error("Wybierz plik z rozszerzeniem .json.");
      }

      const contents = await readPickedJson(asset);
      await importJsonBackup(contents);
      setMessage("Dane zostały zaimportowane.");
    } catch (importError) {
      const errorMessage =
        importError instanceof Error
          ? importError.message
          : "Spróbuj ponownie.";
      setError(errorMessage);
      Alert.alert("Nie udało się zaimportować danych", errorMessage);
    } finally {
      setImporting(false);
    }
  };

  const confirmImport = () => {
    setConfirmingImport(true);
  };

  return (
    <ScrollView
      style={globalStyles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <View style={styles.icon}>
          <Ionicons
            name="information-circle-outline"
            size={30}
            color={Colors.primary}
          />
        </View>
        <Text style={styles.title}>PilateSet</Text>
        <Text style={styles.description}>{appInfo.description}</Text>
      </View>

      <View style={styles.metaCard}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Wersja</Text>
          <Text style={styles.metaValue}>{appInfo.version}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Data wydania</Text>
          <Text style={styles.metaValue}>
            {formatReleaseDate(appInfo.releaseDate)}
          </Text>
        </View>
        <View style={styles.separator} />
        <TouchableOpacity
          style={styles.changelogToggle}
          onPress={() => setChangelogExpanded((expanded) => !expanded)}
          accessibilityRole="button"
          accessibilityLabel={`${changelogExpanded ? "Zwiń" : "Rozwiń"} historię zmian`}
          accessibilityState={{ expanded: changelogExpanded }}
        >
          <Text style={styles.metaLabel}>Historia zmian</Text>
          <Ionicons
            name={changelogExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
        {changelogExpanded &&
          appInfo.changelog.map((item, index) => (
            <View
              key={`${item.version}-${item.date}-${index}`}
              style={styles.changelogEntry}
            >
              <View style={styles.changelogHeading}>
                <Text style={styles.metaValue}>{item.version}</Text>
                <Text style={styles.changelogDate}>
                  {formatReleaseDate(item.date)}
                </Text>
              </View>
              <Text style={styles.changelogMessage}>{item.message}</Text>
            </View>
          ))}
      </View>

      <Text style={styles.sectionTitle}>Wyświetlanie</Text>
      <View style={styles.preferenceCard}>
        <View style={styles.preferenceRow}>
          <View style={styles.preferenceText}>
            <Text style={styles.metaValue}>Zdjęcia ćwiczeń</Text>
            <Text style={styles.preferenceDescription}>
              Pokazuj zdjęcia na kartach i ekranach ćwiczeń.
            </Text>
          </View>
          <Switch
            value={showExerciseImages}
            onValueChange={setShowExerciseImages}
            disabled={imagePreferenceLoading || imagePreferenceSaving}
            accessibilityLabel="Pokazuj zdjęcia ćwiczeń"
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>
        {imagePreferenceError ? (
          <Text style={styles.errorMessage}>{imagePreferenceError}</Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Twoje dane</Text>
      <View style={styles.exportCard}>
        <Text style={styles.exportDescription}>
          Pobierz jeden plik JSON z katalogiem ćwiczeń, słownikami, notatkami,
          ulubionymi pozycjami, planami, sekwencjami i kalendarzem.
        </Text>
        <TouchableOpacity
          style={[
            styles.exportButton,
            (exporting || importing) && styles.exportButtonDisabled,
          ]}
          onPress={exportAllJson}
          disabled={exporting || importing}
          accessibilityRole="button"
          accessibilityLabel="Pobierz wszystkie dane JSON"
        >
          <Ionicons name="download-outline" size={20} color={Colors.white} />
          <Text style={styles.exportButtonText}>
            {exporting ? "Przygotowywanie…" : "Pobierz wszystkie dane"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.importButton,
            (exporting || importing) && styles.exportButtonDisabled,
          ]}
          onPress={confirmImport}
          disabled={exporting || importing}
          accessibilityRole="button"
          accessibilityLabel="Załaduj dane z pliku JSON"
        >
          <Ionicons
            name="folder-open-outline"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.importButtonText}>
            {importing ? "Wczytywanie…" : "Załaduj dane"}
          </Text>
        </TouchableOpacity>
        {message ? <Text style={styles.successMessage}>{message}</Text> : null}
        {error ? <Text style={styles.errorMessage}>{error}</Text> : null}
      </View>
      <Modal
        visible={confirmingImport}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingImport(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationCard}>
            <Text style={styles.confirmationTitle}>
              Załadować kopię zapasową?
            </Text>
            <Text style={styles.confirmationDescription}>
              Import zastąpi zapisane dane aplikacji uwzględnione w tej kopii.
              Przed kontynuowaniem upewnij się, że masz ich kopię.
            </Text>
            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={styles.cancelImportButton}
                onPress={() => setConfirmingImport(false)}
                accessibilityRole="button"
              >
                <Text style={styles.cancelImportButtonText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmImportButton}
                onPress={() => {
                  setConfirmingImport(false);
                  void importAllJson();
                }}
                accessibilityRole="button"
              >
                <Text style={styles.confirmImportButtonText}>Wybierz plik</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (Colors: AppColors) =>
  StyleSheet.create({
    content: {
      padding: Spacing.md,
      paddingBottom: Spacing.xl,
    },
    hero: {
      alignItems: "center",
      padding: Spacing.lg,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.cardBackground,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    icon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: Colors.selectedBackground,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: Spacing.sm,
    },
    title: {
      color: Colors.textPrimary,
      fontSize: 23,
      fontWeight: "700",
    },
    description: {
      color: Colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
      marginTop: Spacing.sm,
    },
    metaCard: {
      backgroundColor: Colors.cardBackground,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: Spacing.md,
      marginTop: Spacing.md,
    },
    metaRow: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.md,
    },
    changelogToggle: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    changelogEntry: {
      paddingVertical: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
    changelogHeading: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: Spacing.md,
    },
    changelogDate: {
      color: Colors.textSecondary,
      fontSize: 13,
    },
    changelogMessage: {
      color: Colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      marginTop: Spacing.xs,
    },
    metaLabel: { color: Colors.textSecondary, fontSize: 14 },
    metaValue: { color: Colors.textPrimary, fontSize: 14, fontWeight: "600" },
    separator: { height: 1, backgroundColor: Colors.border },
    sectionTitle: {
      color: Colors.textPrimary,
      fontSize: 17,
      fontWeight: "700",
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    exportCard: {
      backgroundColor: Colors.cardBackground,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.md,
    },
    exportDescription: {
      color: Colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
    },
    preferenceCard: {
      backgroundColor: Colors.cardBackground,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.md,
    },
    preferenceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.md,
    },
    preferenceText: { flex: 1, gap: Spacing.xs },
    preferenceDescription: {
      color: Colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    exportButton: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.md,
    },
    exportButtonDisabled: { opacity: 0.6 },
    exportButtonText: { color: Colors.white, fontSize: 14, fontWeight: "700" },
    importButton: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: Colors.primary,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    importButtonText: {
      color: Colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: "center",
      padding: Spacing.lg,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    confirmationCard: {
      backgroundColor: Colors.cardBackground,
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
    },
    confirmationTitle: {
      color: Colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    confirmationDescription: {
      color: Colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      marginTop: Spacing.sm,
    },
    confirmationActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: Spacing.sm,
      marginTop: Spacing.lg,
    },
    cancelImportButton: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: Spacing.md,
    },
    cancelImportButtonText: {
      color: Colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
    },
    confirmImportButton: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: Spacing.md,
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.md,
    },
    confirmImportButtonText: {
      color: Colors.white,
      fontSize: 14,
      fontWeight: "700",
    },
    successMessage: {
      color: Colors.primaryDark,
      fontSize: 13,
      marginTop: Spacing.sm,
    },
    errorMessage: { color: Colors.danger, fontSize: 13, marginTop: Spacing.sm },
  });
