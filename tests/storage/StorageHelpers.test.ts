import {
  createIdMigrationMap,
  loadDeletedIds,
  loadNotes,
  saveNote,
} from "../../constants/storageHelpers";

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
});

describe("shared storage helpers", () => {
  it("canonicalizes and deduplicates deleted ids when requested", async () => {
    contents.set("deleted-items", JSON.stringify(["legacy-plan", "p1", "p4"]));

    await expect(
      loadDeletedIds(
        "deleted.json",
        "deleted-items",
        "Invalid deleted items.",
        (id) => (id === "legacy-plan" ? "p1" : id),
        true,
      ),
    ).resolves.toEqual(["p1", "p4"]);
    expect(JSON.parse(contents.get("deleted-items") ?? "[]")).toEqual([
      "p1",
      "p4",
    ]);
  });

  it("maps legacy and custom ids without reusing ids or migrating excluded ids", () => {
    const map = createIdMigrationMap(
      [
        { id: "legacy-id" },
        { id: "p7" },
        { id: "custom-id" },
        { id: "retired-id" },
      ],
      ["p1", "p2"],
      ["legacy-id"],
      "p",
      "Invalid plans.",
      new Set(["retired-id"]),
    );

    expect(map.get("legacy-id")).toBe("p1");
    expect(map.get("custom-id")).toBe("p8");
    expect(map.has("retired-id")).toBe(false);
  });

  it("loads, normalizes, updates, and removes notes through shared helpers", async () => {
    type TestNote = { id: string; note: string };
    const isTestNote = (value: unknown): value is TestNote =>
      typeof value === "object" &&
      value !== null &&
      "id" in value &&
      typeof value.id === "string" &&
      "note" in value &&
      typeof value.note === "string";
    contents.set(
      "notes",
      JSON.stringify([{ id: "legacy-id", note: "Remember" }]),
    );

    const loadTestNotes = () =>
      loadNotes(
        "notes.json",
        "notes",
        "Invalid notes.",
        isTestNote,
        (item) => ({
          ...item,
          id: item.id === "legacy-id" ? "current-id" : item.id,
        }),
      );
    await expect(loadTestNotes()).resolves.toEqual([
      { id: "current-id", note: "Remember" },
    ]);
    expect(JSON.parse(contents.get("notes") ?? "[]")).toEqual([
      { id: "current-id", note: "Remember" },
    ]);

    await saveNote(
      "notes.json",
      "notes",
      loadTestNotes,
      (item) => item.id,
      (id, note) => ({ id, note }),
      "current-id",
      "  Updated  ",
    );
    expect(JSON.parse(contents.get("notes") ?? "[]")).toEqual([
      { id: "current-id", note: "Updated" },
    ]);

    await saveNote(
      "notes.json",
      "notes",
      loadTestNotes,
      (item) => item.id,
      (id, note) => ({ id, note }),
      "current-id",
      "  ",
    );
    expect(JSON.parse(contents.get("notes") ?? "[]")).toEqual([]);
  });

  it("rejects invalid deleted-id and note records", async () => {
    contents.set("deleted-items", JSON.stringify(["valid", 1]));
    await expect(
      loadDeletedIds("deleted.json", "deleted-items", "Invalid deleted items."),
    ).rejects.toThrow("Invalid deleted items.");

    contents.set("notes", JSON.stringify([{ id: 1, note: "Invalid" }]));
    await expect(
      loadNotes(
        "notes.json",
        "notes",
        "Invalid notes.",
        (value): value is { id: string; note: string } =>
          typeof value === "object" &&
          value !== null &&
          "id" in value &&
          typeof value.id === "string" &&
          "note" in value &&
          typeof value.note === "string",
      ),
    ).rejects.toThrow("Invalid notes.");
  });
});
