import initialEntries from "../data/calendar.json";
import { readJsonFile, writeJsonFile } from "./jsonFileStorage";
import { canonicalPlanId, getPlanIdMap } from "./planIds";
import { addDeletedId, loadDeletedIds } from "./storageHelpers";

const STORAGE_FILE = "calendar.json";
const STORAGE_KEY = "pilateset.calendar.v1";
const DELETED_STORAGE_FILE = "deleted-calendar-entries.json";
const DELETED_STORAGE_KEY = "pilateset.deletedCalendarEntries.v1";
const seedEntries: CalendarEntry[] = initialEntries;

export interface CalendarEntry {
  id: string;
  date: string;
  hour: number;
  planId: string;
  planName: string;
  description: string;
}

interface StoredCalendarEntry {
  id: string;
  date: string;
  hour: number;
  planId: string;
  planName: string;
  description: string;
}

function isCalendarEntry(value: unknown): value is StoredCalendarEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.date === "string" &&
    typeof entry.hour === "number" &&
    Number.isInteger(entry.hour) &&
    entry.hour >= 16 &&
    entry.hour <= 21 &&
    typeof entry.planId === "string" &&
    typeof entry.planName === "string" &&
    typeof entry.description === "string"
  );
}

function normalizeEntry(entry: StoredCalendarEntry): CalendarEntry {
  return {
    id: entry.id,
    date: entry.date,
    hour: entry.hour,
    planId: entry.planId,
    planName: entry.planName,
    description: entry.description,
  };
}

export async function loadCalendarEntries(): Promise<CalendarEntry[]> {
  const planIdMap = await getPlanIdMap();
  const deletedIds = new Set(
    await loadDeletedIds(
      DELETED_STORAGE_FILE,
      DELETED_STORAGE_KEY,
      "Zapis usuniętych wpisów kalendarza jest nieprawidłowy.",
    ),
  );
  const storedValue = await readJsonFile(STORAGE_FILE, STORAGE_KEY);
  const parsedValue: unknown =
    storedValue === null ? seedEntries : JSON.parse(storedValue);
  if (Array.isArray(parsedValue) && parsedValue.length === 0) {
    return seedEntries
      .map((entry) => ({
        ...entry,
        planId: canonicalPlanId(entry.planId, planIdMap),
      }))
      .filter((entry) => !deletedIds.has(entry.id));
  }
  if (!Array.isArray(parsedValue) || !parsedValue.every(isCalendarEntry)) {
    throw new Error("Zapis kalendarza jest nieprawidłowy.");
  }
  const entries = parsedValue.map((entry) => ({
    ...normalizeEntry(entry),
    planId: canonicalPlanId(entry.planId, planIdMap),
  }));
  if (
    entries.some((entry, index) => entry.planId !== parsedValue[index].planId)
  ) {
    await writeJsonFile(
      STORAGE_FILE,
      STORAGE_KEY,
      JSON.stringify(entries, null, 2),
    );
  }
  return entries.filter((entry) => !deletedIds.has(entry.id));
}

export async function saveCalendarEntry(entry: CalendarEntry): Promise<void> {
  await saveCalendarEntries([entry]);
}

export async function saveCalendarEntries(
  entriesToSave: CalendarEntry[],
): Promise<void> {
  if (entriesToSave.length === 0) {
    throw new Error("Nie można zapisać pustej listy wpisów kalendarza.");
  }
  const entries = await loadCalendarEntries();
  await writeJsonFile(
    STORAGE_FILE,
    STORAGE_KEY,
    JSON.stringify([...entries, ...entriesToSave], null, 2),
  );
}

export async function updateCalendarEntry(
  updatedEntry: CalendarEntry,
): Promise<void> {
  const entries = await loadCalendarEntries();
  if (!entries.some((entry) => entry.id === updatedEntry.id)) {
    throw new Error("Nie znaleziono treningu do zapisania.");
  }
  await writeJsonFile(
    STORAGE_FILE,
    STORAGE_KEY,
    JSON.stringify(
      entries.map((entry) =>
        entry.id === updatedEntry.id ? updatedEntry : entry,
      ),
      null,
      2,
    ),
  );
}

export async function deleteCalendarEntry(entryId: string): Promise<void> {
  const entries = await loadCalendarEntries();
  if (!entries.some((entry) => entry.id === entryId)) {
    throw new Error("Nie znaleziono wpisu kalendarza do usunięcia.");
  }

  if (seedEntries.some((entry) => entry.id === entryId)) {
    await addDeletedId(
      DELETED_STORAGE_FILE,
      DELETED_STORAGE_KEY,
      "Zapis usuniętych wpisów kalendarza jest nieprawidłowy.",
      entryId,
    );
  } else {
    await writeJsonFile(
      STORAGE_FILE,
      STORAGE_KEY,
      JSON.stringify(
        entries.filter((entry) => entry.id !== entryId),
        null,
        2,
      ),
    );
  }
}
