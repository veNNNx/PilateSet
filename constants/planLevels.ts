import exercises, { type Exercise } from "./exercises";
import exerciseLevels from "../data/exerciseLevels.json";
import type { Plan } from "./planStorage";
import type { Sequence } from "./sequenceStorage";

export function getPlanExerciseIds(
  plan: Plan,
  sequences: Sequence[] = [],
): string[] {
  return plan.content.flatMap((item) =>
    item.type === "exercise"
      ? [item.id]
      : (sequences.find((sequence) => sequence.id === item.id)?.exerciseIds ??
        []),
  );
}

export function getSequenceLevels(
  sequence: Sequence,
  exerciseList: Exercise[] = exercises,
): string[] {
  const sequenceExerciseIds = new Set(sequence.exerciseIds);
  const includedLevels = new Set(
    exerciseList
      .filter((exercise) => sequenceExerciseIds.has(exercise.id))
      .map((exercise) => exercise.level),
  );
  return exerciseLevels.filter((level) => includedLevels.has(level));
}

export function getPlanLevels(
  plan: Plan,
  exerciseList: Exercise[] = exercises,
  sequences: Sequence[] = [],
): string[] {
  const planExerciseIds = new Set(getPlanExerciseIds(plan, sequences));
  const includedLevels = new Set(
    exerciseList
      .filter((exercise) => planExerciseIds.has(exercise.id))
      .map((exercise) => exercise.level),
  );
  return exerciseLevels.filter((level) => includedLevels.has(level));
}
