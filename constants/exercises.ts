import exerciseData from "../data/exercises.json";

export type Exercise = Omit<(typeof exerciseData)[number], "position"> & {
  position?: string | null;
  load: string;
  startingPosition: string;
  movementSequence: string;
  modifications: string;
};

const exercises: Exercise[] = exerciseData;

export default exercises;
