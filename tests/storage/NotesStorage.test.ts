import {
  loadExerciseNotes,
  saveExerciseNote,
} from "../../constants/exerciseNotesStorage";
import {
  loadSequenceNotes,
  saveSequenceNote,
} from "../../constants/sequenceNotesStorage";

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

beforeEach(() => contents.clear());

describe("exercise notes storage", () => {
  it("loads empty notes, trims new notes, replaces existing notes, and deletes on blank input", async () => {
    await expect(loadExerciseNotes()).resolves.toEqual([]);
    await saveExerciseNote("1", "  First note  ");
    await saveExerciseNote("1", "  Revised note  ");
    expect(await loadExerciseNotes()).toEqual([
      { exerciseId: "1", note: "Revised note" },
    ]);
    await saveExerciseNote("1", "  ");
    expect(await loadExerciseNotes()).toEqual([]);
  });

  it("rejects malformed saved records", async () => {
    contents.set(
      "pilateset.exerciseNotes.v1",
      JSON.stringify([{ exerciseId: 1, note: "bad" }]),
    );
    await expect(loadExerciseNotes()).rejects.toThrow(
      "Zapis notatek do ćwiczeń jest nieprawidłowy.",
    );
  });
});

describe("sequence notes storage", () => {
  it("migrates legacy sequence IDs, persists normalization, and saves by canonical ID", async () => {
    contents.set(
      "pilateset.sequences.v1",
      JSON.stringify([
        {
          id: "sample-sequence-footwork",
          name: "legacy",
          description: "",
          exerciseIds: ["1"],
        },
      ]),
    );
    contents.set(
      "pilateset.sequenceNotes.v1",
      JSON.stringify([
        { sequenceId: "sample-sequence-footwork", note: "Keep" },
      ]),
    );
    expect(await loadSequenceNotes()).toEqual([
      { sequenceId: "s1", note: "Keep" },
    ]);
    expect(
      JSON.parse(contents.get("pilateset.sequenceNotes.v1") ?? "[]"),
    ).toEqual([{ sequenceId: "s1", note: "Keep" }]);
    await saveSequenceNote("s1", "Updated");
    expect(await loadSequenceNotes()).toEqual([
      { sequenceId: "s1", note: "Updated" },
    ]);
    await saveSequenceNote("s1", "");
    expect(await loadSequenceNotes()).toEqual([]);
  });

  it("rejects malformed sequence notes", async () => {
    contents.set(
      "pilateset.sequenceNotes.v1",
      JSON.stringify([{ sequenceId: "s1", note: null }]),
    );
    await expect(loadSequenceNotes()).rejects.toThrow(
      "Zapis notatek do sekwencji jest nieprawidłowy.",
    );
  });
});
