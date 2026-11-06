import rawInitialSequences from "../data/sequences.json";
import { readJsonFile } from "./jsonFileStorage";
import { createIdMigrationMap } from "./storageHelpers";

const initialSequences: { id: string }[] = rawInitialSequences;
const STORAGE_KEY = "pilateset.sequences.v1";
const legacyInitialIds = [
  "sample-sequence-footwork",
  "sample-sequence-core",
  "sample-sequence-arms",
  "sample-sequence-straps",
];

export async function getSequenceIdMap(): Promise<Map<string, string>> {
  const storedValue = await readJsonFile("sequences.json", STORAGE_KEY);
  const parsedValue: unknown =
    storedValue === null ? [] : JSON.parse(storedValue);
  return createIdMigrationMap(
    parsedValue,
    initialSequences.map((sequence) => sequence.id),
    legacyInitialIds,
    "s",
    "Zapis sekwencji jest nieprawidłowy.",
  );
}

export function canonicalSequenceId(
  id: string,
  idMap: Map<string, string>,
): string {
  return idMap.get(id) ?? id;
}
