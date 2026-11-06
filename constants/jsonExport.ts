export async function exportJson(
  _filename: string,
  _value: unknown,
): Promise<void> {
  throw new Error(
    "Eksport plików JSON nie jest obsługiwany na tej platformie.",
  );
}
