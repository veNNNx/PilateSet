export function formatPolishCount(
  count: number,
  singular: string,
  few: string,
  plural: string,
): string {
  const lastDigit = Math.abs(count) % 10;
  const lastTwoDigits = Math.abs(count) % 100;
  const noun =
    count === 1
      ? singular
      : lastDigit >= 2 &&
          lastDigit <= 4 &&
          (lastTwoDigits < 12 || lastTwoDigits > 14)
        ? few
        : plural;
  return `${count} ${noun}`;
}
