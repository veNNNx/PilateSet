import { File } from "expo-file-system";
import type { DocumentPickerAsset } from "expo-document-picker";

export function readPickedJson(asset: DocumentPickerAsset): Promise<string> {
  return new File(asset.uri).text();
}
