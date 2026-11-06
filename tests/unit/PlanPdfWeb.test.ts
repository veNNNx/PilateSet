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
  position: "Supine",
  level: "Basic",
  sets: "1 x 10",
  images: [],
  load: "Light",
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
          exercises: [{ number: "2.1", exercise }],
        },
      ],
    };
    await printPlanPdf(document);
    const call = mockCreatePdf.mock.calls[0];
    expect(call).toBeDefined();
    const definition = call[0] as {
      content: unknown[];
      styles: Record<string, unknown>;
    };
    expect(definition.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "Półłan – ćwiczenia!" }),
        expect.objectContaining({ columns: expect.any(Array) }),
      ]),
    );
    expect(definition.styles).toHaveProperty("sequenceDescription");
    expect(mockDownload).toHaveBeenCalledWith("po-an-cwiczenia.pdf");
  });

  it("uses a fallback filename when the plan name contains no safe characters", async () => {
    await printPlanPdf({ name: "💪", description: "", html: "", items: [] });
    expect(mockDownload).toHaveBeenCalledWith("plan-treningowy.pdf");
  });
});
