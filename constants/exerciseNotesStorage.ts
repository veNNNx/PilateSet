import { loadNotes, saveNote } from "./storageHelpers";

const STORAGE_FILE = "exercise-notes.json";
const STORAGE_KEY = "pilateset.exerciseNotes.v1";

export interface ExerciseNote {
  exerciseId: string;
  note: string;
}

function isExerciseNote(value: unknown): value is ExerciseNote {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.exerciseId === "string" && typeof entry.note === "string";
}

export async function loadExerciseNotes(): Promise<ExerciseNote[]> {
  return loadNotes(
    STORAGE_FILE,
    STORAGE_KEY,
    "Zapis notatek do ćwiczeń jest nieprawidłowy.",
    isExerciseNote,
  );
}

export async function saveExerciseNote(
  exerciseId: string,
  note: string,
): Promise<void> {
  await saveNote(
    STORAGE_FILE,
    STORAGE_KEY,
    loadExerciseNotes,
    (item) => item.exerciseId,
    (id, value) => ({ exerciseId: id, note: value }),
    exerciseId,
    note,
  );
}
