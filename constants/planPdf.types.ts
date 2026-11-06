import type { Exercise } from "./exercises";

export type PlanPdfExercise = {
  number: string;
  exercise: Exercise;
};

export type PlanPdfItem =
  | (PlanPdfExercise & { type: "exercise" })
  | {
      type: "sequence";
      number: string;
      name: string;
      description: string;
      exercises: PlanPdfExercise[];
    };

export type PlanPdfDocument = {
  name: string;
  description: string;
  items: PlanPdfItem[];
  html: string;
};
