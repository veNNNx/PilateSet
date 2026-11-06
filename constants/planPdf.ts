import * as Print from "expo-print";
import type { PlanPdfDocument } from "./planPdf.types";

export async function printPlanPdf(document: PlanPdfDocument) {
  await Print.printAsync({ html: document.html });
}
