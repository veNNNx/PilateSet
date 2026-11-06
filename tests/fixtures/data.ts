/**
 * Stable, small data set used by the test suites instead of the real bundled
 * JSON in `data/`. The production catalog and bundled plans change over time;
 * tests must not depend on their size, ordering or names.
 */
type FixtureExercise = {
  id: string;
  name: string;
  bodyAreas: string[];
  position: string | null;
  level: string;
  sets: string;
  images: string[];
  load: string;
  startingPosition: string;
  movementSequence: string;
  modifications: string;
};

const base = {
  sets: "1× 10 powt.",
  images: ["1.jpg"],
  load: "Light spring",
  startingPosition: "Lie on your back.",
  movementSequence: "Breathe in, then press out.",
  modifications: "Reduce the range of motion.",
};

export const exercises: FixtureExercise[] = [
  {
    ...base,
    id: "1",
    name: "Alpha Press",
    bodyAreas: ["nogi", "mięśnie brzucha"],
    position: "Supine (plecy)",
    level: "Początkujący",
  },
  {
    ...base,
    id: "2",
    name: "Bravo Rotation",
    bodyAreas: ["plecy"],
    position: "Side-lying",
    level: "Średniozaawansowany",
  },
  {
    ...base,
    id: "3",
    name: "Charlie Reach",
    bodyAreas: ["ramiona", "klatka piersiowa"],
    position: "Standing",
    level: "Zaawansowany",
  },
  {
    ...base,
    id: "4",
    name: "Delta Bridge",
    bodyAreas: ["mięśnie pośladkowe"],
    position: null,
    level: "Początkujący",
    images: [],
  },
];

export const initialPlans = [
  {
    id: "p1",
    name: "Bundled lower body",
    description: "Bundled plan",
    content: [
      { type: "exercise" as const, id: "1" },
      { type: "exercise" as const, id: "2" },
    ],
  },
  {
    id: "p2",
    name: "Bundled upper body",
    description: "Second bundled plan",
    content: [{ type: "exercise" as const, id: "3" }],
  },
];

export const initialSequences = [
  {
    id: "s1",
    name: "Bundled warm-up",
    description: "Bundled sequence",
    exerciseIds: ["1", "4"],
  },
  {
    id: "s2",
    name: "Bundled flow",
    description: "Second bundled sequence",
    exerciseIds: ["2", "3"],
  },
];

export const initialCalendar = [
  {
    id: "c1",
    date: "2099-01-01",
    hour: 16,
    planId: "p1",
    planName: "Bundled lower body",
    description: "Bundled entry",
  },
];
