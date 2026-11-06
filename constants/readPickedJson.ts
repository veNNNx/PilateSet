import type { DocumentPickerAsset } from "expo-document-picker";

export function readPickedJson(asset: DocumentPickerAsset): Promise<string> {
  if (!asset.file) {
    throw new Error("Nie można odczytać wybranego pliku w przeglądarce.");
  }
  return asset.file.text();
}
