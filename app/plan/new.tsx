import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { BorderRadius, Spacing, type AppColors } from "../../constants/colors";
import { useAppTheme } from "../../constants/useAppTheme";
import {
  getNextPlanId,
  savePlan,
  type Plan,
  type PlanContentItem,
} from "../../constants/planStorage";
import {
  getNextSequenceId,
  loadSequences,
  saveSequence,
  type Sequence,
} from "../../constants/sequenceStorage";
import { navigateBack } from "../../constants/navigation";
import { getJsonFileLocation } from "../../constants/jsonFileStorage";
import { ExerciseCard } from "../../components/ExerciseCard";
import { SequenceContentCard } from "../../components/SequenceContentCard";
import { PlanContentPicker } from "../../components/PlanContentPicker";
import { ReorderableItems } from "../../components/ReorderableItems";
import { useExercises } from "../../constants/useExercises";
import { formatPolishCount } from "../../constants/formatting";

export default function NewPlanScreen({
  kind = "plan",
}: {
  kind?: "plan" | "sequence";
}) {
  const { colors: Colors, globalStyles } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { exercises: exercisesData } = useExercises();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [load, setLoad] = useState("");
  const [content, setContent] = useState<PlanContentItem[]>([]);
  const [expandedSequenceIds, setExpandedSequenceIds] = useState<Set<string>>(
    new Set(),
  );
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [sequencePickerVisible, setSequencePickerVisible] = useState(false);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedIds = useMemo(
    () =>
      content.filter((item) => item.type === "exercise").map((item) => item.id),
    [content],
  );
  const selectedSequenceIds = useMemo(
    () =>
      content.filter((item) => item.type === "sequence").map((item) => item.id),
    [content],
  );

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setName("");
      setDescription("");
      setLoad("");
      setContent([]);
      setExpandedSequenceIds(new Set());
      setExercisePickerVisible(false);
      setSequencePickerVisible(false);
      setError("");
      loadSequences()
        .then((loaded) => {
          if (active) setSequences(loaded);
        })
        .catch((loadError: unknown) => {
          if (active) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Nie udało się wczytać sekwencji.",
            );
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const toggleContent = (item: PlanContentItem) => {
    setContent((current) =>
      current.some(
        (currentItem) =>
          currentItem.type === item.type && currentItem.id === item.id,
      )
        ? current.filter(
            (currentItem) =>
              currentItem.type !== item.type || currentItem.id !== item.id,
          )
        : [...current, item],
    );
  };

  const save = async () => {
    const normalizedName = name.trim();
    const hasContent =
      kind === "plan"
        ? selectedIds.length > 0 || selectedSequenceIds.length > 0
        : selectedIds.length > 0;
    if (!normalizedName || !hasContent) {
      setError(
        kind === "plan"
          ? "Uzupełnij nazwę planu i dodaj ćwiczenie lub sekwencję."
          : "Uzupełnij nazwę sekwencji i wybierz co najmniej jedno ćwiczenie.",
      );
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (kind === "sequence") {
        const id = await getNextSequenceId();
        await saveSequence({
          id,
          name: normalizedName,
          description: description.trim(),
          load: load.trim(),
          exerciseIds: selectedIds,
        });
        navigateBack("/sequences");
      } else {
        const id = await getNextPlanId();
        const plan: Plan = {
          id,
          name: normalizedName,
          description: description.trim(),
          content,
        };
        await savePlan(plan);
        navigateBack("/");
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Nie udało się zapisać.",
      );
      setSaving(false);
    }
  };

  const renderSelectedItem = ({
    item,
    dragging,
    onLongPress,
  }: {
    item: PlanContentItem;
    index: number;
    dragging: boolean;
    onLongPress: (event: import("react-native").GestureResponderEvent) => void;
  }) => {
    if (item.type === "exercise") {
      const exercise = exercisesData.find(
        (candidate) => candidate.id === item.id,
      );
      if (!exercise) return null;
      return (
        <ExerciseCard
          exercise={exercise}
          onLongPress={onLongPress}
          selected
          accessibilityLabel={`${exercise.name}, przytrzymaj aby zmienić kolejność`}
          style={[
            styles.selectedItem,
            dragging ? styles.draggingItem : undefined,
          ]}
          trailing={
            <TouchableOpacity
              onPress={() => toggleContent(item)}
              accessibilityRole="button"
              accessibilityLabel={`Usuń ćwiczenie ${exercise.name} z ${kind === "plan" ? "planu" : "sekwencji"}`}
            >
              <Ionicons name="close-circle" size={20} color={Colors.danger} />
            </TouchableOpacity>
          }
        />
      );
    }

    const sequence = sequences.find((candidate) => candidate.id === item.id);
    if (!sequence) return null;
    return (
      <SequenceContentCard
        sequence={sequence}
        exercises={exercisesData}
        expanded={expandedSequenceIds.has(sequence.id)}
        onToggle={() =>
          setExpandedSequenceIds((current) => {
            const next = new Set(current);
            if (next.has(sequence.id)) next.delete(sequence.id);
            else next.add(sequence.id);
            return next;
          })
        }
        onHeaderLongPress={onLongPress}
        headerAccessibilityLabel={`${sequence.name}, przytrzymaj aby zmienić kolejność`}
        trailing={
          <TouchableOpacity
            onPress={() => toggleContent(item)}
            accessibilityRole="button"
            accessibilityLabel={`Usuń sekwencję ${sequence.name} z planu`}
          >
            <Ionicons name="close-circle" size={20} color={Colors.danger} />
          </TouchableOpacity>
        }
        active={dragging}
        style={styles.selectedSequence}
      />
    );
  };

  return (
    <View style={[globalStyles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigateBack(kind === "plan" ? "/" : "/sequences")}
          accessibilityRole="button"
          accessibilityLabel="Wróć"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {kind === "plan" ? "Nowy plan" : "Nowa sekwencja"}
        </Text>
        <TouchableOpacity
          style={[styles.headerSaveButton, saving && styles.saveButtonDisabled]}
          onPress={save}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={`Zapisz ${kind === "plan" ? "nowy plan" : "nową sekwencję"}`}
        >
          <Text style={styles.headerSaveButtonText}>
            {saving ? "Zapis…" : "Zapisz"}
          </Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.headerError}>{error}</Text> : null}

      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        testID={`new-${kind}-scroll`}
      >
        <Text style={styles.label}>
          Nazwa {kind === "plan" ? "planu" : "sekwencji"}
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Np. Poranny trening"
          placeholderTextColor={Colors.textSecondary}
          style={styles.input}
          accessibilityLabel={`Nazwa ${kind === "plan" ? "planu" : "sekwencji"}`}
        />

        <Text style={styles.label}>
          Opis {kind === "plan" ? "planu" : "sekwencji"} (opcjonalnie)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Opisz cel lub przebieg tego treningu"
          placeholderTextColor={Colors.textSecondary}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.descriptionInput]}
          accessibilityLabel={`Opis ${kind === "plan" ? "planu" : "sekwencji"}`}
          accessibilityHint="Opis zostanie zapisany i będzie widoczny na liście oraz w szczegółach"
        />

        {kind === "sequence" ? (
          <>
            <Text style={styles.label}>Obciążenie (opcjonalnie)</Text>
            <View style={styles.loadInputRow}>
              <Ionicons
                name="barbell-outline"
                size={20}
                color={Colors.primary}
              />
              <TextInput
                value={load}
                onChangeText={setLoad}
                placeholder="Np. Cz-CzCz"
                placeholderTextColor={Colors.textSecondary}
                style={styles.loadInput}
                accessibilityLabel="Obciążenie sekwencji"
              />
            </View>
          </>
        ) : null}

        <View style={styles.sectionTitleRow}>
          <Text style={styles.label}>
            Skład {kind === "plan" ? "planu" : "sekwencji"}
          </Text>
          <Text style={styles.selectedCount}>
            {formatPolishCount(
              selectedIds.length,
              "ćwiczenie",
              "ćwiczenia",
              "ćwiczeń",
            )}
            {kind === "plan"
              ? ` · ${selectedSequenceIds.length} sekwencji`
              : ""}
          </Text>
        </View>
        <View style={styles.addActions}>
          <TouchableOpacity
            style={styles.addActionButton}
            onPress={() => setExercisePickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Dodaj ćwiczenia"
          >
            <Ionicons
              name="add-circle-outline"
              size={19}
              color={Colors.primary}
            />
            <Text style={styles.addActionText}>Ćwiczenie</Text>
          </TouchableOpacity>
          {kind === "plan" ? (
            <TouchableOpacity
              style={styles.addActionButton}
              onPress={() => setSequencePickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Dodaj sekwencję do planu"
            >
              <Ionicons
                name="layers-outline"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.addActionText}>Sekwencja</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {content.length > 0 ? (
          <>
            <Text style={styles.hint}>
              Przytrzymaj kafelek i przeciągnij, aby zmienić kolejność.
            </Text>
            <ReorderableItems
              items={content}
              getKey={(item) => `${item.type}:${item.id}`}
              onReorder={setContent}
              testID={`selected-${kind}-content`}
              renderItem={renderSelectedItem}
            />
          </>
        ) : (
          <Text style={styles.emptyText}>
            {kind === "plan"
              ? "Dodaj ćwiczenia lub sekwencje do planu."
              : "Dodaj ćwiczenia do sekwencji."}
          </Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.storageNote}>
            Dane JSON:{" "}
            {getJsonFileLocation(
              kind === "plan" ? "plans.json" : "sequences.json",
              kind === "plan" ? "pilateset.plans.v1" : "pilateset.sequences.v1",
            )}
          </Text>
        </View>
      </ScrollView>

      <PlanContentPicker
        visible={exercisePickerVisible}
        type="exercise"
        owner={kind}
        exercises={exercisesData}
        sequences={sequences}
        content={content}
        onToggle={toggleContent}
        onClose={() => setExercisePickerVisible(false)}
      />
      {kind === "plan" ? (
        <PlanContentPicker
          visible={sequencePickerVisible}
          type="sequence"
          exercises={exercisesData}
          sequences={sequences}
          content={content}
          onToggle={toggleContent}
          onClose={() => setSequencePickerVisible(false)}
        />
      ) : null}
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
    formScroll: { flex: 1, minHeight: 0 },
    listContent: { padding: Spacing.md, paddingBottom: Spacing.xl },
    label: {
      color: Colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    input: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.cardBackground,
      paddingHorizontal: Spacing.md,
      color: Colors.textPrimary,
    },
    descriptionInput: { minHeight: 76, paddingTop: Spacing.md },
    loadInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.cardBackground,
      paddingHorizontal: Spacing.md,
    },
    loadInput: {
      flex: 1,
      minHeight: 44,
      color: Colors.textPrimary,
      fontSize: 16,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    selectedCount: {
      color: Colors.primary,
      fontSize: 13,
      fontWeight: "700",
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    addActions: {
      flexDirection: "row",
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    addActionButton: {
      minHeight: 44,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.cardBackground,
    },
    addActionText: { color: Colors.primary, fontSize: 14, fontWeight: "700" },
    selectedItem: {
      marginBottom: Spacing.xs,
      backgroundColor: Colors.cardBackground,
      borderColor: Colors.border,
    },
    selectedSequence: { marginBottom: Spacing.xs },
    draggingItem: {
      backgroundColor: Colors.selectedBackground,
      borderColor: Colors.primary,
      elevation: 5,
    },
    hint: {
      color: Colors.textSecondary,
      fontSize: 12,
      marginBottom: Spacing.sm,
    },
    emptyText: {
      color: Colors.textSecondary,
      textAlign: "center",
      padding: Spacing.lg,
      backgroundColor: Colors.cardBackground,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: BorderRadius.md,
    },
    footer: { paddingTop: Spacing.sm },
    storageNote: {
      color: Colors.textSecondary,
      fontSize: 11,
      marginTop: Spacing.xs,
    },
    headerError: {
      color: Colors.danger,
      fontSize: 12,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      backgroundColor: Colors.cardBackground,
    },
    headerSaveButton: {
      minHeight: 40,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
    },
    saveButtonDisabled: { opacity: 0.6 },
    headerSaveButtonText: {
      color: Colors.white,
      fontSize: 14,
      fontWeight: "700",
    },
  });
