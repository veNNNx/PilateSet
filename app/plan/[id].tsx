import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  PanResponder,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, BorderRadius, type AppColors } from "../../constants/colors";
import { useAppTheme } from "../../constants/useAppTheme";
import {
  deletePlan,
  updatePlan,
  loadPlans,
  type Plan,
  type PlanContentItem,
} from "../../constants/planStorage";
import {
  deleteSequence,
  loadSequences,
  updateSequence,
  type Sequence,
} from "../../constants/sequenceStorage";
import { navigateBack } from "../../constants/navigation";
import {
  loadSequenceNotes,
  saveSequenceNote,
} from "../../constants/sequenceNotesStorage";
import type { Exercise } from "../../constants/exercises";
import exerciseLevels from "../../data/exerciseLevels.json";
import { useFavorites } from "../../constants/useFavorites";
import { FavoriteButton } from "../../components/FavoriteButton";
import { ExerciseCard } from "../../components/ExerciseCard";
import { SequenceContentCard } from "../../components/SequenceContentCard";
import { ScreenMessage } from "../../components/ScreenMessage";
import { PlanContentPicker } from "../../components/PlanContentPicker";
import { useExercises } from "../../constants/useExercises";
import { printPlanPdf } from "../../constants/planPdf";
import type { PlanPdfItem } from "../../constants/planPdf.types";

type PlanListItem =
  | { type: "exercise"; id: string; exercise: Exercise }
  | { type: "sequence"; id: string; sequence: Sequence };

type ReorderablePlanItemProps = {
  armed: boolean;
  onMove: (pageY: number) => void;
  onRelease: (pageY?: number) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  testID: string;
  children: React.ReactNode;
};

function ReorderablePlanItem({
  armed,
  onMove,
  onRelease,
  onLayout,
  testID,
  children,
}: ReorderablePlanItemProps) {
  const armedRef = useRef(false);
  const callbacks = useRef({ onMove, onRelease });
  const [panHandlers, setPanHandlers] = useState<
    ReturnType<typeof PanResponder.create>["panHandlers"] | null
  >(null);
  useEffect(() => {
    armedRef.current = armed;
    callbacks.current = { onMove, onRelease };
  }, [armed, onMove, onRelease]);
  useEffect(() => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
        armedRef.current && Math.abs(gestureState.dy) > 4,
      onPanResponderMove: (_event, gestureState) =>
        callbacks.current.onMove(gestureState.moveY),
      onPanResponderRelease: (_event, gestureState) =>
        callbacks.current.onRelease(gestureState.moveY),
      onPanResponderTerminate: (_event, gestureState) =>
        callbacks.current.onRelease(gestureState.moveY),
      onPanResponderTerminationRequest: () => false,
    });
    setPanHandlers(responder.panHandlers);
  }, []);

  return (
    <View
      {...(panHandlers ?? {})}
      onLayout={onLayout}
      onTouchEnd={() => callbacks.current.onRelease()}
      testID={testID}
    >
      {children}
    </View>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function printExerciseHtml(exercise: Exercise, number: string) {
  const details = [
    ["Pozycja wejściowa", exercise.startingPosition],
    ["Obciążenie", exercise.load],
    ["Sekwencja ruchu", exercise.movementSequence],
    ["Modyfikacje", exercise.modifications],
  ]
    .filter(([, value]) => value.trim())
    .map(
      ([label, value]) =>
        `<div class="detail"><strong>${escapeHtml(label)}</strong><p>${escapeHtml(value)}</p></div>`,
    )
    .join("");
  const metadata = [
    exercise.sets ? `<span>${escapeHtml(exercise.sets)}</span>` : "",
    exercise.level ? `<span>${escapeHtml(exercise.level)}</span>` : "",
    exercise.bodyAreas.length > 0
      ? `<span>${escapeHtml(exercise.bodyAreas.join(" · "))}</span>`
      : "",
    exercise.position
      ? `<span>Pozycja: ${escapeHtml(exercise.position)}</span>`
      : "",
  ]
    .filter(Boolean)
    .join('<span class="separator">•</span>');

  return `
    <article class="exercise">
      <h3><span class="item-number">${escapeHtml(number)}.</span> ${escapeHtml(exercise.name)}</h3>
      ${metadata ? `<div class="metadata">${metadata}</div>` : ""}
      ${details ? `<div class="details">${details}</div>` : ""}
    </article>
  `;
}

export default function PlanDetailScreen({
  kind = "plan",
}: {
  kind?: "plan" | "sequence";
}) {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState<PlanContentItem[]>([]);
  const contentRef = useRef(content);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [relatedPlans, setRelatedPlans] = useState<Plan[]>([]);
  const [isPlansExpanded, setIsPlansExpanded] = useState(false);
  const [sequenceNote, setSequenceNote] = useState("");
  const [savedSequenceNote, setSavedSequenceNote] = useState("");
  const [savingSequenceNote, setSavingSequenceNote] = useState(false);
  const [sequenceNoteError, setSequenceNoteError] = useState("");
  const [expandedSequenceIds, setExpandedSequenceIds] = useState<Set<string>>(
    new Set(),
  );
  const [addExercisesVisible, setAddExercisesVisible] = useState(false);
  const [addSequencesVisible, setAddSequencesVisible] = useState(false);
  const [draggedItemKey, setDraggedItemKey] = useState<string | null>(null);
  const draggedItemKeyRef = useRef<string | null>(null);
  const [dropIndicatorTop, setDropIndicatorTop] = useState<number | null>(null);
  const dragStartContentRef = useRef<PlanContentItem[]>([]);
  const dropTargetIndexRef = useRef(0);
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const scrollOffsetRef = useRef(0);
  const scrollTopRef = useRef(0);
  const scrollHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const dragPageYRef = useRef(0);
  const autoScrollFrameRef = useRef<number | null>(null);
  const itemLayoutsRef = useRef(
    new Map<string, { y: number; height: number }>(),
  );
  const {
    colors: Colors,
    globalStyles,
    typography: Typography,
  } = useAppTheme();
  const { exercises: exercisesData } = useExercises();
  const {
    isFavorite,
    toggle: toggleFavorite,
    error: favoritesError,
  } = useFavorites();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  const exerciseIds = useMemo(
    () =>
      content.filter((item) => item.type === "exercise").map((item) => item.id),
    [content],
  );
  const sequenceIds = useMemo(
    () =>
      content.filter((item) => item.type === "sequence").map((item) => item.id),
    [content],
  );
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setLoading(true);
      setPlan(null);
      setContent([]);
      setRelatedPlans([]);
      setSequenceNote("");
      setSavedSequenceNote("");
      setSequenceNoteError("");
      setError("");
      (async () => {
        if (kind === "plan") {
          const [plans, loadedSequences] = await Promise.all([
            loadPlans(),
            loadSequences(),
          ]);
          if (!isActive) return;
          const currentPlan = plans.find((item) => item.id === id) ?? null;
          setSequences(loadedSequences);
          setPlan(currentPlan);
          if (currentPlan) {
            setName(currentPlan.name);
            setDescription(currentPlan.description);
            setContent(currentPlan.content);
          }
          setError(currentPlan ? "" : "Nie znaleziono planu.");
        } else {
          const [loadedSequences, plans] = await Promise.all([
            loadSequences(),
            loadPlans(),
          ]);
          if (!isActive) return;
          const currentSequence =
            loadedSequences.find((item) => item.id === id) ?? null;
          setSequences([]);
          setRelatedPlans(
            plans.filter((item) =>
              item.content.some(
                (entry) => entry.type === "sequence" && entry.id === id,
              ),
            ),
          );
          setPlan(
            currentSequence
              ? {
                  id: currentSequence.id,
                  name: currentSequence.name,
                  description: currentSequence.description,
                  content: currentSequence.exerciseIds.map((exerciseId) => ({
                    type: "exercise",
                    id: exerciseId,
                  })),
                }
              : null,
          );
          if (currentSequence) {
            setName(currentSequence.name);
            setDescription(currentSequence.description);
            setContent(
              currentSequence.exerciseIds.map((exerciseId) => ({
                type: "exercise",
                id: exerciseId,
              })),
            );
          }
          setError(currentSequence ? "" : "Nie znaleziono sekwencji.");
          if (currentSequence) {
            loadSequenceNotes()
              .then((notes) => {
                if (!isActive) return;
                const currentNote =
                  notes.find((item) => item.sequenceId === id)?.note ?? "";
                setSequenceNote(currentNote);
                setSavedSequenceNote(currentNote);
                setSequenceNoteError("");
              })
              .catch((noteLoadError: unknown) => {
                if (!isActive) return;
                setSequenceNoteError(
                  noteLoadError instanceof Error
                    ? noteLoadError.message
                    : "Nie udało się wczytać notatki.",
                );
              });
          }
        }
        setEditing(false);
        setAddExercisesVisible(false);
        setAddSequencesVisible(false);
        setExpandedSequenceIds(new Set());
        setIsPlansExpanded(false);
      })()
        .catch((loadError: unknown) => {
          if (!isActive) return;
          setError(
            loadError instanceof Error
              ? loadError.message
              : `Nie udało się wczytać ${kind === "plan" ? "planu" : "sekwencji"}.`,
          );
        })
        .finally(() => {
          if (isActive) setLoading(false);
        });
      return () => {
        isActive = false;
      };
    }, [id, kind]),
  );

  if (!plan) {
    return (
      <View style={[globalStyles.container, { paddingTop: insets.top }]}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity
            onPress={() => navigateBack(kind === "plan" ? "/" : "/sequences")}
            accessibilityRole="button"
            accessibilityLabel="Wróć"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navigationTitle} numberOfLines={1}>
            Szczegóły {kind === "plan" ? "planu" : "sekwencji"}
          </Text>
        </View>
        <ScreenMessage
          message={
            loading
              ? `Wczytywanie ${kind === "plan" ? "planu" : "sekwencji"}…`
              : error ||
                `Nie znaleziono ${kind === "plan" ? "planu" : "sekwencji"}.`
          }
          error={!loading && Boolean(error)}
        />
      </View>
    );
  }

  const planExercises = exerciseIds
    .map((exerciseId) =>
      exercisesData.find((exercise) => exercise.id === exerciseId),
    )
    .filter((exercise): exercise is Exercise => exercise !== undefined);
  const includedSequences = sequenceIds
    .map((sequenceId) =>
      sequences.find((sequence) => sequence.id === sequenceId),
    )
    .filter((sequence): sequence is Sequence => sequence !== undefined);
  const sequenceExerciseCount = includedSequences.reduce(
    (count, sequence) => count + sequence.exerciseIds.length,
    0,
  );
  const orderedContent = content.reduce<PlanListItem[]>((items, item) => {
    if (item.type === "exercise") {
      const exercise = exercisesData.find(
        (candidate) => candidate.id === item.id,
      );
      if (exercise) items.push({ type: "exercise", id: item.id, exercise });
      return items;
    }
    const sequence = sequences.find((candidate) => candidate.id === item.id);
    if (sequence) items.push({ type: "sequence", id: item.id, sequence });
    return items;
  }, []);
  const allPlanExercises = [
    ...planExercises,
    ...includedSequences.flatMap((sequence) =>
      sequence.exerciseIds
        .map((exerciseId) =>
          exercisesData.find((exercise) => exercise.id === exerciseId),
        )
        .filter((exercise): exercise is Exercise => exercise !== undefined),
    ),
  ];
  const planLevels = exerciseLevels.filter((level) =>
    allPlanExercises.some((exercise) => exercise.level === level),
  );
  const startEditing = () => {
    setName(plan.name);
    setDescription(plan.description);
    setContent([...plan.content]);
    finishReordering();
    setError("");
    setAddExercisesVisible(false);
    setAddSequencesVisible(false);
    setEditing(true);
  };

  const saveEdits = async () => {
    if (!name.trim()) {
      setError("Podaj nazwę planu.");
      return;
    }

    if (
      exerciseIds.length === 0 &&
      (kind === "sequence" || sequenceIds.length === 0)
    ) {
      setError(
        kind === "plan"
          ? "Plan musi zawierać co najmniej jedno ćwiczenie lub sekwencję."
          : "Sekwencja musi zawierać co najmniej jedno ćwiczenie.",
      );
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updatedPlan: Plan = {
        ...plan,
        name: name.trim(),
        description: description.trim(),
        content:
          kind === "plan"
            ? content
            : content.filter((item) => item.type === "exercise"),
      };
      if (kind === "plan") await updatePlan(updatedPlan);
      else {
        const updatedSequence: Sequence = {
          id: updatedPlan.id,
          name: updatedPlan.name,
          description: updatedPlan.description,
          exerciseIds: updatedPlan.content
            .filter((item) => item.type === "exercise")
            .map((item) => item.id),
        };
        await updateSequence(updatedSequence);
      }
      setPlan(updatedPlan);
      setAddExercisesVisible(false);
      setAddSequencesVisible(false);
      finishReordering();
      setEditing(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Nie udało się zapisać planu.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDeletePlan = () => {
    Alert.alert(
      `Usunąć ${kind === "plan" ? "plan" : "sekwencję"}?`,
      `${kind === "plan" ? "Plan" : "Sekwencja"} „${plan.name}” zostanie usunięta.`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: () => {
            void (
              kind === "plan" ? deletePlan(plan.id) : deleteSequence(plan.id)
            )
              .then(() => navigateBack(kind === "plan" ? "/" : "/sequences"))
              .catch((deleteError: unknown) => {
                setError(
                  deleteError instanceof Error
                    ? deleteError.message
                    : `Nie udało się usunąć ${kind === "plan" ? "planu" : "sekwencji"}.`,
                );
              });
          },
        },
      ],
    );
  };

  const removeOrderedItem = (item: PlanContentItem) => {
    setContent((current) =>
      current.filter(
        (currentItem) =>
          currentItem.type !== item.type || currentItem.id !== item.id,
      ),
    );
  };

  const addOrderedItem = (item: PlanContentItem) => {
    setContent((current) =>
      current.some(
        (currentItem) =>
          currentItem.type === item.type && currentItem.id === item.id,
      )
        ? current
        : [...current, item],
    );
  };

  const getDropIndicatorTop = (
    index: number,
    candidates: PlanContentItem[],
  ) => {
    const targetItem = candidates[index] ?? candidates[candidates.length - 1];
    if (!targetItem) return null;
    const layout = itemLayoutsRef.current.get(
      `${targetItem.type}:${targetItem.id}`,
    );
    if (!layout) return null;
    const isAfterLastItem = index >= candidates.length;
    return Math.max(
      0,
      (isAfterLastItem ? layout.y + layout.height : layout.y) - 2,
    );
  };

  const beginReordering = (item: PlanListItem) => {
    const key = `${item.type}:${item.id}`;
    draggedItemKeyRef.current = key;
    dragStartContentRef.current = [...contentRef.current];
    const itemIndex = contentRef.current.findIndex(
      (entry) => `${entry.type}:${entry.id}` === key,
    );
    dropTargetIndexRef.current = itemIndex;
    setDropIndicatorTop(
      getDropIndicatorTop(
        itemIndex,
        contentRef.current.filter(
          (entry) => `${entry.type}:${entry.id}` !== key,
        ),
      ),
    );
    setDraggedItemKey(key);
  };

  const finishReordering = (pageY?: number) => {
    if (pageY !== undefined) moveItemToPageY(pageY);
    const draggedKey = draggedItemKeyRef.current;
    const startContent = dragStartContentRef.current;
    const targetIndex = dropTargetIndexRef.current;
    if (draggedKey && startContent.length > 0) {
      setContent((current) => {
        const fromIndex = current.findIndex(
          (entry) => `${entry.type}:${entry.id}` === draggedKey,
        );
        if (
          fromIndex < 0 ||
          targetIndex < 0 ||
          targetIndex >= current.length ||
          fromIndex === targetIndex
        ) {
          return current;
        }
        const next = [...current];
        const [movedItem] = next.splice(fromIndex, 1);
        next.splice(targetIndex, 0, movedItem);
        return next;
      });
    }
    draggedItemKeyRef.current = null;
    dragStartContentRef.current = [];
    setDraggedItemKey(null);
    setDropIndicatorTop(null);
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  };

  const moveItemToPageY = (pageY: number) => {
    const targetContentY =
      pageY - scrollTopRef.current + scrollOffsetRef.current;
    const draggedKey = draggedItemKeyRef.current;
    const candidateItems = dragStartContentRef.current.filter(
      (item) => `${item.type}:${item.id}` !== draggedKey,
    );
    const targetIndex = candidateItems.filter((item) => {
      const layout = itemLayoutsRef.current.get(`${item.type}:${item.id}`);
      return (
        layout !== undefined && targetContentY >= layout.y + layout.height / 2
      );
    }).length;
    const finalIndex = Math.min(targetIndex, candidateItems.length);
    dropTargetIndexRef.current = finalIndex;
    setDropIndicatorTop(getDropIndicatorTop(finalIndex, candidateItems));
  };

  const autoScrollWhileDragging = () => {
    if (draggedItemKeyRef.current === null) {
      autoScrollFrameRef.current = null;
      return;
    }

    const pointerY = dragPageYRef.current - scrollTopRef.current;
    const direction =
      pointerY < 56 ? -1 : pointerY > scrollHeightRef.current - 56 ? 1 : 0;
    const maxOffset = Math.max(
      0,
      contentHeightRef.current - scrollHeightRef.current,
    );
    const nextOffset = Math.min(
      maxOffset,
      Math.max(0, scrollOffsetRef.current + direction * 8),
    );
    if (direction !== 0 && nextOffset !== scrollOffsetRef.current) {
      scrollOffsetRef.current = nextOffset;
      scrollViewRef.current?.scrollTo({ y: nextOffset, animated: false });
      moveItemToPageY(dragPageYRef.current);
      autoScrollFrameRef.current = requestAnimationFrame(
        autoScrollWhileDragging,
      );
    } else {
      autoScrollFrameRef.current = null;
    }
  };

  const reorderAtPageY = (pageY: number) => {
    dragPageYRef.current = pageY;
    moveItemToPageY(pageY);
    const pointerY = pageY - scrollTopRef.current;
    if (pointerY < 56 || pointerY > scrollHeightRef.current - 56) {
      if (autoScrollFrameRef.current === null) {
        autoScrollFrameRef.current = requestAnimationFrame(
          autoScrollWhileDragging,
        );
      }
    } else if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  };

  const handleItemLayout = (key: string, event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    itemLayoutsRef.current.set(key, { y, height });
  };

  const handleScrollLayout = () => {
    scrollViewRef.current?.measureInWindow((_x, y) => {
      scrollTopRef.current = y;
    });
  };

  const saveSequenceDetailNote = async () => {
    if (kind !== "sequence" || !plan) return;
    setSavingSequenceNote(true);
    setSequenceNoteError("");
    try {
      await saveSequenceNote(plan.id, sequenceNote);
      setSavedSequenceNote(sequenceNote.trim());
      setSequenceNote(sequenceNote.trim());
    } catch (saveError) {
      setSequenceNoteError(
        saveError instanceof Error
          ? saveError.message
          : "Nie udało się zapisać notatki.",
      );
    } finally {
      setSavingSequenceNote(false);
    }
  };

  const printPlan = async () => {
    const pdfItems: PlanPdfItem[] = orderedContent.map((item, itemIndex) => {
      const itemNumber = itemIndex + 1;
      if (item.type === "exercise") {
        return {
          type: "exercise",
          number: `${itemNumber}`,
          exercise: item.exercise,
        };
      }

      return {
        type: "sequence",
        number: `${itemNumber}`,
        name: item.sequence.name,
        description: item.sequence.description,
        exercises: item.sequence.exerciseIds
          .map((exerciseId, exerciseIndex) => ({
            number: `${itemNumber}.${exerciseIndex + 1}`,
            exercise: exercisesData.find(
              (exercise) => exercise.id === exerciseId,
            ),
          }))
          .filter(
            (entry): entry is { number: string; exercise: Exercise } =>
              entry.exercise !== undefined,
          ),
      };
    });
    const itemsHtml = orderedContent
      .map((item, itemIndex) => {
        const itemNumber = itemIndex + 1;
        if (item.type === "exercise") {
          return `
          <section class="plan-item direct-exercise">
            ${printExerciseHtml(item.exercise, `${itemNumber}`)}
          </section>
        `;
        }

        const sequenceExercises = item.sequence.exerciseIds
          .map((exerciseId) =>
            exercisesData.find((exercise) => exercise.id === exerciseId),
          )
          .filter((exercise): exercise is Exercise => exercise !== undefined);
        return `
        <section class="plan-item sequence-heading">
          <h2 class="item-title">
            <span class="item-number">${itemNumber}.</span> Sekwencja: ${escapeHtml(item.sequence.name)}
          </h2>
          ${
            item.sequence.description
              ? `<p class="sequence-description">${escapeHtml(item.sequence.description)}</p>`
              : ""
          }
        </section>
        ${sequenceExercises
          .map(
            (exercise, exerciseIndex) => `
          <section class="plan-item sequence-exercise">
            ${printExerciseHtml(exercise, `${itemNumber}.${exerciseIndex + 1}`)}
          </section>
        `,
          )
          .join("")}`;
      })
      .join("");
    const html = `
      <!DOCTYPE html>
      <html lang="pl">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page { margin: 0; }
            * { box-sizing: border-box; }
            body {
              color: #202b30;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 8pt;
              line-height: 1.2;
              margin: 0;
              padding: 9mm 10mm;
              -webkit-box-decoration-break: clone;
              box-decoration-break: clone;
            }
            .document-header {
              border-bottom: 1px solid #397f78;
              margin-bottom: 8px;
              padding-bottom: 6px;
            }
            .eyebrow {
              color: #397f78;
              font-size: 7pt;
              font-weight: 700;
              letter-spacing: 0.8px;
              margin: 0 0 3px;
              text-transform: uppercase;
            }
            h1 {
              color: #173a3a;
              font-size: 18pt;
              line-height: 1.1;
              margin: 0;
            }
            .plan-description {
              color: #526267;
              font-size: 8pt;
              margin: 4px 0 0;
              white-space: pre-wrap;
            }
            .contents-title {
              color: #173a3a;
              font-size: 9pt;
              margin: 0 0 5px;
            }
            .plan-content {
              column-count: 2;
              column-gap: 8mm;
              column-fill: balance;
            }
            .plan-item {
              border-bottom: 1px solid #dce5e3;
              break-inside: avoid;
              display: inline-block;
              margin: 0 0 6px;
              padding: 0 0 4px;
              page-break-inside: avoid;
              width: 100%;
            }
            .sequence-heading {
              break-after: avoid;
              page-break-after: avoid;
            }
            .item-title {
              color: #397f78;
              font-size: 8.5pt;
              font-weight: 700;
              margin: 0 0 3px;
            }
            .item-number {
              color: #397f78;
              font-weight: 700;
              white-space: nowrap;
            }
            .sequence-description {
              color: #526267;
              font-size: 7.5pt;
              margin: 0;
              white-space: pre-wrap;
            }
            .exercise {
              margin: 0;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .exercise h3 {
              color: #202b30;
              font-size: 8.5pt;
              font-weight: 700;
              margin: 0 0 2px;
            }
            .metadata {
              color: #397f78;
              font-size: 7pt;
              font-weight: 600;
              font-style: italic;
              margin: 0 0 3px;
            }
            .separator { color: #8a9a9b; padding: 0 2px; }
            .details {
              border-left: 1px solid #dce5e3;
              padding-left: 5px;
            }
            .detail { margin: 0 0 2px; }
            .detail strong {
              color: #526267;
              font-size: 7pt;
              font-weight: 700;
            }
            .detail strong::after { content: ": "; }
            .detail p {
              color: #202b30;
              display: inline;
              font-size: 7.5pt;
              font-weight: 400;
              margin: 0;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <header class="document-header">
            <p class="eyebrow">Plan treningowy</p>
            <h1>${escapeHtml(plan.name)}</h1>
            ${plan.description ? `<p class="plan-description">${escapeHtml(plan.description)}</p>` : ""}
          </header>
          <main>
            <h2 class="contents-title">Skład planu</h2>
            <div class="plan-content">${itemsHtml}</div>
          </main>
        </body>
      </html>
    `;

    try {
      await printPlanPdf({
        name: plan.name,
        description: plan.description,
        items: pdfItems,
        html,
      });
    } catch (printError) {
      Alert.alert(
        "Nie udało się rozpocząć drukowania",
        printError instanceof Error ? printError.message : "Spróbuj ponownie.",
      );
    }
  };

  const renderItemActions = (item: PlanListItem) => {
    const itemLabel =
      item.type === "exercise" ? item.exercise.name : item.sequence.name;
    return (
      <View style={styles.itemActions}>
        <TouchableOpacity
          onPress={() => removeOrderedItem({ type: item.type, id: item.id })}
          accessibilityRole="button"
          accessibilityLabel={`Usuń ${itemLabel} z ${kind === "plan" ? "planu" : "sekwencji"}`}
          hitSlop={8}
        >
          <Ionicons
            name="remove-circle-outline"
            size={24}
            color={Colors.danger}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderPlanItem = (item: PlanListItem) => {
    const itemKey = `${item.type}:${item.id}`;
    const isActive = draggedItemKey === itemKey;
    if (item.type === "exercise") {
      return (
        <ExerciseCard
          exercise={item.exercise}
          onPress={
            editing ? undefined : () => router.push(`/exercise/${item.id}`)
          }
          onLongPress={editing ? () => beginReordering(item) : undefined}
          accessibilityLabel={
            isActive
              ? `${item.exercise.name}, zmienianie kolejności`
              : editing
                ? `${item.exercise.name}, przytrzymaj aby zmienić kolejność`
                : item.exercise.name
          }
          activeOpacity={editing ? 0.8 : 0.7}
          style={isActive ? styles.draggedCard : undefined}
          trailing={editing ? renderItemActions(item) : null}
        />
      );
    }

    const sequence = item.sequence;
    const expanded = expandedSequenceIds.has(sequence.id);
    return (
      <SequenceContentCard
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
        onExercisePress={
          !editing
            ? (exercise) => router.push(`/exercise/${exercise.id}`)
            : undefined
        }
        onSequencePress={
          !editing ? () => router.push(`/sequence/${sequence.id}`) : undefined
        }
        onHeaderLongPress={editing ? () => beginReordering(item) : undefined}
        headerAccessibilityLabel={
          isActive
            ? `${sequence.name}, zmienianie kolejności`
            : editing
              ? `${sequence.name}, przytrzymaj aby zmienić kolejność`
              : undefined
        }
        trailing={editing ? renderItemActions(item) : undefined}
        active={isActive}
        style={[
          styles.sequenceListItem,
          isActive ? styles.draggedCard : undefined,
        ]}
      />
    );
  };

  const listFooter = (
    <View>
      {editing ? (
        <>
          <Text style={styles.sectionTitle}>
            Dodaj do {kind === "plan" ? "planu" : "sekwencji"}
          </Text>
          <View style={styles.addActions}>
            <TouchableOpacity
              style={styles.addActionButton}
              onPress={() => setAddExercisesVisible(true)}
              accessibilityRole="button"
            >
              <Ionicons
                name="add-circle-outline"
                size={21}
                color={Colors.primary}
              />
              <Text style={styles.addActionText}>Ćwiczenie</Text>
            </TouchableOpacity>
            {kind === "plan" ? (
              <TouchableOpacity
                style={styles.addActionButton}
                onPress={() => setAddSequencesVisible(true)}
                accessibilityRole="button"
              >
                <Ionicons
                  name="layers-outline"
                  size={19}
                  color={Colors.primary}
                />
                <Text style={styles.addActionText}>Sekwencja</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      ) : null}
      {kind === "sequence" ? (
        <View style={styles.sequenceNoteCard}>
          <View style={styles.sequenceNoteHeading}>
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={styles.sequenceNoteTitle}>Moja notatka</Text>
          </View>
          <TextInput
            value={sequenceNote}
            onChangeText={setSequenceNote}
            placeholder="Dodaj własną wskazówkę do sekwencji"
            placeholderTextColor={Colors.textSecondary}
            multiline
            textAlignVertical="top"
            style={styles.sequenceNoteInput}
            accessibilityLabel="Notatka do sekwencji"
          />
          {sequenceNoteError ? (
            <Text style={styles.error}>{sequenceNoteError}</Text>
          ) : null}
          <View style={styles.sequenceNoteFooter}>
            {sequenceNote !== savedSequenceNote ? (
              <TouchableOpacity
                style={[
                  styles.sequenceNoteSaveButton,
                  savingSequenceNote && styles.sequenceNoteSaveButtonDisabled,
                ]}
                onPress={() => void saveSequenceDetailNote()}
                disabled={savingSequenceNote}
                accessibilityRole="button"
                accessibilityLabel="Zapisz notatkę do sekwencji"
              >
                <Ionicons name="checkmark" size={16} color={Colors.white} />
                <Text style={styles.sequenceNoteSaveButtonText}>
                  {savingSequenceNote ? "Zapisywanie…" : "Zapisz"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.sequenceNoteSavedStatus}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={Colors.primary}
                />
                <Text style={styles.sequenceNoteSavedText}>
                  Notatka aktualna
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : null}
      {kind === "sequence" && relatedPlans.length > 0 ? (
        <View style={styles.relatedPlansSection}>
          <TouchableOpacity
            style={styles.relatedPlansHeader}
            onPress={() => setIsPlansExpanded((expanded) => !expanded)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ expanded: isPlansExpanded }}
          >
            <Text style={styles.relatedPlansHeaderTitle}>
              Dodane do planu ({relatedPlans.length})
            </Text>
            <Ionicons
              name={isPlansExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
          {isPlansExpanded ? (
            <View style={styles.relatedPlansList}>
              {relatedPlans.map((relatedPlan) => (
                <TouchableOpacity
                  key={relatedPlan.id}
                  style={styles.relatedPlanItem}
                  onPress={() => router.push(`/plan/${relatedPlan.id}`)}
                  accessibilityRole="button"
                >
                  <Text style={styles.relatedPlanName}>{relatedPlan.name}</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const listHeader = (
    <View>
      <View style={styles.headerContainer}>
        <View style={styles.planHeader}>
          {editing ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={`Nazwa ${kind === "plan" ? "planu" : "sekwencji"}`}
              placeholderTextColor={Colors.textSecondary}
              style={[Typography.h1, styles.planNameInput]}
              accessibilityLabel={`Nazwa ${kind === "plan" ? "planu" : "sekwencji"}`}
              returnKeyType="done"
            />
          ) : (
            <Text style={[Typography.h1, styles.planName]}>{plan.name}</Text>
          )}
        </View>
        <Text style={styles.planLevel}>{planLevels.join(" · ") || "—"}</Text>
        <Text style={[Typography.caption, styles.exerciseCount]}>
          {planExercises.length + sequenceExerciseCount} ćwiczeń
          {kind === "plan" && sequenceIds.length > 0
            ? ` · ${sequenceIds.length} sekwencji`
            : ""}
        </Text>
      </View>

      <View style={styles.descriptionSection}>
        <Text style={styles.descriptionTitle}>
          Opis {kind === "plan" ? "planu" : "sekwencji"}
        </Text>
        {editing ? (
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={`Dodaj opis ${kind === "plan" ? "planu" : "sekwencji"}`}
            placeholderTextColor={Colors.textSecondary}
            multiline
            textAlignVertical="top"
            style={styles.descriptionInput}
            accessibilityLabel={`Opis ${kind === "plan" ? "planu" : "sekwencji"}`}
          />
        ) : (
          <Text
            style={[
              styles.description,
              !plan.description && styles.emptyDescription,
            ]}
          >
            {plan.description ||
              (kind === "plan"
                ? "Ten plan nie ma jeszcze opisu."
                : "Ta sekwencja nie ma jeszcze opisu.")}
          </Text>
        )}
      </View>
      {editing && error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>
        Skład {kind === "plan" ? "planu" : "sekwencji"}
      </Text>
      {editing ? (
        <Text style={styles.editHint}>
          Przytrzymaj kafelek i przeciągnij, aby zmienić kolejność.
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={[globalStyles.container, { paddingTop: insets.top }]}>
      <View style={styles.navigationHeader}>
        <TouchableOpacity
          onPress={() => navigateBack(kind === "plan" ? "/" : "/sequences")}
          accessibilityRole="button"
          accessibilityLabel="Wróć"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navigationTitle} numberOfLines={1}>
          Szczegóły {kind === "plan" ? "planu" : "sekwencji"}
        </Text>
        {editing ? (
          <>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => {
                finishReordering();
                setEditing(false);
                setAddExercisesVisible(false);
                setAddSequencesVisible(false);
                setName(plan.name);
                setDescription(plan.description);
                setContent(plan.content);
                setError("");
              }}
              accessibilityRole="button"
              accessibilityLabel="Anuluj edycję"
            >
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={saveEdits}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={`Zapisz zmiany ${kind === "plan" ? "planu" : "sekwencji"}`}
            >
              <Ionicons
                name="checkmark"
                size={24}
                color={saving ? Colors.textSecondary : Colors.primary}
              />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.headerActions}>
            {kind === "plan" ? (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => void printPlan()}
                accessibilityRole="button"
                accessibilityLabel="Drukuj plan"
              >
                <Ionicons
                  name="print-outline"
                  size={23}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={startEditing}
              accessibilityRole="button"
              accessibilityLabel={`Edytuj ${kind === "plan" ? "plan" : "sekwencję"}`}
            >
              <Ionicons
                name="create-outline"
                size={23}
                color={Colors.primary}
              />
            </TouchableOpacity>
            <FavoriteButton
              favorite={isFavorite(kind, plan.id)}
              label={plan.name}
              onPress={() => void toggleFavorite(kind, plan.id)}
            />
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={confirmDeletePlan}
              accessibilityRole="button"
              accessibilityLabel={`Usuń ${kind === "plan" ? "plan" : "sekwencję"} ${plan.name}`}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={21} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      {favoritesError ? (
        <Text style={styles.error}>{favoritesError}</Text>
      ) : null}
      <ScrollView
        ref={scrollViewRef}
        style={styles.planList}
        contentContainerStyle={[
          globalStyles.listContainer,
          styles.planListContent,
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onLayout={(event) => {
          scrollHeightRef.current = event.nativeEvent.layout.height;
          handleScrollLayout();
        }}
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
          scrollHeightRef.current = event.nativeEvent.layoutMeasurement.height;
        }}
        onContentSizeChange={(_width, height) => {
          contentHeightRef.current = height;
        }}
        testID={editing ? "plan-edit-list" : "plan-details-scroll"}
      >
        {listHeader}
        {orderedContent.map((item) => {
          const itemKey = `${item.type}:${item.id}`;
          if (!editing) {
            return <View key={itemKey}>{renderPlanItem(item)}</View>;
          }
          return (
            <ReorderablePlanItem
              key={itemKey}
              armed={draggedItemKey === itemKey}
              onMove={reorderAtPageY}
              onRelease={finishReordering}
              onLayout={(event) => handleItemLayout(itemKey, event)}
              testID={`reorder-item:${itemKey}`}
            >
              {renderPlanItem(item)}
            </ReorderablePlanItem>
          );
        })}
        {draggedItemKey !== null && dropIndicatorTop !== null ? (
          <View
            pointerEvents="none"
            style={[
              styles.dropIndicator,
              { top: Math.max(0, dropIndicatorTop) },
            ]}
            testID="drop-position-indicator"
            accessibilityLabel="Miejsce upuszczenia elementu"
          />
        ) : null}
        {listFooter}
      </ScrollView>
      <PlanContentPicker
        visible={editing && addExercisesVisible}
        type="exercise"
        exercises={exercisesData}
        sequences={sequences}
        content={content}
        onToggle={(item) =>
          content.some(
            (current) => current.type === item.type && current.id === item.id,
          )
            ? removeOrderedItem(item)
            : addOrderedItem(item)
        }
        onClose={() => setAddExercisesVisible(false)}
      />
      {kind === "plan" ? (
        <PlanContentPicker
          visible={editing && addSequencesVisible}
          type="sequence"
          exercises={exercisesData}
          sequences={sequences}
          content={content}
          onToggle={(item) =>
            content.some(
              (current) => current.type === item.type && current.id === item.id,
            )
              ? removeOrderedItem(item)
              : addOrderedItem(item)
          }
          onClose={() => setAddSequencesVisible(false)}
        />
      ) : null}
    </View>
  );
}

const createStyles = (Colors: AppColors) =>
  StyleSheet.create({
    navigationHeader: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.md,
      paddingHorizontal: Spacing.md,
      backgroundColor: Colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    navigationTitle: {
      flex: 1,
      color: Colors.textPrimary,
      fontSize: 18,
      fontWeight: "600",
    },
    planList: {
      flex: 1,
      minHeight: 0,
      backgroundColor: Colors.background,
    },
    planListContent: {
      flexGrow: 1,
      backgroundColor: Colors.background,
      position: "relative",
    },
    itemActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
    },
    draggedCard: {
      backgroundColor: Colors.selectedBackground,
      borderColor: Colors.primary,
      elevation: 5,
    },
    dropIndicator: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: Colors.primary,
      borderRadius: 2,
      zIndex: 2,
      borderColor: Colors.primary,
      borderStyle: "dashed",
    },
    headerIconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
    },
    headerContainer: {
      padding: Spacing.md,
      backgroundColor: Colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    description: {
      fontSize: 14,
      color: Colors.textSecondary,
      lineHeight: 21,
    },
    descriptionInput: {
      minHeight: 88,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.background,
      padding: Spacing.md,
      color: Colors.textPrimary,
    },
    planHeader: { flexDirection: "row", alignItems: "center" },
    planName: { flex: 1, marginRight: Spacing.sm },
    planLevel: {
      color: Colors.primary,
      fontSize: 13,
      fontWeight: "600",
      marginTop: Spacing.xs,
    },
    planNameInput: {
      flex: 1,
      minHeight: 48,
      marginRight: Spacing.sm,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.background,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      color: Colors.textPrimary,
    },
    exerciseCount: { marginTop: Spacing.xs },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: Colors.textPrimary,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
    },
    editHint: {
      color: Colors.textSecondary,
      fontSize: 12,
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.xs,
    },
    descriptionSection: {
      backgroundColor: Colors.cardBackground,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.md,
      marginTop: Spacing.sm,
    },
    openExercisePicker: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: Colors.primary,
      borderRadius: BorderRadius.md,
      backgroundColor: Colors.cardBackground,
      marginBottom: Spacing.md,
    },
    openExercisePickerText: {
      color: Colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    addActions: {
      flexDirection: "row",
      gap: Spacing.sm,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
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
    sequenceNoteCard: {
      backgroundColor: Colors.cardBackground,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: Spacing.md,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.md,
    },
    sequenceNoteHeading: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    sequenceNoteTitle: {
      color: Colors.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    sequenceNoteInput: {
      minHeight: 88,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: BorderRadius.sm,
      backgroundColor: Colors.background,
      padding: Spacing.md,
      color: Colors.textPrimary,
    },
    sequenceNoteFooter: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: Spacing.sm,
    },
    sequenceNoteSaveButton: {
      minHeight: 40,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.md,
      gap: Spacing.xs,
    },
    sequenceNoteSaveButtonDisabled: { opacity: 0.6 },
    sequenceNoteSaveButtonText: {
      color: Colors.white,
      fontSize: 14,
      fontWeight: "600",
    },
    sequenceNoteSavedStatus: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
    },
    sequenceNoteSavedText: { color: Colors.textSecondary, fontSize: 13 },
    relatedPlansSection: {
      backgroundColor: Colors.cardBackground,
      borderRadius: BorderRadius.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: Colors.border,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.md,
    },
    relatedPlansHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: Spacing.md,
    },
    relatedPlansHeaderTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: Colors.textSecondary,
    },
    relatedPlansList: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      gap: Spacing.sm,
    },
    relatedPlanItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: Colors.background,
      padding: Spacing.md,
      borderRadius: BorderRadius.sm,
    },
    relatedPlanName: {
      fontSize: 14,
      color: Colors.textPrimary,
      fontWeight: "500",
    },
    sequenceSection: { paddingBottom: Spacing.md },
    sequenceListItem: { marginBottom: Spacing.sm },
    emptyText: { color: Colors.textSecondary, marginBottom: Spacing.md },
    descriptionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: Colors.textPrimary,
      marginBottom: Spacing.xs,
    },
    emptyDescription: {
      fontStyle: "italic",
    },
    error: {
      color: Colors.danger,
      fontSize: 14,
      textAlign: "center",
      marginTop: Spacing.sm,
    },
  });
