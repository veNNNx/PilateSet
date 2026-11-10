import { readJsonFile, writeJsonFile } from "./jsonFileStorage";
import initialSequences from "../data/sequences.json";
import { loadPlans, updatePlan } from "./planStorage";
import { canonicalSequenceId, getSequenceIdMap } from "./sequenceIds";
import { loadFavorites } from "./favoritesStorage";
import { loadSequenceNotes } from "./sequenceNotesStorage";
import { addDeletedId, loadDeletedIds } from "./storageHelpers";

const STORAGE_FILE = "sequences.json";
const STORAGE_KEY = "pilateset.sequences.v1";
const DELETED_STORAGE_FILE = "deleted-sequences.json";
const DELETED_STORAGE_KEY = "pilateset.deletedSequences.v1";

export interface Sequence {
  id: string;
  name: string;
  description: string;
  load: string;
  exerciseIds: string[];
}

const initialSequenceList: Sequence[] = (
  initialSequences as Omit<Sequence, "load">[]
).map((sequence) => ({ ...sequence, load: "" }));

function isStoredSequence(
  value: unknown,
): value is Omit<Sequence, "load"> & { load?: string } {
  if (typeof value !== "object" || value === null) return false;
  const sequence = value as Record<string, unknown>;
  return (
    typeof sequence.id === "string" &&
    typeof sequence.name === "string" &&
    typeof sequence.description === "string" &&
    (sequence.load === undefined || typeof sequence.load === "string") &&
    Array.isArray(sequence.exerciseIds) &&
    sequence.exerciseIds.every((id) => typeof id === "string")
  );
}

export async function loadSequences(): Promise<Sequence[]> {
  const sequenceIdMap = await getSequenceIdMap();
  const deletedIds = new Set(
    await loadDeletedIds(
      DELETED_STORAGE_FILE,
      DELETED_STORAGE_KEY,
      "Zapis usuniętych sekwencji jest nieprawidłowy.",
      (id) => canonicalSequenceId(id, sequenceIdMap),
      true,
    ),
  );
  const storedValue = await readJsonFile(STORAGE_FILE, STORAGE_KEY);
  const parsedValue: unknown =
    storedValue === null ? [] : JSON.parse(storedValue);
  if (!Array.isArray(parsedValue) || !parsedValue.every(isStoredSequence)) {
    throw new Error("Zapis sekwencji jest nieprawidłowy.");
  }
  const parsedSequences = parsedValue as (Omit<Sequence, "load"> & {
    load?: string;
  })[];
  const storedSequences: Sequence[] = parsedSequences.map((sequence) => ({
    ...sequence,
    id: canonicalSequenceId(sequence.id, sequenceIdMap),
    load: sequence.load ?? "",
  }));
  const ids = new Set<string>();
  for (const sequence of storedSequences) {
    if (ids.has(sequence.id))
      throw new Error("Zapis zawiera powtórzone identyfikatory sekwencji.");
    ids.add(sequence.id);
  }
  const sequencesWereRenamed = storedSequences.some(
    (sequence, index) =>
      sequence.id !== parsedSequences[index].id ||
      parsedSequences[index].load === undefined,
  );
  if (sequencesWereRenamed) {
    const [plans] = await Promise.all([
      loadPlans(),
      loadFavorites(),
      loadSequenceNotes(),
    ]);
    for (const plan of plans) {
      const content = plan.content.map((item) =>
        item.type === "sequence"
          ? { ...item, id: canonicalSequenceId(item.id, sequenceIdMap) }
          : item,
      );
      if (content.some((item, index) => item.id !== plan.content[index].id)) {
        await updatePlan({ ...plan, content });
      }
    }
    await persistSequences(storedSequences);
  }
  const storedById = new Map(
    storedSequences.map((sequence) => [sequence.id, sequence]),
  );
  const initialIds = new Set(
    initialSequenceList.map((sequence) => sequence.id),
  );
  const mergedInitialSequences = initialSequenceList.map(
    (sequence) => storedById.get(sequence.id) ?? sequence,
  );
  const customSequences = storedSequences.filter(
    (sequence) => !initialIds.has(sequence.id),
  );
  return [...mergedInitialSequences, ...customSequences].filter(
    (sequence) => !deletedIds.has(sequence.id),
  );
}

async function persistSequences(sequences: Sequence[]): Promise<void> {
  await writeJsonFile(
    STORAGE_FILE,
    STORAGE_KEY,
    JSON.stringify(sequences, null, 2),
  );
}

export async function saveSequence(sequence: Sequence): Promise<void> {
  if (!/^s[1-9]\d*$/.test(sequence.id)) {
    throw new Error("Identyfikator sekwencji musi mieć format s1, s2, s3…");
  }
  const sequences = await loadSequences();
  if (sequences.some((item) => item.id === sequence.id)) {
    throw new Error("Sekwencja o takim identyfikatorze już istnieje.");
  }
  await persistSequences([...sequences, sequence]);
}

export async function getNextSequenceId(): Promise<string> {
  const [sequences, deletedIds] = await Promise.all([
    loadSequences(),
    loadDeletedIds(
      DELETED_STORAGE_FILE,
      DELETED_STORAGE_KEY,
      "Zapis usuniętych sekwencji jest nieprawidłowy.",
    ),
  ]);
  const highestSequenceId = sequences.reduce((highest, sequence) => {
    const match = /^s([1-9]\d*)$/.exec(sequence.id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  const highestDeletedId = deletedIds.reduce((highest, id) => {
    const match = /^s([1-9]\d*)$/.exec(id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `s${Math.max(highestSequenceId, highestDeletedId) + 1}`;
}

export async function updateSequence(updatedSequence: Sequence): Promise<void> {
  const sequences = await loadSequences();
  if (!sequences.some((sequence) => sequence.id === updatedSequence.id)) {
    throw new Error("Nie znaleziono sekwencji do zapisania.");
  }
  await persistSequences(
    sequences.map((sequence) =>
      sequence.id === updatedSequence.id ? updatedSequence : sequence,
    ),
  );
}

export async function deleteSequence(sequenceId: string): Promise<void> {
  const sequences = await loadSequences();
  const sequenceToDelete = sequences.find(
    (sequence) => sequence.id === sequenceId,
  );
  if (!sequenceToDelete) {
    throw new Error("Nie znaleziono sekwencji do usunięcia.");
  }
  const plans = await loadPlans();
  for (const plan of plans) {
    if (
      plan.content.some(
        (item) => item.type === "sequence" && item.id === sequenceId,
      )
    ) {
      await updatePlan({
        ...plan,
        content: plan.content.filter(
          (item) => item.type !== "sequence" || item.id !== sequenceId,
        ),
      });
    }
  }
  const remainingSequences = sequences.filter(
    (sequence) => sequence.id !== sequenceId,
  );
  if (initialSequenceList.some((sequence) => sequence.id === sequenceId)) {
    await addDeletedId(
      DELETED_STORAGE_FILE,
      DELETED_STORAGE_KEY,
      "Zapis usuniętych sekwencji jest nieprawidłowy.",
      sequenceId,
    );
  }
  await persistSequences(remainingSequences);
}
