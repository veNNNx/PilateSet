import { readJsonFile, writeJsonFile } from "./jsonFileStorage";

type IdentifiedRecord = { id: string };
type NoteRecord = { note: string };

export async function loadDeletedIds(
  filename: string,
  storageKey: string,
  errorMessage: string,
  canonicalize: (id: string) => string = (id) => id,
  deduplicate = false,
): Promise<string[]> {
  const storedValue = await readJsonFile(filename, storageKey);
  const parsedValue: unknown =
    storedValue === null ? [] : JSON.parse(storedValue);
  if (
    !Array.isArray(parsedValue) ||
    !parsedValue.every((id) => typeof id === "string")
  ) {
    throw new Error(errorMessage);
  }

  const normalizedIds = parsedValue.map(canonicalize);
  const result = deduplicate ? [...new Set(normalizedIds)] : normalizedIds;
  if (
    result.some((id, index) => id !== parsedValue[index]) ||
    result.length !== parsedValue.length
  ) {
    await saveDeletedIds(filename, storageKey, result);
  }
  return result;
}

export async function saveDeletedIds(
  filename: string,
  storageKey: string,
  ids: string[],
): Promise<void> {
  await writeJsonFile(filename, storageKey, JSON.stringify(ids, null, 2));
}

export async function addDeletedId(
  filename: string,
  storageKey: string,
  errorMessage: string,
  id: string,
): Promise<void> {
  const ids = await loadDeletedIds(filename, storageKey, errorMessage);
  if (!ids.includes(id))
    await saveDeletedIds(filename, storageKey, [...ids, id]);
}

export function createIdMigrationMap(
  storedItems: unknown,
  initialIds: string[],
  legacyIds: string[],
  prefix: "p" | "s",
  errorMessage: string,
  excludedIds: ReadonlySet<string> = new Set(),
): Map<string, string> {
  if (
    !Array.isArray(storedItems) ||
    !storedItems.every(
      (value) =>
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        typeof value.id === "string",
    )
  ) {
    throw new Error(errorMessage);
  }

  const items = storedItems as IdentifiedRecord[];
  const map = new Map<string, string>(
    legacyIds.flatMap((legacyId, index) =>
      initialIds[index] === undefined ? [] : [[legacyId, initialIds[index]]],
    ),
  );
  const validId = new RegExp(`^${prefix}[1-9]\\d*$`);
  const usedIds = new Set(initialIds);
  for (const item of items) {
    if (validId.test(item.id)) usedIds.add(item.id);
  }

  let nextId =
    Math.max(
      initialIds.length,
      ...Array.from(usedIds, (id) => Number(id.slice(1)) || 0),
    ) + 1;

  for (const item of items) {
    if (map.has(item.id) || validId.test(item.id) || excludedIds.has(item.id))
      continue;
    while (usedIds.has(`${prefix}${nextId}`)) nextId += 1;
    map.set(item.id, `${prefix}${nextId}`);
    usedIds.add(`${prefix}${nextId}`);
    nextId += 1;
  }
  return map;
}

export async function loadNotes<T extends NoteRecord>(
  filename: string,
  storageKey: string,
  errorMessage: string,
  isNote: (value: unknown) => value is T,
  normalize?: (note: T) => T,
): Promise<T[]> {
  const storedValue = await readJsonFile(filename, storageKey);
  const parsedValue: unknown =
    storedValue === null ? [] : JSON.parse(storedValue);
  if (!Array.isArray(parsedValue) || !parsedValue.every(isNote)) {
    throw new Error(errorMessage);
  }

  const notes = normalize ? parsedValue.map(normalize) : parsedValue;
  if (JSON.stringify(notes) !== JSON.stringify(parsedValue)) {
    await writeJsonFile(filename, storageKey, JSON.stringify(notes, null, 2));
  }
  return notes;
}

export async function saveNote<T extends NoteRecord>(
  filename: string,
  storageKey: string,
  load: () => Promise<T[]>,
  getId: (note: T) => string,
  create: (id: string, note: string) => T,
  id: string,
  note: string,
): Promise<void> {
  const notes = await load();
  const updatedNotes = notes.filter((item) => getId(item) !== id);
  const normalizedNote = note.trim();
  if (normalizedNote) updatedNotes.push(create(id, normalizedNote));
  await writeJsonFile(
    filename,
    storageKey,
    JSON.stringify(updatedNotes, null, 2),
  );
}
