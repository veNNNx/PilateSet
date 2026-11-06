import { readJsonFile, writeJsonFile } from "./jsonFileStorage";
import { canonicalSequenceId, getSequenceIdMap } from "./sequenceIds";
import { canonicalPlanId, getPlanIdMap } from "./planIds";

const STORAGE_FILE = "favorites.json";
const STORAGE_KEY = "pilateset.favorites.v1";

export type FavoriteType = "exercise" | "plan" | "sequence";

export interface Favorite {
  type: FavoriteType;
  id: string;
}

let favoritesCache: Favorite[] | null = null;
let favoritesLoad: Promise<Favorite[]> | null = null;
let updateQueue: Promise<void> = Promise.resolve();
let favoritesCacheVersion = 0;

export function clearFavoritesCache(): void {
  favoritesCache = null;
  favoritesLoad = null;
  favoritesCacheVersion += 1;
}

function isFavorite(value: unknown): value is Favorite {
  if (typeof value !== "object" || value === null) return false;
  const favorite = value as Record<string, unknown>;
  return (
    (favorite.type === "exercise" ||
      favorite.type === "plan" ||
      favorite.type === "sequence") &&
    typeof favorite.id === "string"
  );
}

export async function loadFavorites(): Promise<Favorite[]> {
  if (favoritesCache !== null) return favoritesCache;
  if (favoritesLoad) return favoritesLoad;

  const cacheVersion = favoritesCacheVersion;
  const loading = (async () => {
    const storedValue = await readJsonFile(STORAGE_FILE, STORAGE_KEY);
    const parsedValue: unknown =
      storedValue === null ? [] : JSON.parse(storedValue);
    if (!Array.isArray(parsedValue) || !parsedValue.every(isFavorite)) {
      throw new Error("Zapis ulubionych jest nieprawidłowy.");
    }
    const [sequenceIdMap, planIdMap] = await Promise.all([
      getSequenceIdMap(),
      getPlanIdMap(),
    ]);
    const normalizedFavorites = parsedValue.map((favorite) =>
      favorite.type === "sequence"
        ? { ...favorite, id: canonicalSequenceId(favorite.id, sequenceIdMap) }
        : favorite.type === "plan"
          ? { ...favorite, id: canonicalPlanId(favorite.id, planIdMap) }
          : favorite,
    );
    if (
      normalizedFavorites.some(
        (favorite, index) => favorite.id !== parsedValue[index].id,
      )
    ) {
      await writeJsonFile(
        STORAGE_FILE,
        STORAGE_KEY,
        JSON.stringify(normalizedFavorites, null, 2),
      );
    }
    const keys = new Set<string>();
    for (const favorite of normalizedFavorites) {
      const key = `${favorite.type}:${favorite.id}`;
      if (keys.has(key))
        throw new Error("Zapis zawiera powtórzone ulubione pozycje.");
      keys.add(key);
    }
    if (cacheVersion === favoritesCacheVersion) {
      favoritesCache = normalizedFavorites;
    }
    return normalizedFavorites;
  })();
  favoritesLoad = loading;

  try {
    return await loading;
  } finally {
    if (favoritesLoad === loading) favoritesLoad = null;
  }
}

export function toggleFavorite(
  type: FavoriteType,
  id: string,
): Promise<Favorite[]> {
  const operation = updateQueue.then(async () => {
    const favorites = await loadFavorites();
    const isAlreadyFavorite = favorites.some(
      (item) => item.type === type && item.id === id,
    );
    const updatedFavorites = isAlreadyFavorite
      ? favorites.filter((item) => item.type !== type || item.id !== id)
      : [...favorites, { type, id }];
    await writeJsonFile(
      STORAGE_FILE,
      STORAGE_KEY,
      JSON.stringify(updatedFavorites, null, 2),
    );
    favoritesCache = updatedFavorites;
    return updatedFavorites;
  });
  updateQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}
