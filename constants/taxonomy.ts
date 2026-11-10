export const exerciseLevelLabels: Record<string, string> = {
  Początkujący: "P1",
  Średniozaawansowany: "P2",
  Zaawansowany: "P3",
};

export function formatBodyAreas(areas: string[]): string {
  return areas.join(" · ");
}

export function formatExercisePosition(
  position?: string | null,
): string | null {
  return position || null;
}
