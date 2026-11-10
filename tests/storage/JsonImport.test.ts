import initialExercises from "../../data/exercises.json";
import initialPlans from "../../data/plans.json";
import initialSequences from "../../data/sequences.json";
import initialCalendar from "../../data/calendar.json";
import { importJsonBackup } from "../../constants/jsonImport";
import { loadFavorites } from "../../constants/favoritesStorage";
import type { CalendarEntry } from "../../constants/calendarStorage";
import type { Plan } from "../../constants/planStorage";
import type { Sequence } from "../../constants/sequenceStorage";

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
const exercises = initialExercises;

function createBackup(): Record<string, unknown> {
  return {
    formatVersion: 1,
    "exercises.json": exercises,
    "favorites.json": [],
    "exercise-notes.json": [],
    "sequence-notes.json": [],
    "plans.json": [],
    "sequences.json": [],
    "calendar.json": [],
  };
}

beforeEach(() => {
  contents.clear();
});

describe("JSON backup import", () => {
  it("restores user data, exercise edits, and removed default entries", async () => {
    await loadFavorites();
    const backup = createBackup();
    backup["exercises.json"] = [
      { ...exercises[0], name: "Imported exercise" },
      ...exercises.slice(1),
    ];
    backup["favorites.json"] = [{ type: "exercise", id: exercises[0].id }];
    backup["plans.json"] = [
      {
        id: "p100",
        name: "Restored plan",
        description: "",
        content: [{ type: "exercise", id: exercises[0].id }],
      },
    ];

    await importJsonBackup(JSON.stringify(backup));

    expect(
      JSON.parse(contents.get("pilateset.exerciseOverrides.v1") ?? "[]"),
    ).toContainEqual(expect.objectContaining({ name: "Imported exercise" }));
    expect(JSON.parse(contents.get("pilateset.favorites.v1") ?? "[]")).toEqual(
      backup["favorites.json"],
    );
    expect(await loadFavorites()).toEqual(backup["favorites.json"]);
    expect(JSON.parse(contents.get("pilateset.plans.v1") ?? "[]")).toEqual(
      backup["plans.json"],
    );
    expect(
      JSON.parse(contents.get("pilateset.deletedPlans.v1") ?? "[]"),
    ).toEqual((initialPlans as Plan[]).map((plan) => plan.id));
    expect(
      JSON.parse(contents.get("pilateset.deletedSequences.v1") ?? "[]"),
    ).toEqual((initialSequences as Sequence[]).map((sequence) => sequence.id));
    expect(
      JSON.parse(contents.get("pilateset.deletedCalendarEntries.v1") ?? "[]"),
    ).toEqual((initialCalendar as CalendarEntry[]).map((entry) => entry.id));
  });

  it("imports section load and drops legacy repetition counts", async () => {
    const backup = createBackup();
    backup["exercises.json"] = [
      {
        ...exercises[0],
        name: "Imported exercise",
        load: "Heavy spring",
        sets: "3 × 10 powt.",
      },
      ...exercises.slice(1),
    ];
    const sequence = {
      id: "s100",
      name: "Imported section",
      description: "",
      load: "Medium spring",
      exerciseIds: [exercises[0].id],
    };
    backup["sequences.json"] = [sequence];

    await importJsonBackup(JSON.stringify(backup));

    const importedExercises = JSON.parse(
      contents.get("pilateset.exerciseOverrides.v1") ?? "[]",
    ) as Record<string, unknown>[];
    expect(importedExercises).toEqual([
      { ...exercises[0], name: "Imported exercise", load: "Heavy spring" },
    ]);
    expect(importedExercises[0]).not.toHaveProperty("sets");
    expect(
      JSON.parse(contents.get("pilateset.sequences.v1") ?? "[]"),
    ).toEqual([sequence]);
  });

  it("rejects malformed backup data before writing anything", async () => {
    const backup = createBackup();
    backup["calendar.json"] = [
      {
        id: "entry",
        date: "2099-12-31",
        hour: 22,
        planId: "p1",
        planName: "Invalid",
        description: "",
      },
    ];

    await expect(importJsonBackup(JSON.stringify(backup))).rejects.toThrow(
      "Plik kopii zapasowej zawiera nieprawidłowe dane: calendar.json.",
    );
    expect(contents.size).toBe(0);
  });
});
