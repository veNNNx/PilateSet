import rawInitialPlans from "../data/plans.json";
import { readJsonFile, writeJsonFile } from "./jsonFileStorage";
import { canonicalSequenceId, getSequenceIdMap } from "./sequenceIds";
import { canonicalPlanId, getPlanIdMap } from "./planIds";
import { loadFavorites } from "./favoritesStorage";
import { loadCalendarEntries } from "./calendarStorage";
import { addDeletedId, loadDeletedIds } from "./storageHelpers";

const STORAGE_FILE = "plans.json";
const STORAGE_KEY = "pilateset.plans.v1";
const DELETED_STORAGE_FILE = "deleted-plans.json";
const DELETED_STORAGE_KEY = "pilateset.deletedPlans.v1";
const retiredInitialPlanIds = new Set([
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

const initialPlans: Plan[] = rawInitialPlans;

export interface Plan {
  id: string;
  name: string;
  description: string;
  content: PlanContentItem[];
}

export type PlanContentItem = {
  type: "exercise" | "sequence";
  id: string;
};

interface StoredPlan {
  id: string;
  name: string;
  description: string;
  content?: PlanContentItem[];
  exerciseIds?: string[];
  sequenceIds?: string[];
  contentOrder?: PlanContentItem[];
}

interface PlanInput {
  id: string;
  name: string;
  description: string;
  content?: { type: string; id: string }[];
  exerciseIds?: string[];
  sequenceIds?: string[];
  contentOrder?: { type: string; id: string }[];
}

function isPlan(value: unknown): value is StoredPlan {
  if (typeof value !== "object" || value === null) return false;
  const plan = value as Record<string, unknown>;
  return (
    typeof plan.id === "string" &&
    typeof plan.name === "string" &&
    typeof plan.description === "string" &&
    (plan.content === undefined ||
      (Array.isArray(plan.content) &&
        plan.content.every(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            (item.type === "exercise" || item.type === "sequence") &&
            typeof item.id === "string",
        ))) &&
    (plan.exerciseIds === undefined ||
      (Array.isArray(plan.exerciseIds) &&
        plan.exerciseIds.every((id) => typeof id === "string"))) &&
    (plan.sequenceIds === undefined ||
      (Array.isArray(plan.sequenceIds) &&
        plan.sequenceIds.every((id) => typeof id === "string"))) &&
    (plan.contentOrder === undefined ||
      (Array.isArray(plan.contentOrder) &&
        plan.contentOrder.every(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            (item.type === "exercise" || item.type === "sequence") &&
            typeof item.id === "string",
        ))) &&
    (Array.isArray(plan.content) ||
      (Array.isArray(plan.exerciseIds) &&
        plan.exerciseIds.every((id) => typeof id === "string")))
  );
}

function normalizePlan(plan: PlanInput): Plan {
  const exerciseIds = plan.exerciseIds ?? [];
  const sequenceIds = plan.sequenceIds ?? [];
  const legacyContent = plan.contentOrder ?? [
    ...exerciseIds.map((id) => ({ type: "exercise", id })),
    ...sequenceIds.map((id) => ({ type: "sequence", id })),
  ];
  const legacyItems = legacyContent.filter(
    (item): item is PlanContentItem =>
      (item.type === "exercise" && exerciseIds.includes(item.id)) ||
      (item.type === "sequence" && sequenceIds.includes(item.id)),
  );
  const legacyKeys = new Set(
    legacyItems.map((item) => `${item.type}:${item.id}`),
  );
  const contentCandidates = plan.content ?? [
    ...legacyItems,
    ...exerciseIds
      .filter((id) => !legacyKeys.has(`exercise:${id}`))
      .map((id) => ({ type: "exercise" as const, id })),
    ...sequenceIds
      .filter((id) => !legacyKeys.has(`sequence:${id}`))
      .map((id) => ({ type: "sequence" as const, id })),
  ];
  const content = contentCandidates.filter(
    (item): item is PlanContentItem =>
      (item.type === "exercise" || item.type === "sequence") &&
      typeof item.id === "string",
  );
  const uniqueContent = content.filter(
    (item, index) =>
      content.findIndex(
        (candidate) => candidate.type === item.type && candidate.id === item.id,
      ) === index,
  );
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    content: uniqueContent,
  };
}

export async function loadPlans(): Promise<Plan[]> {
  const [sequenceIdMap, planIdMap] = await Promise.all([
    getSequenceIdMap(),
    getPlanIdMap(),
  ]);
  const deletedIds = new Set(
    await loadDeletedIds(
      DELETED_STORAGE_FILE,
      DELETED_STORAGE_KEY,
      "Zapis usuniętych planów jest nieprawidłowy.",
      (id) => canonicalPlanId(id, planIdMap),
      true,
    ),
  );
  const storedValue = await readJsonFile(STORAGE_FILE, STORAGE_KEY);
  if (storedValue === null) {
    return initialPlans
      .map(normalizePlan)
      .map((plan) => ({
        ...plan,
        content: plan.content.map((item) =>
          item.type === "sequence"
            ? { ...item, id: canonicalSequenceId(item.id, sequenceIdMap) }
            : item,
        ),
      }))
      .filter((plan) => !deletedIds.has(plan.id));
  }

  const parsedValue: unknown = JSON.parse(storedValue);
  if (Array.isArray(parsedValue) && parsedValue.length === 0) {
    return initialPlans
      .map(normalizePlan)
      .filter((plan) => !deletedIds.has(plan.id));
  }
  if (!Array.isArray(parsedValue) || !parsedValue.every(isPlan)) {
    throw new Error("Zapis planów jest nieprawidłowy.");
  }
  const storedIds = new Set<string>();
  for (const plan of parsedValue) {
    const canonicalId = canonicalPlanId(plan.id, planIdMap);
    if (storedIds.has(canonicalId))
      throw new Error("Zapis zawiera powtórzone identyfikatory planów.");
    storedIds.add(canonicalId);
  }
  const parsedPlans = (parsedValue as StoredPlan[]).map(normalizePlan);
  const normalizedPlans = parsedPlans.map((plan) => ({
    ...plan,
    id: canonicalPlanId(plan.id, planIdMap),
    content: plan.content.map((item) =>
      item.type === "sequence"
        ? { ...item, id: canonicalSequenceId(item.id, sequenceIdMap) }
        : item,
    ),
  }));
  const plansWereRenamed = normalizedPlans.some(
    (plan, index) => plan.id !== parsedPlans[index].id,
  );
  if (
    plansWereRenamed ||
    normalizedPlans.some(
      (plan, index) =>
        JSON.stringify(plan.content) !==
        JSON.stringify(parsedPlans[index].content),
    )
  ) {
    await Promise.all([loadFavorites(), loadCalendarEntries()]);
    await persistPlans(normalizedPlans);
  }
  const storedById = new Map(normalizedPlans.map((plan) => [plan.id, plan]));
  const initialIds = new Set(initialPlans.map((plan) => plan.id));
  const mergedInitialPlans = initialPlans.map(
    (plan) => storedById.get(plan.id) ?? normalizePlan(plan),
  );
  const customPlans = normalizedPlans.filter(
    (plan) => !initialIds.has(plan.id) && !retiredInitialPlanIds.has(plan.id),
  );
  return [...mergedInitialPlans, ...customPlans].filter(
    (plan) => !deletedIds.has(plan.id),
  );
}

async function persistPlans(plans: Plan[]): Promise<void> {
  await writeJsonFile(
    STORAGE_FILE,
    STORAGE_KEY,
    JSON.stringify(plans, null, 2),
  );
}

export async function savePlan(plan: Plan): Promise<void> {
  if (!/^p[1-9]\d*$/.test(plan.id)) {
    throw new Error("Identyfikator planu musi mieć format p1, p2, p3…");
  }
  const plans = await loadPlans();
  if (plans.some((item) => item.id === plan.id)) {
    throw new Error("Plan o takim identyfikatorze już istnieje.");
  }
  await persistPlans([...plans, normalizePlan(plan)]);
}

export async function getNextPlanId(): Promise<string> {
  const [plans, deletedIds] = await Promise.all([
    loadPlans(),
    loadDeletedIds(
      DELETED_STORAGE_FILE,
      DELETED_STORAGE_KEY,
      "Zapis usuniętych planów jest nieprawidłowy.",
    ),
  ]);
  const highestPlanId = plans.reduce((highest, plan) => {
    const match = /^p([1-9]\d*)$/.exec(plan.id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  const highestDeletedId = deletedIds.reduce((highest, id) => {
    const match = /^p([1-9]\d*)$/.exec(id);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `p${Math.max(highestPlanId, highestDeletedId) + 1}`;
}

export async function updatePlan(updatedPlan: Plan): Promise<void> {
  const plans = await loadPlans();
  if (!plans.some((plan) => plan.id === updatedPlan.id)) {
    throw new Error("Nie znaleziono planu do zapisania.");
  }
  const normalizedPlan = normalizePlan(updatedPlan);
  await persistPlans(
    plans.map((plan) => (plan.id === updatedPlan.id ? normalizedPlan : plan)),
  );
}

export async function deletePlan(planId: string): Promise<void> {
  const plans = await loadPlans();
  if (!plans.some((plan) => plan.id === planId)) {
    throw new Error("Nie znaleziono planu do usunięcia.");
  }

  const remainingPlans = plans.filter((plan) => plan.id !== planId);
  await addDeletedId(
    DELETED_STORAGE_FILE,
    DELETED_STORAGE_KEY,
    "Zapis usuniętych planów jest nieprawidłowy.",
    planId,
  );
  if (!initialPlans.some((plan) => plan.id === planId))
    await persistPlans(remainingPlans);
}
