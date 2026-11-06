import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";

export async function readJsonFile(
  filename: string,
  legacyKey: string,
): Promise<string | null> {
  const file = new File(Paths.document, filename);
  if (file.exists) return file.text();

  const legacyValue = await AsyncStorage.getItem(legacyKey);
  const initialValue = legacyValue ?? "[]";
  file.create({ intermediates: true });
  await file.write(initialValue);
  if (legacyValue !== null) await AsyncStorage.removeItem(legacyKey);
  return initialValue;
}

export async function writeJsonFile(
  filename: string,
  legacyKey: string,
  value: string,
): Promise<void> {
  const file = new File(Paths.document, filename);
  if (!file.exists) file.create({ intermediates: true });
  await file.write(value);
  await AsyncStorage.removeItem(legacyKey);
}

export function getJsonFileLocation(
  filename: string,
  _legacyKey: string,
): string {
  return new File(Paths.document, filename).uri;
}
