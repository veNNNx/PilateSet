import {
  clearFavoritesCache,
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

beforeEach(() => {
  contents.clear();
  clearFavoritesCache();
});

describe("favorites storage edge cases", () => {
  it("normalizes plan and sequence legacy IDs and writes the canonical values", async () => {
    contents.set(
      "pilateset.plans.v1",
      JSON.stringify([
        {
          id: "sample-plan-lower-body",
          name: "legacy",
          description: "",
          content: [],
        },
      ]),
    );
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
      "pilateset.favorites.v1",
      JSON.stringify([
        { type: "plan", id: "sample-plan-lower-body" },
        { type: "sequence", id: "sample-sequence-footwork" },
      ]),
    );
    await expect(loadFavorites()).resolves.toEqual([
      { type: "plan", id: "p1" },
      { type: "sequence", id: "s1" },
    ]);
    expect(JSON.parse(contents.get("pilateset.favorites.v1") ?? "[]")).toEqual(
      await loadFavorites(),
    );
  });

  it("rejects malformed, unsupported, duplicate, and invalid JSON favorites", async () => {
    for (const [value, error] of [
      ["{", SyntaxError],
      [
        JSON.stringify({ type: "exercise", id: "1" }),
        "Zapis ulubionych jest nieprawidłowy.",
      ],
      [
        JSON.stringify([{ type: "other", id: "1" }]),
        "Zapis ulubionych jest nieprawidłowy.",
      ],
      [
        JSON.stringify([
          { type: "exercise", id: "1" },
          { type: "exercise", id: "1" },
        ]),
        "Zapis zawiera powtórzone ulubione pozycje.",
      ],
    ] as const) {
      contents.set("pilateset.favorites.v1", value);
      clearFavoritesCache();
      if (error === SyntaxError)
        await expect(loadFavorites()).rejects.toThrow(SyntaxError);
      else await expect(loadFavorites()).rejects.toThrow(error);
    }
  });

  it("serializes concurrent toggles and caches the latest result", async () => {
    const [first, second] = await Promise.all([
      toggleFavorite("exercise", "1"),
      toggleFavorite("exercise", "2"),
    ]);
    expect(first).toContainEqual({ type: "exercise", id: "1" });
    expect(second).toContainEqual({ type: "exercise", id: "1" });
    expect(second).toContainEqual({ type: "exercise", id: "2" });
    expect(await loadFavorites()).toEqual(second);
    expect(JSON.parse(contents.get("pilateset.favorites.v1") ?? "[]")).toEqual(
      second,
    );
  });
});
