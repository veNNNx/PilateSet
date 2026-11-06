import { addVirtualFileSystem, createPdf } from "pdfmake";
import virtualFileSystem from "pdfmake/build/vfs_fonts";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { Exercise } from "./exercises";
import type { PlanPdfDocument, PlanPdfItem } from "./planPdf.types";

addVirtualFileSystem(virtualFileSystem);

const colors = {
  text: "#202B30",
  heading: "#173A3A",
  accent: "#397F78",
  secondary: "#526267",
  border: "#DCE5E3",
};

function exerciseBlock(exercise: Exercise, number: string): Content[] {
  const metadata = [
    exercise.sets,
    exercise.level,
    exercise.bodyAreas.join(" · "),
    exercise.position ? `Pozycja: ${exercise.position}` : "",
  ].filter(Boolean);

  const details = [
    ["Pozycja wejściowa", exercise.startingPosition],
    ["Obciążenie", exercise.load],
    ["Sekwencja ruchu", exercise.movementSequence],
    ["Modyfikacje", exercise.modifications],
  ].filter(([, value]) => value.trim());

  const result: Content[] = [
    {
      text: [
        { text: `${number}. `, color: colors.accent },
        { text: exercise.name, color: colors.text },
      ],
      style: "exerciseTitle",
    },
  ];

  if (metadata.length > 0) {
    result.push({
      text: metadata.join("  •  "),
      style: "metadata",
    });
  }

  details.forEach(([label, value]) => {
    result.push({
      text: [
        { text: `${label}: `, bold: true, color: colors.secondary },
        { text: value, bold: false, color: colors.text },
      ],
      style: "detail",
    });
  });

  result.push({
    canvas: [
      {
        type: "line",
        x1: 0,
        y1: 4,
        x2: 250,
        y2: 4,
        lineWidth: 0.5,
        lineColor: colors.border,
      },
    ],
    margin: [0, 0, 0, 4],
  });
  return result;
}

function planItemBlock(item: PlanPdfItem): Content[] {
  if (item.type === "exercise") {
    return exerciseBlock(item.exercise, item.number);
  }

  const result: Content[] = [
    {
      text: [
        { text: `${item.number}. `, color: colors.accent },
        { text: `Sekwencja: ${item.name}`, color: colors.accent },
      ],
      style: "sequenceTitle",
    },
  ];
  if (item.description) {
    result.push({ text: item.description, style: "sequenceDescription" });
  }
  item.exercises.forEach(({ exercise, number }) => {
    result.push(...exerciseBlock(exercise, number));
  });
  return result;
}

function estimateItemWeight(item: PlanPdfItem) {
  if (item.type === "exercise") {
    return exerciseTextWeight(item.exercise);
  }
  return (
    20 +
    item.name.length +
    item.description.length +
    item.exercises.reduce(
      (total, entry) => total + exerciseTextWeight(entry.exercise),
      0,
    )
  );
}

function exerciseTextWeight(exercise: Exercise) {
  return [
    exercise.name,
    exercise.sets,
    exercise.level,
    exercise.bodyAreas.join(" "),
    exercise.position,
    exercise.startingPosition,
    exercise.load,
    exercise.movementSequence,
    exercise.modifications,
  ].join(" ").length;
}

function splitItems(items: PlanPdfItem[]) {
  const totalWeight = items.reduce(
    (total, item) => total + estimateItemWeight(item),
    0,
  );
  let leftWeight = 0;
  let splitIndex = 0;
  while (splitIndex < items.length - 1 && leftWeight < totalWeight / 2) {
    leftWeight += estimateItemWeight(items[splitIndex]);
    splitIndex += 1;
  }
  return [items.slice(0, splitIndex), items.slice(splitIndex)];
}

function safeFileName(name: string) {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${normalized || "plan-treningowy"}.pdf`;
}

export async function printPlanPdf(document: PlanPdfDocument) {
  const [leftItems, rightItems] = splitItems(document.items);
  const definition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [28, 28, 28, 28],
    defaultStyle: {
      font: "Roboto",
      fontSize: 7.5,
      color: colors.text,
      lineHeight: 1.05,
    },
    styles: {
      eyebrow: {
        fontSize: 7,
        bold: true,
        characterSpacing: 0.8,
        color: colors.accent,
        margin: [0, 0, 0, 3],
      },
      planTitle: {
        fontSize: 18,
        bold: true,
        color: colors.heading,
        margin: [0, 0, 0, 3],
      },
      planDescription: {
        fontSize: 8,
        color: colors.secondary,
        margin: [0, 0, 0, 6],
      },
      contentsTitle: {
        fontSize: 9,
        bold: true,
        color: colors.heading,
        margin: [0, 0, 0, 5],
      },
      sequenceTitle: {
        fontSize: 8.5,
        bold: true,
        color: colors.accent,
        margin: [0, 0, 0, 2],
      },
      sequenceDescription: {
        fontSize: 7.5,
        color: colors.secondary,
        margin: [0, 0, 0, 3],
      },
      exerciseTitle: {
        fontSize: 8.5,
        bold: true,
        margin: [0, 0, 0, 2],
      },
      metadata: {
        fontSize: 7,
        bold: true,
        italics: true,
        color: colors.accent,
        margin: [0, 0, 0, 3],
      },
      detail: {
        fontSize: 7.2,
        margin: [0, 0, 0, 1],
      },
    },
    content: [
      { text: "PLAN TRENINGOWY", style: "eyebrow" },
      { text: document.name, style: "planTitle" },
      ...(document.description
        ? [{ text: document.description, style: "planDescription" as const }]
        : []),
      { text: "Skład planu", style: "contentsTitle" },
      {
        columns: [
          { width: "*", stack: leftItems.flatMap(planItemBlock) },
          { width: "*", stack: rightItems.flatMap(planItemBlock) },
        ],
        columnGap: 18,
      },
    ],
  };
  await createPdf(definition).download(safeFileName(document.name));
}
