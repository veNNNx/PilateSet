import { printPlanPdf } from "../../constants/planPdf.web";
import type { PlanPdfDocument } from "../../constants/planPdf.types";

const mockDownload = jest.fn().mockResolvedValue(undefined);
const mockCreatePdf = jest.fn((..._args: unknown[]) => ({
  download: mockDownload,
}));
jest.mock("pdfmake", () => ({
  addVirtualFileSystem: jest.fn(),
  createPdf: (definition: unknown) => mockCreatePdf(definition),
}));
jest.mock("pdfmake/build/vfs_fonts", () => ({}));

const exercise = {
  id: "1",
  name: "Hundred",
  bodyAreas: ["core"],
  position: "Supine ",
  level: "Początkujący",
  images: [],
  load: "Light ",
  startingPosition: "Lie down",
  movementSequence: "Move",
  modifications: "Modify",
};

describe("web PDF planner helpers", () => {
  beforeEach(() => {
    mockCreatePdf.mockClear();
    mockDownload.mockClear();
  });

  it("builds a two-column document with exercises, sequence details, and a safe filename", async () => {
    const document: PlanPdfDocument = {
      name: "Półłan – ćwiczenia!",
      description: "Routine",
      html: "ignored",
      items: [
        { type: "exercise", number: "1", exercise },
        {
          type: "sequence",
          number: "2",
          name: "Flow",
          description: "Flow details",
          load: "Medium spring ",
          levels: ["Średniozaawansowany"],
          exercises: [{ number: "2.1", exercise }],
        },
      ],
    };
    await printPlanPdf(document);
    const call = mockCreatePdf.mock.calls[0];
    expect(call).toBeDefined();
    const definition = call[0] as {
      content: unknown[];
      defaultStyle: { fontSize: number };
      styles: Record<string, unknown>;
    };
    expect(definition.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "Półłan – ćwiczenia!" }),
        expect.objectContaining({ columns: expect.any(Array) }),
      ]),
    );
    const printedContent = JSON.stringify(definition.content);
    expect(printedContent).toContain("P1");
    expect(printedContent).toContain("P2");
    expect(printedContent).toContain("Light");
    expect(printedContent).toContain("Medium spring");
    expect(printedContent).toContain("Supine");
    expect(printedContent).toContain("<svg");
    expect(printedContent).toContain('font-size=\\"6.5\\"');
    expect(printedContent).toContain('rx=\\"7.5\\"');
    expect(printedContent).not.toContain("<path");
    expect(printedContent).not.toContain("core");
    expect(printedContent).not.toContain("Pozycja:");
    expect(printedContent).not.toContain("Obciążenie");
    expect(printedContent).not.toContain("Skład planu");
    expect(printedContent.indexOf(">P2</text>")).toBeLessThan(
      printedContent.indexOf("Medium spring"),
    );
    expect(printedContent).toContain('fill=\\"#E4F0ED\\" stroke=\\"none\\"');
    expect(printedContent).toContain('fill=\\"#FFFFFF\\" stroke=\\"#DCE5E3\\"');
    expect(printedContent).not.toContain(">Medium spring </text>");
    expect(printedContent).not.toContain(">Light </text>");
    expect(printedContent).not.toContain(">Supine </text>");
    expect(definition.styles).toHaveProperty("sequenceDescription");
    expect(definition.defaultStyle.fontSize).toBe(6.5);
    expect(definition.styles).toMatchObject({
      eyebrow: { fontSize: 6 },
      planTitle: { fontSize: 17 },
      planDescription: { fontSize: 7 },
      sequenceTitle: { fontSize: 7.5 },
      sequenceDescription: { fontSize: 6.5 },
      exerciseTitle: { fontSize: 7.5 },
      detail: { fontSize: 6.2 },
    });
    expect(mockDownload).toHaveBeenCalledWith("po-an-cwiczenia.pdf");
  });

  it("uses a fallback filename when the plan name contains no safe characters", async () => {
    await printPlanPdf({ name: "💪", description: "", html: "", items: [] });
    expect(mockDownload).toHaveBeenCalledWith("plan-treningowy.pdf");
  });

  it("moves whole exercises to the next column and explicitly starts following pages", async () => {
    const longExercise = (id: string, name: string) => ({
      ...exercise,
      id,
      name,
      startingPosition: "start ".repeat(160),
      movementSequence: "move ".repeat(160),
      modifications: "modify ".repeat(160),
    });
    await printPlanPdf({
      name: "Long plan",
      description: "",
      html: "",
      items: [
        { type: "exercise", number: "1", exercise: longExercise("1", "Alpha") },
        { type: "exercise", number: "2", exercise: longExercise("2", "Bravo") },
        {
          type: "exercise",
          number: "3",
          exercise: longExercise("3", "Charlie"),
        },
        { type: "exercise", number: "4", exercise: longExercise("4", "Delta") },
        { type: "exercise", number: "5", exercise: longExercise("5", "Echo") },
      ],
    });

    const definition = mockCreatePdf.mock.calls[0][0] as {
      content: {
        columns?: { stack: unknown[] }[];
        pageBreak?: string;
      }[];
    };
    const pageLayouts = definition.content.filter((item) => item.columns);
    expect(pageLayouts.length).toBeGreaterThan(1);
    const firstLeftColumn = JSON.stringify(pageLayouts[0].columns?.[0]);
    const firstRightColumn = JSON.stringify(pageLayouts[0].columns?.[1]);
    expect(firstLeftColumn).toContain("Alpha");
    expect(firstLeftColumn).toContain("Bravo");
    expect(firstLeftColumn).not.toContain("Charlie");
    expect(firstRightColumn).toContain("Charlie");
    expect(firstRightColumn).toContain("Delta");
    expect(firstRightColumn).not.toContain("Echo");
    expect(pageLayouts[1].pageBreak).toBe("before");
    expect(firstLeftColumn).toContain('"dontBreakRows":true');
  });
});
