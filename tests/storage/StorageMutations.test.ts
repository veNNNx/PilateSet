import initialPlans from "../../data/plans.json";
import initialSequences from "../../data/sequences.json";
import initialCalendar from "../../data/calendar.json";
import {
  deletePlan,
  loadPlans,
  savePlan,
  updatePlan,
  getNextPlanId,
} from "../../constants/planStorage";
import {
  deleteSequence,
  loadSequences,
  saveSequence,
  updateSequence,
  getNextSequenceId,
} from "../../constants/sequenceStorage";
import {
  deleteCalendarEntry,
  loadCalendarEntries,
  saveCalendarEntries,
  updateCalendarEntry,
} from "../../constants/calendarStorage";
import { clearFavoritesCache } from "../../constants/favoritesStorage";

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
const plan = {
  id: "p100",
  name: "Custom",
  description: "",
  content: [{ type: "exercise" as const, id: "1" }],
};
const sequence = {
  id: "s100",
  name: "Custom",
  description: "",
  load: "",
  exerciseIds: ["1"],
};
const entry = {
  id: "custom-entry",
  date: "2099-12-31",
  hour: 18,
  planId: "p1",
  planName: "Plan",
  description: "",
};

beforeEach(() => {
  contents.clear();
  clearFavoritesCache();
});

describe("plan and sequence mutations", () => {
  it("normalizes legacy plans into ordered unique content", async () => {
    contents.set(
      "pilateset.plans.v1",
      JSON.stringify([
        {
          id: "p100",
          name: "Legacy",
          description: "",
          load: "",
          exerciseIds: ["1", "1", "2"],
          sequenceIds: ["s1"],
          contentOrder: [
            { type: "sequence", id: "s1" },
            { type: "exercise", id: "1" },
          ],
        },
      ]),
    );
    const result = await loadPlans();
    expect(result.find((item) => item.id === "p100")?.content).toEqual([
      { type: "sequence", id: "s1" },
      { type: "exercise", id: "1" },
      { type: "exercise", id: "2" },
    ]);
  });

  it("migrates legacy bundled plan IDs when loading stored plans", async () => {
    contents.set(
      "pilateset.plans.v1",
      JSON.stringify([
        {
          id: "sample-plan-lower-body",
          name: "Legacy",
          description: "",
          content: [],
        },
      ]),
    );
    expect((await loadPlans()).find((item) => item.id === "p1")?.name).toBe(
      "Legacy",
    );
    expect(JSON.parse(contents.get("pilateset.plans.v1") ?? "[]")[0].id).toBe(
      "p1",
    );
  });

  it("updates custom plans, rejects missing updates and deletes", async () => {
    await savePlan(plan);
    await updatePlan({ ...plan, name: "Changed" });
    expect((await loadPlans()).find((item) => item.id === plan.id)?.name).toBe(
      "Changed",
    );
    await expect(updatePlan({ ...plan, id: "p999" })).rejects.toThrow(
      "Nie znaleziono planu do zapisania.",
    );
    await deletePlan(plan.id);
    expect((await loadPlans()).some((item) => item.id === plan.id)).toBe(false);
    await expect(deletePlan(plan.id)).rejects.toThrow(
      "Nie znaleziono planu do usunięcia.",
    );
    expect(contents.get("pilateset.deletedPlans.v1")).toContain("p100");
  });

  it("soft-deletes bundled plans and allocates IDs above deleted IDs", async () => {
    const first = (initialPlans as { id: string }[])[0];
    await deletePlan(first.id);
    expect((await loadPlans()).some((item) => item.id === first.id)).toBe(
      false,
    );
    contents.set("pilateset.deletedPlans.v1", JSON.stringify(["p900"]));
    expect(await getNextPlanId()).toBe("p901");
  });

  it("updates and deletes custom sequences and keeps deleted IDs unavailable", async () => {
    await saveSequence(sequence);
    await updateSequence({ ...sequence, name: "Changed" });
    expect(
      (await loadSequences()).find((item) => item.id === sequence.id)?.name,
    ).toBe("Changed");
    await expect(updateSequence({ ...sequence, id: "s999" })).rejects.toThrow(
      "Nie znaleziono sekwencji do zapisania.",
    );
    await deleteSequence(sequence.id);
    expect(
      (await loadSequences()).some((item) => item.id === sequence.id),
    ).toBe(false);
    await expect(deleteSequence(sequence.id)).rejects.toThrow(
      "Nie znaleziono sekwencji do usunięcia.",
    );
    contents.set("pilateset.deletedSequences.v1", JSON.stringify(["s900"]));
    expect(await getNextSequenceId()).toBe("s901");
  });

  it("migrates a legacy sequence ID and normalizes references in saved plans", async () => {
    contents.set(
      "pilateset.sequences.v1",
      JSON.stringify([
        {
          id: "sample-sequence-footwork",
          name: "Legacy",
          description: "",
          load: "",
          exerciseIds: ["1"],
        },
      ]),
    );
    contents.set(
      "pilateset.plans.v1",
      JSON.stringify([
        {
          id: "p100",
          name: "Uses sequence",
          description: "",
          content: [{ type: "sequence", id: "sample-sequence-footwork" }],
        },
      ]),
    );
    expect((await loadSequences()).find((item) => item.id === "s1")?.name).toBe(
      "Legacy",
    );
    expect(
      JSON.parse(contents.get("pilateset.sequences.v1") ?? "[]")[0].id,
    ).toBe("s1");
    expect(
      JSON.parse(contents.get("pilateset.plans.v1") ?? "[]")[0].content,
    ).toEqual([{ type: "sequence", id: "s1" }]);
  });

  it("removes a deleted sequence from every plan that references it", async () => {
    await saveSequence(sequence);
    await savePlan({
      ...plan,
      content: [{ type: "sequence", id: sequence.id }],
    });
    await deleteSequence(sequence.id);
    expect(
      (await loadPlans()).find((item) => item.id === plan.id)?.content,
    ).toEqual([]);
  });

  it("soft-deletes bundled sequences", async () => {
    const first = (initialSequences as { id: string }[])[0];
    await deleteSequence(first.id);
    expect((await loadSequences()).some((item) => item.id === first.id)).toBe(
      false,
    );
    expect(contents.get("pilateset.deletedSequences.v1")).toContain(first.id);
  });
});

describe("calendar mutations", () => {
  it("updates custom entries, rejects missing updates and empty batches, and physically deletes custom entries", async () => {
    await saveCalendarEntries([entry]);
    await updateCalendarEntry({ ...entry, description: "Changed" });
    expect(
      (await loadCalendarEntries()).find((item) => item.id === entry.id)
        ?.description,
    ).toBe("Changed");
    await expect(
      updateCalendarEntry({ ...entry, id: "missing" }),
    ).rejects.toThrow("Nie znaleziono treningu do zapisania.");
    await expect(saveCalendarEntries([])).rejects.toThrow(
      "Nie można zapisać pustej listy wpisów kalendarza.",
    );
    await deleteCalendarEntry(entry.id);
    expect(
      (await loadCalendarEntries()).some((item) => item.id === entry.id),
    ).toBe(false);
    await expect(deleteCalendarEntry(entry.id)).rejects.toThrow(
      "Nie znaleziono wpisu kalendarza do usunięcia.",
    );
  });

  it("soft-deletes bundled calendar entries and filters them from the seed", async () => {
    const first = (initialCalendar as { id: string }[])[0];
    await deleteCalendarEntry(first.id);
    expect(
      (await loadCalendarEntries()).some((item) => item.id === first.id),
    ).toBe(false);
    expect(contents.get("pilateset.deletedCalendarEntries.v1")).toContain(
      first.id,
    );
  });

  it("normalizes legacy plan IDs in entries and persisted data", async () => {
    contents.set(
      "pilateset.plans.v1",
      JSON.stringify([
        {
          id: "sample-plan-lower-body",
          name: "Legacy",
          description: "",
          content: [],
        },
      ]),
    );
    contents.set(
      "pilateset.calendar.v1",
      JSON.stringify([{ ...entry, planId: "sample-plan-lower-body" }]),
    );
    expect(await loadCalendarEntries()).toEqual([{ ...entry, planId: "p1" }]);
    expect(
      JSON.parse(contents.get("pilateset.calendar.v1") ?? "[]")[0].planId,
    ).toBe("p1");
  });

  it("rejects invalid calendar JSON and malformed records", async () => {
    contents.set("pilateset.calendar.v1", "{");
    await expect(loadCalendarEntries()).rejects.toThrow(SyntaxError);
    contents.set(
      "pilateset.calendar.v1",
      JSON.stringify([{ ...entry, hour: 15 }]),
    );
    await expect(loadCalendarEntries()).rejects.toThrow(
      "Zapis kalendarza jest nieprawidłowy.",
    );
  });
});
