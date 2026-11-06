import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  loadFavorites,
  toggleFavorite,
  type FavoriteType,
} from "./favoritesStorage";

export function useFavorites() {
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      loadFavorites()
        .then((favorites) => {
          if (isActive) {
            setFavoriteKeys(
              new Set(
                favorites.map((favorite) => `${favorite.type}:${favorite.id}`),
              ),
            );
            setError("");
          }
        })
        .catch((loadError: unknown) => {
          if (isActive) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Nie udało się wczytać ulubionych.",
            );
          }
        });
      return () => {
        isActive = false;
      };
    }, []),
  );

  const isFavorite = useCallback(
    (type: FavoriteType, id: string) => favoriteKeys.has(`${type}:${id}`),
    [favoriteKeys],
  );

  const toggle = useCallback(async (type: FavoriteType, id: string) => {
    try {
      const favorites = await toggleFavorite(type, id);
      setFavoriteKeys(
        new Set(favorites.map((favorite) => `${favorite.type}:${favorite.id}`)),
      );
      setError("");
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Nie udało się zapisać ulubionych.",
      );
    }
  }, []);

  return { isFavorite, toggle, error };
}
