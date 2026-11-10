import { addVirtualFileSystem, createPdf } from "pdfmake";
import virtualFileSystem from "pdfmake/build/vfs_fonts";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { Exercise } from "./exercises";
import type { PlanPdfDocument, PlanPdfItem } from "./planPdf.types";
import { exerciseLevelLabels } from "./taxonomy";

addVirtualFileSystem(virtualFileSystem);

const colors = {
  text: "#202B30",
  heading: "#173A3A",
  accent: "#397F78",
  secondary: "#526267",
  border: "#DCE5E3",
};

function estimateBadgeTextWidth(text: string) {
  return Array.from(text).reduce((width, character) => {
    if (/[ilI1|.,:;'!]/.test(character)) return width + 1.8;
    if (character === " ") return width + 2;
    if (/[mwMW@%]/.test(character)) return width + 6.2;
    if (/[A-ZĄĆĘŁŃÓŚŹŻ0-9]/.test(character)) return width + 5;
    return width + 3.8;
  }, 0);
}

function badge(text: string, level = false): Content {
  const label = text.trim();
  const width = Math.ceil(Math.max(20, estimateBadgeTextWidth(label) + 12));
  const escapedText = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
  const fill = level ? "#E4F0ED" : "#FFFFFF";
  const stroke = level ? "none" : colors.border;

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="16" viewBox="0 0 ${width} 16"><rect x="0.5" y="0.5" width="${width - 1}" height="15" rx="7.5" fill="${fill}" stroke="${stroke}"/><text x="6" y="8" dominant-baseline="middle" font-family="Roboto, Arial, sans-serif" font-size="6.5" fill="${colors.accent}">${escapedText}</text></svg>`,
    width,
    height: 16,
    margin: [0, 0, 4, 0],
  };
}

function levelBadge(level: string): Content {
  return badge(exerciseLevelLabels[level] ?? level, true);
}

function exerciseBlock(exercise: Exercise, number: string): Content[] {
  const metadata: Content[] = [];
  if (exercise.level) {
    metadata.push(levelBadge(exercise.level));
  }
  const load = exercise.load.trim();
  if (load) {
    metadata.push(badge(load));
  }
  const position = exercise.position?.trim();
  if (position) {
    metadata.push(badge(position));
  }

  const details = [
    ["Pozycja wejściowa", exercise.startingPosition],
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
      columns: metadata.map((badge) => ({
        width: "auto",
        stack: [badge],
      })),
      columnGap: 0,
      margin: [0, 0, 0, 3],
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

type PrintableBlock = {
  content: Content[];
  estimatedHeight: number;
};

function estimateWrappedLines(text: string, charactersPerLine: number) {
  let lines = 1;
  let currentLineLength = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (word.length > charactersPerLine) {
      if (currentLineLength > 0) {
        lines += 1;
        currentLineLength = 0;
      }
      lines += Math.floor((word.length - 1) / charactersPerLine);
      currentLineLength = word.length % charactersPerLine || charactersPerLine;
    } else if (currentLineLength === 0) {
      currentLineLength = word.length;
    } else if (currentLineLength + 1 + word.length <= charactersPerLine) {
      currentLineLength += 1 + word.length;
    } else {
      lines += 1;
      currentLineLength = word.length;
    }
  }
  return lines;
}

function estimateExerciseHeight(exercise: Exercise) {
  let height =
    estimateWrappedLines(exercise.name, 64) * 9.5 +
    2 +
    (exercise.level || exercise.load.trim() || exercise.position?.trim()
      ? 19
      : 0);

  for (const [label, value] of [
    ["Pozycja wejściowa", exercise.startingPosition],
    ["Sekwencja ruchu", exercise.movementSequence],
    ["Modyfikacje", exercise.modifications],
  ]) {
    if (value.trim()) {
      height += estimateWrappedLines(`${label}: ${value}`, 78) * 7.5 + 1;
    }
  }
  return height + 8;
}

function atomicBlock(
  content: Content[],
  estimatedHeight: number,
): PrintableBlock {
  return {
    content: [
      {
        table: {
          widths: ["*"],
          body: [[{ stack: content, border: [false, false, false, false] }]],
          dontBreakRows: true,
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
    ],
    estimatedHeight,
  };
}

function printableBlocks(items: PlanPdfItem[]): PrintableBlock[] {
  const blocks: PrintableBlock[] = [];

  for (const item of items) {
    if (item.type === "exercise") {
      blocks.push(
        atomicBlock(
          exerciseBlock(item.exercise, item.number),
          estimateExerciseHeight(item.exercise),
        ),
      );
      continue;
    }

    const firstExercise = item.exercises[0];
    const header: Content[] = [
      {
        text: [
          { text: `${item.number}. `, color: colors.accent },
          { text: `Sekwencja: ${item.name}`, color: colors.accent },
        ],
        style: "sequenceTitle",
      },
    ];
    const metadata = [
      ...item.levels.map(levelBadge),
      ...(item.load?.trim() ? [badge(item.load)] : []),
    ];
    if (metadata.length > 0) {
      header.push({
        columns: metadata.map((badgeContent) => ({
          width: "auto",
          stack: [badgeContent],
        })),
        columnGap: 0,
        margin: [0, 0, 0, 3],
      });
    }
    if (item.description) {
      header.push({
        text: item.description,
        style: "sequenceDescription",
      });
    }
    const headerHeight =
      12 +
      (metadata.length > 0 ? 19 : 0) +
      (item.description
        ? estimateWrappedLines(item.description, 90) * 7.5 + 3
        : 0);

    if (firstExercise) {
      blocks.push(
        atomicBlock(
          [
            ...header,
            ...exerciseBlock(firstExercise.exercise, firstExercise.number),
          ],
          headerHeight + estimateExerciseHeight(firstExercise.exercise),
        ),
      );
      item.exercises.slice(1).forEach(({ exercise, number }) => {
        blocks.push(
          atomicBlock(
            exerciseBlock(exercise, number),
            estimateExerciseHeight(exercise),
          ),
        );
      });
    } else {
      blocks.push(atomicBlock(header, headerHeight));
    }
  }

  return blocks;
}

function paginateBlocks(blocks: PrintableBlock[]) {
  const firstPageHeight = 720;
  const pageHeight = 770;
  const pages: PrintableBlock[][][] = [[[], []]];
  let pageIndex = 0;
  let columnIndex = 0;
  let usedHeight = 0;

  for (const block of blocks) {
    const availableHeight = pageIndex === 0 ? firstPageHeight : pageHeight;
    if (
      usedHeight > 0 &&
      usedHeight + block.estimatedHeight > availableHeight
    ) {
      columnIndex += 1;
      usedHeight = 0;
      if (columnIndex === 2) {
        pages.push([[], []]);
        pageIndex += 1;
        columnIndex = 0;
      }
    }

    pages[pageIndex][columnIndex].push(block);
    usedHeight += block.estimatedHeight;
  }

  return pages;
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
  const pages = paginateBlocks(printableBlocks(document.items));
  const definition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [28, 28, 28, 28],
    defaultStyle: {
      font: "Roboto",
      fontSize: 6.5,
      color: colors.text,
      lineHeight: 1.05,
    },
    styles: {
      eyebrow: {
        fontSize: 6,
        bold: true,
        characterSpacing: 0.8,
        color: colors.accent,
        margin: [0, 0, 0, 3],
      },
      planTitle: {
        fontSize: 17,
        bold: true,
        color: colors.heading,
        margin: [0, 0, 0, 3],
      },
      planDescription: {
        fontSize: 7,
        color: colors.secondary,
        margin: [0, 0, 0, 6],
      },
      sequenceTitle: {
        fontSize: 7.5,
        bold: true,
        color: colors.accent,
        margin: [0, 0, 0, 2],
      },
      sequenceDescription: {
        fontSize: 6.5,
        color: colors.secondary,
        margin: [0, 0, 0, 3],
      },
      exerciseTitle: {
        fontSize: 7.5,
        bold: true,
        margin: [0, 0, 0, 2],
      },
      detail: {
        fontSize: 6.2,
        margin: [0, 0, 0, 1],
      },
    },
    content: [
      { text: "PLAN TRENINGOWY", style: "eyebrow" },
      { text: document.name, style: "planTitle" },
      ...(document.description
        ? [{ text: document.description, style: "planDescription" as const }]
        : []),
      ...pages.map(([leftBlocks, rightBlocks], pageIndex) => ({
        columns: [
          {
            width: "*",
            stack: leftBlocks.flatMap((block) => block.content),
          },
          {
            width: "*",
            stack: rightBlocks.flatMap((block) => block.content),
          },
        ],
        columnGap: 18,
        ...(pageIndex > 0 ? { pageBreak: "before" as const } : {}),
      })),
    ],
  };
  await createPdf(definition).download(safeFileName(document.name));
}
