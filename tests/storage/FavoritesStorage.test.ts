import {
  loadFavorites,
  toggleFavorite,
} from "../../constants/favoritesStorage";

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
  const contents = new Map<string, string>([
    [
      "pilateset.favorites.v1",
      JSON.stringify([{ type: "plan", id: "sample-plan-lower-body" }]),
    ],
  ]);
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

describe("favorites storage", () => {
  it("migrates legacy ids and adds or removes a favorite persistently", async () => {
    const migrated = await loadFavorites();
    expect(migrated).toEqual([{ type: "plan", id: "p1" }]);
    expect(JSON.parse(contents.get("pilateset.favorites.v1") ?? "[]")).toEqual(
      migrated,
    );

    const withExercise = await toggleFavorite("exercise", "1");
    expect(withExercise).toContainEqual({ type: "exercise", id: "1" });

    const withoutExercise = await toggleFavorite("exercise", "1");
    expect(withoutExercise).toEqual(migrated);
    expect(JSON.parse(contents.get("pilateset.favorites.v1") ?? "[]")).toEqual(
      migrated,
    );
  });
});
