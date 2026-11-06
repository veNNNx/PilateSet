import AsyncStorage from "@react-native-async-storage/async-storage";

export function readJsonFile(
  _filename: string,
  legacyKey: string,
): Promise<string | null> {
  return AsyncStorage.getItem(legacyKey);
}

export function writeJsonFile(
  _filename: string,
  legacyKey: string,
  value: string,
): Promise<void> {
  return AsyncStorage.setItem(legacyKey, value);
}

export function getJsonFileLocation(
  _filename: string,
  legacyKey: string,
): string {
  return `localStorage (${legacyKey})`;
}
