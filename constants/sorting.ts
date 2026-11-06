export function sortFavoritesByName<T>(
  items: T[],
  isFavorite: (item: T) => boolean,
  getName: (item: T) => string,
): T[] {
  return [...items].sort((a, b) => {
    const favoriteOrder = Number(isFavorite(b)) - Number(isFavorite(a));
    if (favoriteOrder !== 0) return favoriteOrder;
    return getName(a).localeCompare(getName(b), "pl", { sensitivity: "base" });
  });
}
