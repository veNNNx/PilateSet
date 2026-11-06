import rawInitialPlans from "../data/plans.json";
import { readJsonFile } from "./jsonFileStorage";
import { createIdMigrationMap } from "./storageHelpers";

const initialPlans: { id: string }[] = rawInitialPlans;
const STORAGE_KEY = "pilateset.plans.v1";
const legacyInitialIds = [
  "sample-plan-lower-body",
  "sample-plan-core",
  "sample-plan-upper-body",
  "sample-plan-straps",
  "sample-plan-full-body",
];
const retiredInitialIds = new Set([
  "lower-body",
  "core-strength",
  "full-body",
  "beginner-reformer-flow",
  "core-and-posture",
  "reformer-mobility",
  "legs-and-glutes-reformer",
  "upper-body-and-back",
  "advanced-reformer-flow",
]);

export async function getPlanIdMap(): Promise<Map<string, string>> {
  const storedValue = await readJsonFile("plans.json", STORAGE_KEY);
  const parsedValue: unknown =
    storedValue === null ? [] : JSON.parse(storedValue);
  return createIdMigrationMap(
    parsedValue,
    initialPlans.map((plan) => plan.id),
    legacyInitialIds,
    "p",
    "Zapis planów jest nieprawidłowy.",
    retiredInitialIds,
  );
}

export function canonicalPlanId(
  id: string,
  idMap: Map<string, string>,
): string {
  return idMap.get(id) ?? id;
}
