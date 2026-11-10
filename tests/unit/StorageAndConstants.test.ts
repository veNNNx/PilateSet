import {
  addDeletedId,
  createIdMigrationMap,
  loadDeletedIds,
  loadNotes,
  saveDeletedIds,
} from "../../constants/storageHelpers";
import { getExerciseImage } from "../../constants/exerciseImages";
import {
  getPlanExerciseIds,
  getPlanLevels,
  getSequenceLevels,
} from "../../constants/planLevels";
import exerciseLevels from "../../data/exerciseLevels.json";
import exercises from "../../constants/exercises";
import {
  Colors,
  DarkColors,
  getColors,
  Spacing,
  BorderRadius,
} from "../../constants/colors";
import { Typography, createTypography } from "../../constants/typography";
import { createGlobalStyles, globalStyles } from "../../constants/globalStyles";
import { canonicalPlanId, getPlanIdMap } from "../../constants/planIds";
import {
  canonicalSequenceId,
  getSequenceIdMap,
} from "../../constants/sequenceIds";

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

describe("storage helper leftovers", () => {
  it("saves and adds deleted IDs once, rejecting malformed JSON", async () => {
    await saveDeletedIds("deleted.json", "deleted", ["p1"]);
    await addDeletedId("deleted.json", "deleted", "bad deleted IDs", "p2");
    await addDeletedId("deleted.json", "deleted", "bad deleted IDs", "p2");
    expect(
      await loadDeletedIds("deleted.json", "deleted", "bad deleted IDs"),
    ).toEqual(["p1", "p2"]);
    contents.set("deleted", "{");
    await expect(
      loadDeletedIds("deleted.json", "deleted", "bad deleted IDs"),
    ).rejects.toThrow(SyntaxError);
  });

  it("validates id migration inputs and normalizes notes only when needed", async () => {
    expect(() =>
      createIdMigrationMap({}, ["p1"], [], "p", "Invalid mapping"),
    ).toThrow("Invalid mapping");
    contents.set("notes", "{");
    await expect(
      loadNotes(
        "notes.json",
        "notes",
        "Invalid notes",
        (value): value is { note: string } =>
          typeof value === "object" &&
          value !== null &&
          "note" in value &&
          typeof value.note === "string",
      ),
    ).rejects.toThrow(SyntaxError);
  });
});

describe("ID maps and plan levels", () => {
  it("canonicalizes legacy IDs and leaves custom IDs unchanged", async () => {
    expect(
      canonicalPlanId("sample-plan-lower-body", await getPlanIdMap()),
    ).toBe("p1");
    expect(
      canonicalSequenceId("sample-sequence-footwork", await getSequenceIdMap()),
    ).toBe("s1");
    expect(canonicalPlanId("custom", new Map())).toBe("custom");
    expect(canonicalSequenceId("custom", new Map())).toBe("custom");
  });

  it("expands plans in sequence order and ignores IDs with no known exercise", () => {
    const plan = {
      id: "p100",
      name: "mixed",
      description: "",
      content: [
        { type: "sequence" as const, id: "s100" },
        { type: "exercise" as const, id: "missing" },
      ],
    };
    const sequence = {
      id: "s100",
      name: "seq",
      description: "",
      load: "",
      exerciseIds: [exercises[0].id, "missing"],
    };
    expect(getPlanExerciseIds(plan, [sequence])).toEqual([
      exercises[0].id,
      "missing",
      "missing",
    ]);
    expect(getSequenceLevels(sequence, exercises)).toEqual(
      exerciseLevels.filter((level) => level === exercises[0].level),
    );
    expect(getPlanLevels(plan, exercises, [sequence])).toEqual(
      exerciseLevels.filter((level) => level === exercises[0].level),
    );
  });
});

describe("images and theme constants", () => {
  it("returns the mapped image or a stable placeholder fallback", () => {
    expect(getExerciseImage("1", "1.jpg")).toBeDefined();
    expect(getExerciseImage("missing", "no.jpg")).toEqual({
      uri: "https://via.placeholder.com/150",
    });
    expect(getExerciseImage("1", "missing.jpg")).toEqual({
      uri: "https://via.placeholder.com/150",
    });
  });

  it("provides complete light and dark palettes and derives typography and global styles", () => {
    expect(getColors(false)).toBe(Colors);
    expect(getColors(true)).toBe(DarkColors);
    expect(Object.keys(DarkColors).sort()).toEqual(Object.keys(Colors).sort());
    expect(createTypography(DarkColors).body.color).toBe(
      DarkColors.textPrimary,
    );
    expect(Typography.h1.fontSize).toBe(24);
    expect(globalStyles.container.flex).toBe(1);
    expect(createGlobalStyles(DarkColors).container.backgroundColor).toBe(
      DarkColors.background,
    );
    expect(Spacing.md).toBe(16);
    expect(BorderRadius.md).toBe(12);
  });
});
