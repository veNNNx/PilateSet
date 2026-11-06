export function formatBodyAreas(areas: string[]): string {
  return areas.join(" · ");
}

export function formatExercisePosition(
  position?: string | null,
): string | null {
  return position ? `Pozycja: ${position}` : null;
}
