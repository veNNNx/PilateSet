import exercises from "../../data/exercises.json";
import { importJsonBackup } from "../../constants/jsonImport";

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

function backup(): Record<string, unknown> {
  return {
    formatVersion: 1,
    exportedAt: "2026-01-02T03:04:05.000Z",
    "exercises.json": exercises,
    "bodyAreas.json": ["nogi"],
    "exerciseLevels.json": ["Początkujący"],
    "exercisePositions.json": ["Supine (plecy)"],
    "favorites.json": [],
    "exercise-notes.json": [],
    "sequence-notes.json": [],
    "plans.json": [],
    "sequences.json": [],
    "calendar.json": [],
  };
}

beforeEach(() => contents.clear());

describe("backup import validation", () => {
  it.each([
    ["not-json", () => "not-json", undefined],
    [
      "null root",
      () => "null",
      "Wybrany plik nie jest obsługiwaną kopią zapasową PilateSet.",
    ],
    [
      "array root",
      () => "[]",
      "Wybrany plik nie jest obsługiwaną kopią zapasową PilateSet.",
    ],
    [
      "unsupported version",
      () => JSON.stringify({ ...backup(), formatVersion: 2 }),
      "Wybrany plik nie jest obsługiwaną kopią zapasową PilateSet.",
    ],
    [
      "missing required collection",
      () => {
        const data = backup();
        delete data["plans.json"];
        return JSON.stringify(data);
      },
      "Plik kopii zapasowej zawiera nieprawidłowe dane: plans.json.",
    ],
    [
      "wrong collection type",
      () => JSON.stringify({ ...backup(), "favorites.json": {} }),
      "Plik kopii zapasowej zawiera nieprawidłowe dane: favorites.json.",
    ],
    [
      "invalid exercise shape",
      () =>
        JSON.stringify({
          ...backup(),
          "exercises.json": [{ ...exercises[0], bodyAreas: [1] }],
        }),
      "Plik kopii zapasowej zawiera nieprawidłowe dane: exercises.json.",
    ],
    [
      "incomplete catalog",
      () =>
        JSON.stringify({ ...backup(), "exercises.json": exercises.slice(1) }),
      "Kopia zapasowa zawiera nieprawidłowy katalog ćwiczeń.",
    ],
    [
      "foreign exercise ID",
      () =>
        JSON.stringify({
          ...backup(),
          "exercises.json": [
            { ...exercises[0], id: "foreign" },
            ...exercises.slice(1),
          ],
        }),
      "Kopia zapasowa zawiera nieprawidłowy katalog ćwiczeń.",
    ],
    [
      "duplicate exercise IDs",
      () =>
        JSON.stringify({
          ...backup(),
          "exercises.json": [exercises[0], exercises[0], ...exercises.slice(2)],
        }),
      "Kopia zapasowa zawiera nieprawidłowy katalog ćwiczeń.",
    ],
    [
      "malformed favorite",
      () =>
        JSON.stringify({
          ...backup(),
          "favorites.json": [{ type: "other", id: "1" }],
        }),
      "Plik kopii zapasowej zawiera nieprawidłowe dane: favorites.json.",
    ],
    [
      "malformed exercise note",
      () =>
        JSON.stringify({
          ...backup(),
          "exercise-notes.json": [{ exerciseId: "1", note: 3 }],
        }),
      "Plik kopii zapasowej zawiera nieprawidłowe dane: exercise-notes.json.",
    ],
    [
      "malformed sequence note",
      () =>
        JSON.stringify({
          ...backup(),
          "sequence-notes.json": [{ sequenceId: "s1" }],
        }),
      "Plik kopii zapasowej zawiera nieprawidłowe dane: sequence-notes.json.",
    ],
    [
      "malformed plan",
      () =>
        JSON.stringify({
          ...backup(),
          "plans.json": [
            {
              id: "p1",
              name: "bad",
              description: "",
              content: [{ type: "other", id: "1" }],
            },
          ],
        }),
      "Plik kopii zapasowej zawiera nieprawidłowe dane: plans.json.",
    ],
    [
      "malformed sequence",
      () =>
        JSON.stringify({
          ...backup(),
          "sequences.json": [
            { id: "s1", name: "bad", description: "", exerciseIds: [1] },
          ],
        }),
      "Plik kopii zapasowej zawiera nieprawidłowe dane: sequences.json.",
    ],
    [
      "invalid calendar hour",
      () =>
        JSON.stringify({
          ...backup(),
          "calendar.json": [
            {
              id: "c1",
              date: "2026-01-01",
              hour: 22,
              planId: "p1",
              planName: "Plan",
              description: "",
            },
          ],
        }),
      "Plik kopii zapasowej zawiera nieprawidłowe dane: calendar.json.",
    ],
  ])(
    "rejects %s without writing any records",
    async (_name, getContents, expected) => {
      const input = getContents();
      if (expected)
        await expect(importJsonBackup(input)).rejects.toThrow(expected);
      else await expect(importJsonBackup(input)).rejects.toThrow(SyntaxError);
      expect(contents.size).toBe(0);
    },
  );

  it.each([
    [
      "plans",
      "plans.json",
      [
        { id: "p1", name: "A", description: "", content: [] },
        { id: "p1", name: "B", description: "", content: [] },
      ],
    ],
    [
      "sequences",
      "sequences.json",
      [
        { id: "s1", name: "A", description: "", exerciseIds: [] },
        { id: "s1", name: "B", description: "", exerciseIds: [] },
      ],
    ],
    [
      "calendar entries",
      "calendar.json",
      [
        {
          id: "c1",
          date: "2026-01-01",
          hour: 18,
          planId: "p1",
          planName: "A",
          description: "",
        },
        {
          id: "c1",
          date: "2026-01-02",
          hour: 19,
          planId: "p1",
          planName: "A",
          description: "",
        },
      ],
    ],
    [
      "exercise notes",
      "exercise-notes.json",
      [
        { exerciseId: "1", note: "A" },
        { exerciseId: "1", note: "B" },
      ],
    ],
    [
      "sequence notes",
      "sequence-notes.json",
      [
        { sequenceId: "s1", note: "A" },
        { sequenceId: "s1", note: "B" },
      ],
    ],
    [
      "favorites",
      "favorites.json",
      [
        { type: "exercise", id: "1" },
        { type: "exercise", id: "1" },
      ],
    ],
  ])("rejects duplicate %s", async (_label, key, value) => {
    await expect(
      importJsonBackup(JSON.stringify({ ...backup(), [key]: value })),
    ).rejects.toThrow("Kopia zapasowa zawiera powtórzone pozycje.");
    expect(contents.size).toBe(0);
  });

  it("accepts an older backup without a format version", async () => {
    const data = backup();
    delete data.formatVersion;
    await expect(
      importJsonBackup(JSON.stringify(data)),
    ).resolves.toBeUndefined();
  });

  it("accepts the Info screen export shape including metadata and informational taxonomy", async () => {
    const data = backup();
    await expect(
      importJsonBackup(JSON.stringify(data)),
    ).resolves.toBeUndefined();
    expect(contents.has("pilateset.exerciseOverrides.v1")).toBe(true);
    expect(contents.get("pilateset.plans.v1")).toBe("[]");
  });
});
