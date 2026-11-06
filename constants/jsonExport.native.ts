import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function exportJson(
  filename: string,
  value: unknown,
): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.create({ intermediates: true, overwrite: true });
  await file.write(JSON.stringify(value, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(
      "Udostępnianie plików nie jest dostępne na tym urządzeniu.",
    );
  }

  await Sharing.shareAsync(file.uri, {
    dialogTitle: `Eksportuj ${filename}`,
    mimeType: "application/json",
    UTI: "public.json",
  });
}
