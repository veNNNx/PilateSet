import { loadNotes, saveNote } from "./storageHelpers";
import { canonicalSequenceId, getSequenceIdMap } from "./sequenceIds";

const STORAGE_FILE = "sequence-notes.json";
const STORAGE_KEY = "pilateset.sequenceNotes.v1";

export interface SequenceNote {
  sequenceId: string;
  note: string;
}

function isSequenceNote(value: unknown): value is SequenceNote {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.sequenceId === "string" && typeof entry.note === "string";
}

export async function loadSequenceNotes(): Promise<SequenceNote[]> {
  const sequenceIdMap = await getSequenceIdMap();
  return loadNotes(
    STORAGE_FILE,
    STORAGE_KEY,
    "Zapis notatek do sekwencji jest nieprawidłowy.",
    isSequenceNote,
    (item) => ({
      ...item,
      sequenceId: canonicalSequenceId(item.sequenceId, sequenceIdMap),
    }),
  );
}

export async function saveSequenceNote(
  sequenceId: string,
  note: string,
): Promise<void> {
  await saveNote(
    STORAGE_FILE,
    STORAGE_KEY,
    loadSequenceNotes,
    (item) => item.sequenceId,
    (id, value) => ({ sequenceId: id, note: value }),
    sequenceId,
    note,
  );
}
