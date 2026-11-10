import exercises from "../../data/exercises.json";
import { loadExercises, saveExercise } from "../../constants/exerciseStorage";

jest.mock(
  "../../data/exercises.json",
  () =>
    jest.requireActual<typeof import("../fixtures/data")>("../fixtures/data")
      .exercises,
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

describe("exercise override edge cases", () => {
  it("ignores retired exercise IDs while preserving all current bundled exercises", async () => {
    contents.set(
      "pilateset.exerciseOverrides.v1",
      JSON.stringify([
        { ...exercises[0], name: "Edited", sets: "3 x 10" },
        { ...exercises[1], id: "16", name: "Retired" },
      ]),
    );
    const result = await loadExercises();
    expect(result).toHaveLength(exercises.length);
    expect(result.find((item) => item.id === exercises[0].id)?.name).toBe(
      "Edited",
    );
    expect(result[0]).not.toHaveProperty("sets");
    expect(result.some((item) => item.id === "16")).toBe(false);
  });

  it.each([
    [JSON.stringify({ id: "1" }), "Zapis zmian ćwiczeń jest nieprawidłowy."],
    [
      JSON.stringify([{ ...exercises[0], images: [3] }]),
      "Zapis zmian ćwiczeń jest nieprawidłowy.",
    ],
    [
      JSON.stringify([{ ...exercises[0], id: "custom" }]),
      "Zapis zmian ćwiczeń zawiera nieprawidłowe identyfikatory.",
    ],
    [
      JSON.stringify([exercises[0], exercises[0]]),
      "Zapis zmian ćwiczeń zawiera nieprawidłowe identyfikatory.",
    ],
  ])(
    "rejects malformed or duplicate overrides (%s)",
    async (stored, message) => {
      contents.set("pilateset.exerciseOverrides.v1", stored);
      await expect(loadExercises()).rejects.toThrow(message);
    },
  );

  it("propagates invalid JSON and rejects incomplete updates without modifying saved overrides", async () => {
    contents.set("pilateset.exerciseOverrides.v1", "{");
    await expect(loadExercises()).rejects.toThrow(SyntaxError);
    contents.set("pilateset.exerciseOverrides.v1", "[]");
    contents.set("pilateset.exerciseOverrides.v1", "[]");
    await expect(
      saveExercise({ ...exercises[0], bodyAreas: [1] } as never),
    ).rejects.toThrow("Nie można zapisać nieprawidłowego ćwiczenia.");
    expect(contents.get("pilateset.exerciseOverrides.v1")).toBe("[]");
  });
});
