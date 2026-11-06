import {
  getPlanExerciseIds,
  getPlanLevels,
  getSequenceLevels,
} from "../../constants/planLevels";
import { sortFavoritesByName } from "../../constants/sorting";
import {
  formatBodyAreas,
  formatExercisePosition,
} from "../../constants/taxonomy";
import { canonicalPlanId, getPlanIdMap } from "../../constants/planIds";
import {
  canonicalSequenceId,
  getSequenceIdMap,
} from "../../constants/sequenceIds";
import {
  dateKeyFromDate,
  formatDateKey,
  formatDateInput,
  formatHour,
  parseDateInput,
} from "../../constants/dateUtils";
import { formatPolishCount } from "../../constants/formatting";
import exercises from "../../constants/exercises";
import exerciseLevels from "../../data/exerciseLevels.json";

jest.mock(
  "../../data/exercises.json",
  () =>
    jest.requireActual<typeof import("../fixtures/data")>("../fixtures/data")
      .exercises,
);
jest.mock(
  "../../data/plans.json",
  () =>
    jest.requireActual<typeof import("../fixtures/data")>("../fixtures/data")
      .initialPlans,
);
jest.mock(
  "../../data/sequences.json",
  () =>
    jest.requireActual<typeof import("../fixtures/data")>("../fixtures/data")
      .initialSequences,
);
jest.mock(
  "../../data/calendar.json",
  () =>
    jest.requireActual<typeof import("../fixtures/data")>("../fixtures/data")
      .initialCalendar,
);

jest.mock("../../constants/jsonFileStorage", () => ({
  readJsonFile: jest.fn().mockResolvedValue(null),
  writeJsonFile: jest.fn().mockResolvedValue(undefined),
}));

describe("favorite sorting", () => {
  it("sorts favorites first and names alphabetically without mutating its input", () => {
    const items = [
      { name: "Pilates", favorite: false },
      { name: "Zebra", favorite: true },
      { name: "Alpha", favorite: true },
    ];

    const sorted = sortFavoritesByName(
      items,
      (item) => item.favorite,
      (item) => item.name,
    );

    expect(sorted.map((item) => item.name)).toEqual([
      "Alpha",
      "Zebra",
      "Pilates",
    ]);
    expect(items.map((item) => item.name)).toEqual([
      "Pilates",
      "Zebra",
      "Alpha",
    ]);
  });
});

describe("plan and sequence content", () => {
  it("expands mixed plan content into exercise ids in display order", () => {
    const plan = {
      id: "p100",
      name: "Mixed plan",
      description: "",
      content: [
        { type: "exercise" as const, id: exercises[0].id },
        { type: "sequence" as const, id: "s100" },
        { type: "exercise" as const, id: exercises[1].id },
      ],
    };
    const sequence = {
      id: "s100",
      name: "Sequence",
      description: "",
      exerciseIds: [exercises[2].id, exercises[3].id],
    };

    expect(getPlanExerciseIds(plan, [sequence])).toEqual([
      exercises[0].id,
      exercises[2].id,
      exercises[3].id,
      exercises[1].id,
    ]);
  });

  it("returns unique difficulty levels in the app-defined order", () => {
    const plan = {
      id: "p100",
      name: "Plan",
      description: "",
      content: [
        { type: "exercise" as const, id: exercises[0].id },
        { type: "exercise" as const, id: exercises[1].id },
      ],
    };

    const expectedLevels = exerciseLevels.filter((level) =>
      [exercises[0].level, exercises[1].level].includes(level),
    );
    expect(getPlanLevels(plan, exercises)).toEqual(expectedLevels);
  });

  it("returns sequence difficulty levels in the app-defined order", () => {
    const sequence = {
      id: "s100",
      name: "Sequence",
      description: "",
      exerciseIds: [exercises[1].id, "missing-exercise", exercises[0].id],
    };
    const expectedLevels = exerciseLevels.filter((level) =>
      [exercises[0].level, exercises[1].level].includes(level),
    );

    expect(getSequenceLevels(sequence, exercises)).toEqual(expectedLevels);
  });
});

describe("exercise taxonomy formatting", () => {
  it("formats body areas and optional positions for display", () => {
    expect(formatBodyAreas(["Core", "Arms"])).toBe("Core · Arms");
    expect(formatExercisePosition("Supine")).toBe("Pozycja: Supine");
    expect(formatExercisePosition(null)).toBeNull();
    expect(formatExercisePosition(undefined)).toBeNull();
  });
});

describe("shared date and count formatting", () => {
  it("formats and parses local calendar dates without shifting the day", () => {
    const date = new Date(2026, 9, 28);
    expect(dateKeyFromDate(date)).toBe("2026-10-28");
    expect(formatDateInput(date)).toBe("28.10.2026");
    expect(parseDateInput("28.10.2026")).toBe("2026-10-28");
    expect(parseDateInput("31.02.2026")).toBeNull();
    expect(
      formatDateKey("2026-10-28", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    ).toBe("28 października 2026");
    expect(formatHour(8)).toBe("08:00");
  });

  it("uses the correct Polish singular, few, and plural forms", () => {
    expect(formatPolishCount(1, "ćwiczenie", "ćwiczenia", "ćwiczeń")).toBe(
      "1 ćwiczenie",
    );
    expect(formatPolishCount(4, "ćwiczenie", "ćwiczenia", "ćwiczeń")).toBe(
      "4 ćwiczenia",
    );
    expect(formatPolishCount(12, "ćwiczenie", "ćwiczenia", "ćwiczeń")).toBe(
      "12 ćwiczeń",
    );
    expect(formatPolishCount(22, "ćwiczenie", "ćwiczenia", "ćwiczeń")).toBe(
      "22 ćwiczenia",
    );
  });
});

describe("legacy identifier migration", () => {
  it("maps legacy plan ids to their current ids and leaves unknown ids unchanged", async () => {
    const map = await getPlanIdMap();
    expect(canonicalPlanId("sample-plan-lower-body", map)).toBe("p1");
    expect(canonicalPlanId("custom-plan", map)).toBe("custom-plan");
  });

  it("maps legacy sequence ids to their current ids and leaves unknown ids unchanged", async () => {
    const map = await getSequenceIdMap();
    expect(canonicalSequenceId("sample-sequence-footwork", map)).toBe("s1");
    expect(canonicalSequenceId("custom-sequence", map)).toBe("custom-sequence");
  });
});
