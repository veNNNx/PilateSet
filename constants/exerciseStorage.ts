import initialExercises from "../data/exercises.json";
import { readJsonFile, writeJsonFile } from "./jsonFileStorage";
import type { Exercise } from "./exercises";

const STORAGE_FILE = "exercise-overrides.json";
const STORAGE_KEY = "pilateset.exerciseOverrides.v1";
const initialExerciseList: Exercise[] = initialExercises;
const removedExerciseIds = new Set(
  Array.from({ length: 14 }, (_, index) => String(index + 16)),
);

function isExercise(value: unknown): value is Exercise {
  if (typeof value !== "object" || value === null) return false;
  const exercise = value as Record<string, unknown>;
  return (
    typeof exercise.id === "string" &&
    typeof exercise.name === "string" &&
    Array.isArray(exercise.bodyAreas) &&
    exercise.bodyAreas.every((area) => typeof area === "string") &&
    (typeof exercise.position === "string" ||
      exercise.position === null ||
      exercise.position === undefined) &&
    typeof exercise.level === "string" &&
    typeof exercise.sets === "string" &&
    Array.isArray(exercise.images) &&
    exercise.images.every((image) => typeof image === "string") &&
    typeof exercise.load === "string" &&
    typeof exercise.startingPosition === "string" &&
    typeof exercise.movementSequence === "string" &&
    typeof exercise.modifications === "string"
  );
}

async function loadExerciseOverrides(): Promise<Exercise[]> {
  const storedValue = await readJsonFile(STORAGE_FILE, STORAGE_KEY);
  if (storedValue === null) return [];

  const parsedValue: unknown = JSON.parse(storedValue);
  if (!Array.isArray(parsedValue) || !parsedValue.every(isExercise)) {
    throw new Error("Zapis zmian ćwiczeń jest nieprawidłowy.");
  }
  const ids = new Set<string>();
  const initialIds = new Set(
    initialExerciseList.map((exercise) => exercise.id),
  );
  const activeOverrides: Exercise[] = [];
  for (const exercise of parsedValue) {
    if (removedExerciseIds.has(exercise.id)) continue;
    if (!initialIds.has(exercise.id) || ids.has(exercise.id)) {
      throw new Error(
        "Zapis zmian ćwiczeń zawiera nieprawidłowe identyfikatory.",
      );
    }
    ids.add(exercise.id);
    activeOverrides.push(exercise);
  }
  return activeOverrides;
}

export async function loadExercises(): Promise<Exercise[]> {
  const overrides = await loadExerciseOverrides();
  const overridesById = new Map(
    overrides.map((exercise) => [exercise.id, exercise]),
  );
  return initialExerciseList.map(
    (exercise) => overridesById.get(exercise.id) ?? exercise,
  );
}

export async function saveExercise(
  updatedExercise: Exercise,
): Promise<Exercise[]> {
  if (
    !isExercise(updatedExercise) ||
    !initialExerciseList.some((exercise) => exercise.id === updatedExercise.id)
  ) {
    throw new Error("Nie można zapisać nieprawidłowego ćwiczenia.");
  }

  const overrides = await loadExerciseOverrides();
  const updatedOverrides = [
    ...overrides.filter((exercise) => exercise.id !== updatedExercise.id),
    updatedExercise,
  ];
  await writeJsonFile(
    STORAGE_FILE,
    STORAGE_KEY,
    JSON.stringify(updatedOverrides, null, 2),
  );
  return loadExercises();
}
