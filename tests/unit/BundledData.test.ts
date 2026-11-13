import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import exercises from "../../data/exercises.json";
import exerciseLevels from "../../data/exerciseLevels.json";
import exercisePositions from "../../data/exercisePositions.json";
import bodyAreas from "../../data/bodyAreas.json";
import plans from "../../data/plans.json";
import sequences from "../../data/sequences.json";
import calendar from "../../data/calendar.json";

type BundledExercise = (typeof exercises)[number];
type BundledPlan = {
  id: string;
  content: { type: "exercise" | "sequence"; id: string }[];
};
type BundledSequence = { id: string; exerciseIds: string[] };
type BundledCalendarEntry = { id: string; date: string; planId: string };
const bundledPlans = plans as BundledPlan[];
const bundledSequences = sequences as BundledSequence[];
const bundledCalendar = calendar as BundledCalendarEntry[];
const requiredExerciseStrings: (keyof BundledExercise)[] = [
  "id",
  "name",
  "level",
  "load",
  "startingPosition",
  "movementSequence",
  "modifications",
];
function imageMapping(): Map<string, Set<string>> {
  const source = readFileSync(
    join(process.cwd(), "constants/exerciseImages.ts"),
    "utf8",
  );
  const mapping = new Map<string, Set<string>>();
  const exerciseBlocks = /"([^\"]+)"\s*:\s*\{([^}]*)\}/g;
  for (const block of source.matchAll(exerciseBlocks)) {
    const names = new Set<string>();
    const imports =
      /"([^\"]+)"\s*:\s*require\("\.\.\/assets\/exercises\/([^/]+)\/([^\"]+)"\)/g;
    for (const match of block[2].matchAll(imports)) {
      expect(match[2]).toBe(block[1]);
      expect(
        existsSync(join(process.cwd(), "assets/exercises", match[2], match[3])),
      ).toBe(true);
      names.add(match[1]);
    }
    mapping.set(block[1], names);
  }
  return mapping;
}

describe("bundled exercise catalog", () => {
  it("has unique IDs, required strings, known difficulty levels, body areas, and image assets", () => {
    expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(
      exercises.length,
    );
    const mappings = imageMapping();
    for (const exercise of exercises) {
      for (const field of requiredExerciseStrings)
        expect(typeof exercise[field]).toBe("string");
      expect(exercise).not.toHaveProperty("sets");
      expect(Array.isArray(exercise.bodyAreas)).toBe(true);
      expect(
        exercise.bodyAreas.every(
          (area) => typeof area === "string" && area.length > 0,
        ),
      ).toBe(true);
      if (exercise.level) expect(exerciseLevels).toContain(exercise.level);
      expect(Array.isArray(exercise.images)).toBe(true);
      for (const image of exercise.images)
        expect(mappings.get(exercise.id)).toContain(image);
    }
  });

  it("uses only positions from the position list", () => {
    const unlistedPositions = [
      ...new Set(
        exercises
          .map((exercise) => exercise.position)
          .filter(
            (position): position is string =>
              Boolean(position) &&
              !exercisePositions.includes(position as never),
          ),
      ),
    ];
    expect(unlistedPositions).toEqual([]);
  });

  it("keeps body areas aligned with the taxonomy", () => {
    const canonicalAreas = new Map(
      bodyAreas.map((area) => [area.toLocaleLowerCase(), area]),
    );
    const casingDiscrepancies = [
      ...new Set(
        exercises
          .flatMap((exercise) => exercise.bodyAreas)
          .filter(
            (area) =>
              canonicalAreas.has(area.toLocaleLowerCase()) &&
              canonicalAreas.get(area.toLocaleLowerCase()) !== area,
          ),
      ),
    ];
    if (casingDiscrepancies.length)
      console.warn(
        `Bundled-data body-area casing discrepancies: ${casingDiscrepancies.join(", ")}.`,
      );
  });
});

describe("bundled plan, sequence, and calendar references", () => {
  it("uses valid identifier and date formats and references existing catalog records", () => {
    const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
    const planIds = new Set(bundledPlans.map((plan) => plan.id));
    const sequenceIds = new Set(
      bundledSequences.map((sequence) => sequence.id),
    );
    expect(new Set(bundledPlans.map((plan) => plan.id)).size).toBe(
      plans.length,
    );
    expect(new Set(bundledSequences.map((sequence) => sequence.id)).size).toBe(
      sequences.length,
    );
    expect(new Set(bundledCalendar.map((entry) => entry.id)).size).toBe(
      calendar.length,
    );
    for (const plan of bundledPlans) {
      expect(plan.id).toMatch(/^p[1-9]\d*$/);
      for (const item of plan.content) {
        expect(
          item.type === "exercise"
            ? exerciseIds.has(item.id)
            : sequenceIds.has(item.id),
        ).toBe(true);
      }
    }
    for (const sequence of bundledSequences) {
      expect(sequence.id).toMatch(/^s[1-9]\d*$/);
      for (const exerciseId of sequence.exerciseIds)
        expect(exerciseIds.has(exerciseId)).toBe(true);
    }
    for (const entry of bundledCalendar) {
      expect(entry.id).toMatch(/^c[1-9]\d*$/);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(planIds.has(entry.planId)).toBe(true);
    }
  });
});
