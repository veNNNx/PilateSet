import initialExercises from "../data/exercises.json";
import initialPlans from "../data/plans.json";
import initialSequences from "../data/sequences.json";
import initialCalendar from "../data/calendar.json";
import type { Exercise } from "./exercises";
import { clearFavoritesCache, type Favorite } from "./favoritesStorage";
import type { CalendarEntry } from "./calendarStorage";
import type { ExerciseNote } from "./exerciseNotesStorage";
import type { Plan } from "./planStorage";
import type { Sequence } from "./sequenceStorage";
import type { SequenceNote } from "./sequenceNotesStorage";
import { writeJsonFile } from "./jsonFileStorage";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExercise(value: unknown): value is Exercise {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.bodyAreas) &&
    value.bodyAreas.every((area) => typeof area === "string") &&
    (typeof value.position === "string" ||
      value.position === null ||
      value.position === undefined) &&
    typeof value.level === "string" &&
    typeof value.sets === "string" &&
    Array.isArray(value.images) &&
    value.images.every((image) => typeof image === "string") &&
    typeof value.load === "string" &&
    typeof value.startingPosition === "string" &&
    typeof value.movementSequence === "string" &&
    typeof value.modifications === "string"
  );
}

function isPlan(value: unknown): value is Plan {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    Array.isArray(value.content) &&
    value.content.every(
      (item) =>
        isRecord(item) &&
        (item.type === "exercise" || item.type === "sequence") &&
        typeof item.id === "string",
    )
  );
}

function isSequence(value: unknown): value is Sequence {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    Array.isArray(value.exerciseIds) &&
    value.exerciseIds.every((id) => typeof id === "string")
  );
}

function isCalendarEntry(value: unknown): value is CalendarEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    typeof value.hour === "number" &&
    Number.isInteger(value.hour) &&
    value.hour >= 16 &&
    value.hour <= 21 &&
    typeof value.planId === "string" &&
    typeof value.planName === "string" &&
    typeof value.description === "string"
  );
}

function isFavorite(value: unknown): value is Favorite {
  if (!isRecord(value)) return false;
  return (
    (value.type === "exercise" ||
      value.type === "plan" ||
      value.type === "sequence") &&
    typeof value.id === "string"
  );
}

function isExerciseNote(value: unknown): value is ExerciseNote {
  return (
    isRecord(value) &&
    typeof value.exerciseId === "string" &&
    typeof value.note === "string"
  );
}

function isSequenceNote(value: unknown): value is SequenceNote {
  return (
    isRecord(value) &&
    typeof value.sequenceId === "string" &&
    typeof value.note === "string"
  );
}

function readArray<T>(
  record: JsonRecord,
  key: string,
  isItem: (value: unknown) => value is T,
): T[] {
  const value = record[key];
  if (!Array.isArray(value) || !value.every(isItem)) {
    throw new Error(`Plik kopii zapasowej zawiera nieprawidłowe dane: ${key}.`);
  }
  return value;
}

function hasUniqueValues<T>(
  values: T[],
  getKey: (value: T) => string,
): boolean {
  return new Set(values.map(getKey)).size === values.length;
}

export async function importJsonBackup(contents: string): Promise<void> {
  const parsedValue: unknown = JSON.parse(contents);
  if (
    !isRecord(parsedValue) ||
    (parsedValue.formatVersion !== undefined && parsedValue.formatVersion !== 1)
  ) {
    throw new Error(
      "Wybrany plik nie jest obsługiwaną kopią zapasową PilateSet.",
    );
  }

  const exercises = readArray(parsedValue, "exercises.json", isExercise);
  const favorites = readArray(parsedValue, "favorites.json", isFavorite);
  const exerciseNotes = readArray(
    parsedValue,
    "exercise-notes.json",
    isExerciseNote,
  );
  const sequenceNotes = readArray(
    parsedValue,
    "sequence-notes.json",
    isSequenceNote,
  );
  const plans = readArray(parsedValue, "plans.json", isPlan);
  const sequences = readArray(parsedValue, "sequences.json", isSequence);
  const calendar = readArray(parsedValue, "calendar.json", isCalendarEntry);

  const initialExercisesById = new Map(
    (initialExercises as Exercise[]).map((exercise) => [exercise.id, exercise]),
  );
  if (
    exercises.length !== initialExercisesById.size ||
    exercises.some((exercise) => !initialExercisesById.has(exercise.id)) ||
    !hasUniqueValues(exercises, (exercise) => exercise.id)
  ) {
    throw new Error("Kopia zapasowa zawiera nieprawidłowy katalog ćwiczeń.");
  }

  if (
    !hasUniqueValues(plans, (plan) => plan.id) ||
    !hasUniqueValues(sequences, (sequence) => sequence.id) ||
    !hasUniqueValues(calendar, (entry) => entry.id) ||
    !hasUniqueValues(exerciseNotes, (note) => note.exerciseId) ||
    !hasUniqueValues(sequenceNotes, (note) => note.sequenceId) ||
    !hasUniqueValues(favorites, (favorite) => `${favorite.type}:${favorite.id}`)
  ) {
    throw new Error("Kopia zapasowa zawiera powtórzone pozycje.");
  }

  const exerciseOverrides = exercises.filter(
    (exercise) =>
      JSON.stringify(exercise) !==
      JSON.stringify(initialExercisesById.get(exercise.id)),
  );
  const planIds = new Set(plans.map((plan) => plan.id));
  const sequenceIds = new Set(sequences.map((sequence) => sequence.id));
  const calendarIds = new Set(calendar.map((entry) => entry.id));
  const deletedPlanIds = (initialPlans as Plan[])
    .map((plan) => plan.id)
    .filter((id) => !planIds.has(id));
  const deletedSequenceIds = (initialSequences as Sequence[])
    .map((sequence) => sequence.id)
    .filter((id) => !sequenceIds.has(id));
  const deletedCalendarIds = (initialCalendar as CalendarEntry[])
    .map((entry) => entry.id)
    .filter((id) => !calendarIds.has(id));

  clearFavoritesCache();
  await Promise.all([
    writeJsonFile(
      "exercise-overrides.json",
      "pilateset.exerciseOverrides.v1",
      JSON.stringify(exerciseOverrides, null, 2),
    ),
    writeJsonFile(
      "favorites.json",
      "pilateset.favorites.v1",
      JSON.stringify(favorites, null, 2),
    ),
    writeJsonFile(
      "exercise-notes.json",
      "pilateset.exerciseNotes.v1",
      JSON.stringify(exerciseNotes, null, 2),
    ),
    writeJsonFile(
      "sequence-notes.json",
      "pilateset.sequenceNotes.v1",
      JSON.stringify(sequenceNotes, null, 2),
    ),
    writeJsonFile(
      "plans.json",
      "pilateset.plans.v1",
      JSON.stringify(plans, null, 2),
    ),
    writeJsonFile(
      "sequences.json",
      "pilateset.sequences.v1",
      JSON.stringify(sequences, null, 2),
    ),
    writeJsonFile(
      "calendar.json",
      "pilateset.calendar.v1",
      JSON.stringify(calendar, null, 2),
    ),
    writeJsonFile(
      "deleted-plans.json",
      "pilateset.deletedPlans.v1",
      JSON.stringify(deletedPlanIds, null, 2),
    ),
    writeJsonFile(
      "deleted-sequences.json",
      "pilateset.deletedSequences.v1",
      JSON.stringify(deletedSequenceIds, null, 2),
    ),
    writeJsonFile(
      "deleted-calendar-entries.json",
      "pilateset.deletedCalendarEntries.v1",
      JSON.stringify(deletedCalendarIds, null, 2),
    ),
  ]);
  clearFavoritesCache();
}
