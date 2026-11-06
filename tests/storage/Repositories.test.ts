import initialPlans from "../../data/plans.json";
import initialSequences from "../../data/sequences.json";
import initialCalendar from "../../data/calendar.json";
import initialExercises from "../../data/exercises.json";
import {
  getNextPlanId,
  loadPlans,
  savePlan,
  type Plan,
} from "../../constants/planStorage";
import {
  getNextSequenceId,
  loadSequences,
  saveSequence,
} from "../../constants/sequenceStorage";
import {
  loadCalendarEntries,
  saveCalendarEntries,
  saveCalendarEntry,
} from "../../constants/calendarStorage";
import { loadExercises, saveExercise } from "../../constants/exerciseStorage";

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

jest.mock("../../constants/jsonFileStorage", () => {
  const contents = new Map<string, string>();
  return {
    readJsonFile: jest.fn(
      async (_filename: string, key: string) => contents.get(key) ?? null,
    ),
    writeJsonFile: jest.fn(
      async (_filename: string, key: string, value: string) => {
        contents.set(key, value);
      },
    ),
    __contents: contents,
  };
});

const contents = (
  jest.requireMock<any>("../../constants/jsonFileStorage") as {
    __contents: Map<string, string>;
  }
).__contents;

const customPlan: Plan = {
  id: "p100",
  name: "Custom plan",
  description: "A new routine",
  content: [{ type: "exercise", id: "1" }],
};
const customSequence = {
  id: "s100",
  name: "Custom sequence",
  description: "A new flow",
  exerciseIds: ["1"],
};
const customCalendarEntry = {
  id: "entry-100",
  date: "2099-12-31",
  hour: 18,
  planId: "p100",
  planName: "Custom plan",
  description: "Test entry",
};

beforeEach(() => {
  contents.clear();
});

describe("plan storage", () => {
  it("loads bundled plans and returns the next unused plan id", async () => {
    expect(await loadPlans()).toEqual(initialPlans);
    expect(await getNextPlanId()).toBe(`p${initialPlans.length + 1}`);
  });

  it("saves custom plans and rejects invalid identifiers and corrupted data", async () => {
    await expect(savePlan({ ...customPlan, id: "invalid" })).rejects.toThrow(
      "Identyfikator planu musi mieć format p1, p2, p3…",
    );
    await savePlan(customPlan);
    expect(await loadPlans()).toContainEqual(customPlan);

    contents.set(
      "pilateset.plans.v1",
      JSON.stringify([{ ...customPlan, id: 100 }]),
    );
    await expect(loadPlans()).rejects.toThrow(
      "Zapis planów jest nieprawidłowy.",
    );
  });
});

describe("sequence storage", () => {
  it("loads bundled sequences and returns the next unused sequence id", async () => {
    expect(await loadSequences()).toEqual(initialSequences);
    expect(await getNextSequenceId()).toBe(`s${initialSequences.length + 1}`);
  });

  it("saves custom sequences and rejects malformed records", async () => {
    await expect(
      saveSequence({ ...customSequence, id: "invalid" }),
    ).rejects.toThrow("Identyfikator sekwencji musi mieć format s1, s2, s3…");
    await saveSequence(customSequence);
    expect(await loadSequences()).toContainEqual(customSequence);

    contents.set(
      "pilateset.sequences.v1",
      JSON.stringify([{ ...customSequence, exerciseIds: [1] }]),
    );
    await expect(loadSequences()).rejects.toThrow(
      "Zapis sekwencji jest nieprawidłowy.",
    );
  });
});

describe("calendar storage", () => {
  it("loads bundled calendar entries and persists new entries", async () => {
    expect(await loadCalendarEntries()).toEqual(initialCalendar);

    await saveCalendarEntry(customCalendarEntry);

    expect(await loadCalendarEntries()).toContainEqual(customCalendarEntry);
  });

  it("persists multiple calendar entries in one batch", async () => {
    const additionalEntry = {
      ...customCalendarEntry,
      id: "entry-101",
      hour: 19,
    };

    await saveCalendarEntries([customCalendarEntry, additionalEntry]);

    expect(await loadCalendarEntries()).toEqual([
      ...initialCalendar,
      customCalendarEntry,
      additionalEntry,
    ]);
  });

  it("rejects invalid stored calendar entries", async () => {
    contents.set(
      "pilateset.calendar.v1",
      JSON.stringify([{ ...customCalendarEntry, hour: 22 }]),
    );

    await expect(loadCalendarEntries()).rejects.toThrow(
      "Zapis kalendarza jest nieprawidłowy.",
    );
  });
});

describe("exercise storage", () => {
  it("loads the catalog and persists valid edits as overrides", async () => {
    expect(await loadExercises()).toEqual(initialExercises);
    const updatedExercise = {
      ...initialExercises[0],
      name: "Updated exercise",
    };

    const savedExercises = await saveExercise(updatedExercise);

    expect(savedExercises[0]).toEqual(updatedExercise);
    expect(
      JSON.parse(contents.get("pilateset.exerciseOverrides.v1") ?? "[]"),
    ).toEqual([updatedExercise]);
  });

  it("rejects edits to exercises outside the bundled catalog", async () => {
    await expect(
      saveExercise({
        ...initialExercises[0],
        id: "custom-exercise",
      }),
    ).rejects.toThrow("Nie można zapisać nieprawidłowego ćwiczenia.");
  });
});
