import { Alert, StyleSheet } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Print from "expo-print";
import {
  getNextPlanId,
  loadPlans,
  savePlan,
  updatePlan,
} from "../../constants/planStorage";
import { createPdf } from "pdfmake";
import {
  getNextSequenceId,
  loadSequences,
  saveSequence,
  updateSequence,
} from "../../constants/sequenceStorage";
import {
  deleteCalendarEntry,
  loadCalendarEntries,
  saveCalendarEntry,
  saveCalendarEntries,
  updateCalendarEntry,
} from "../../constants/calendarStorage";
import {
  loadExerciseNotes,
  saveExerciseNote,
} from "../../constants/exerciseNotesStorage";
import {
  loadSequenceNotes,
  saveSequenceNote,
} from "../../constants/sequenceNotesStorage";
import { navigateBack } from "../../constants/navigation";
import { useExerciseImagePreference } from "../../constants/exerciseImagePreference";
import { Colors as AppColors } from "../../constants/colors";
import exercises from "../../constants/exercises";
import NewPlanScreen from "../../app/plan/new";
import NewSequenceScreen from "../../app/sequence/new";
import PlanDetailScreen from "../../app/plan/[id]";
import SequenceDetailScreen from "../../app/sequence/[id]";
import NewCalendarEntryScreen from "../../app/calendar/new";
import CalendarEntryDetailsScreen from "../../app/calendar/[id]";
import ExerciseDetailScreen from "../../app/exercise/[id]";
import { printPlanPdf as printPlanPdfWeb } from "../../constants/planPdf.web";

jest.mock("../../constants/exercises", () => ({
  __esModule: true,
  default:
    jest.requireActual<typeof import("../fixtures/data")>("../fixtures/data")
      .exercises,
}));

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useFocusEffect: (callback: () => void | (() => void)) =>
      React.useEffect(callback, [callback]),
    useLocalSearchParams: jest.fn(() => ({ id: "p100" })),
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-print", () => ({
  printAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("pdfmake", () => ({
  addVirtualFileSystem: jest.fn(),
  createPdf: jest.fn(() => ({
    download: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("pdfmake/build/vfs_fonts", () => ({}));

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("react-native-draggable-flatlist", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { FlatList } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: (props: React.ComponentProps<typeof FlatList>) =>
      React.createElement(FlatList, props),
  };
});

jest.mock("../../constants/exerciseImages", () => ({
  getExerciseImage: () => 1,
}));

jest.mock("../../constants/exerciseImagePreference", () => ({
  useExerciseImagePreference: jest.fn(() => ({
    showExerciseImages: true,
    loading: false,
    saving: false,
    error: "",
    setShowExerciseImages: jest.fn(),
  })),
}));

jest.mock("../../constants/useFavorites", () => {
  const isFavorite = () => false;
  const toggle = jest.fn();
  return {
    useFavorites: () => ({ isFavorite, toggle, error: "" }),
  };
});

jest.mock("../../constants/useExercises", () => {
  const updateExercise = jest.fn().mockResolvedValue(undefined);
  return {
    useExercises: () => ({
      exercises: jest.requireMock<any>("../../constants/exercises").default,
      error: "",
      updateExercise,
    }),
    __updateExercise: updateExercise,
  };
});

jest.mock("../../constants/planStorage", () => ({
  getNextPlanId: jest.fn(),
  loadPlans: jest.fn(),
  savePlan: jest.fn(),
  updatePlan: jest.fn(),
  deletePlan: jest.fn(),
}));

jest.mock("../../constants/sequenceStorage", () => ({
  getNextSequenceId: jest.fn(),
  loadSequences: jest.fn(),
  saveSequence: jest.fn(),
  updateSequence: jest.fn(),
  deleteSequence: jest.fn(),
}));

jest.mock("../../constants/calendarStorage", () => ({
  deleteCalendarEntry: jest.fn(),
  loadCalendarEntries: jest.fn(),
  saveCalendarEntry: jest.fn(),
  saveCalendarEntries: jest.fn(),
  updateCalendarEntry: jest.fn(),
}));

jest.mock("../../constants/exerciseNotesStorage", () => ({
  loadExerciseNotes: jest.fn(),
  saveExerciseNote: jest.fn(),
}));

jest.mock("../../constants/sequenceNotesStorage", () => ({
  loadSequenceNotes: jest.fn(),
  saveSequenceNote: jest.fn(),
}));

jest.mock("../../constants/navigation", () => ({
  navigateBack: jest.fn(),
}));

jest.mock("../../constants/jsonFileStorage", () => ({
  getJsonFileLocation: () => "pamięć urządzenia",
}));

const exercise = exercises[0];
const plan = {
  id: "p100",
  name: "Test plan",
  description: "A focused session",
  content: [{ type: "exercise" as const, id: exercise.id }],
};
const sequence = {
  id: "s100",
  name: "Test sequence",
  description: "A short flow",
  load: "",
  exerciseIds: [exercise.id],
};
const calendarEntry = {
  id: "entry-1",
  date: "2099-12-31",
  hour: 18,
  planId: plan.id,
  planName: plan.name,
  description: "Evening session",
};
const mockExerciseUpdate = (
  jest.requireMock<any>("../../constants/useExercises") as {
    __updateExercise: jest.Mock;
  }
).__updateExercise;

beforeEach(() => {
  jest.clearAllMocks();
  mockExerciseUpdate.mockResolvedValue(undefined);
  jest.mocked(getNextPlanId).mockResolvedValue("p101");
  jest.mocked(loadPlans).mockResolvedValue([plan]);
  jest.mocked(savePlan).mockResolvedValue(undefined);
  jest.mocked(updatePlan).mockResolvedValue(undefined);
  jest.mocked(getNextSequenceId).mockResolvedValue("s101");
  jest.mocked(loadSequences).mockResolvedValue([sequence]);
  jest.mocked(saveSequence).mockResolvedValue(undefined);
  jest.mocked(updateSequence).mockResolvedValue(undefined);
  jest.mocked(loadCalendarEntries).mockResolvedValue([calendarEntry]);
  jest.mocked(saveCalendarEntry).mockResolvedValue(undefined);
  jest.mocked(saveCalendarEntries).mockResolvedValue(undefined);
  jest.mocked(updateCalendarEntry).mockResolvedValue(undefined);
  jest.mocked(deleteCalendarEntry).mockResolvedValue(undefined);
  jest.mocked(loadExerciseNotes).mockResolvedValue([]);
  jest.mocked(saveExerciseNote).mockResolvedValue(undefined);
  jest.mocked(loadSequenceNotes).mockResolvedValue([]);
  jest.mocked(saveSequenceNote).mockResolvedValue(undefined);
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: "p100" });
});

describe("Plan creation", () => {
  it("requires a name and at least one selected item", async () => {
    await render(<NewPlanScreen />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz nowy plan" }),
    );

    expect(
      screen.getByText(
        "Uzupełnij nazwę planu i dodaj ćwiczenie lub sekwencję.",
      ),
    ).toBeTruthy();
    expect(savePlan).not.toHaveBeenCalled();
  });

  it("creates a plan with selected exercise content", async () => {
    await render(<NewPlanScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Nazwa planu"),
      "  Morning flow  ",
    );
    await fireEvent.press(screen.getByLabelText("Dodaj ćwiczenia"));
    await fireEvent.press(
      await screen.findByRole("checkbox", {
        name: `Dodaj ${exercise.name} do planu`,
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Zamknij" }));
    expect(screen.getByText(exercise.name)).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: `Usuń ćwiczenie ${exercise.name} z planu`,
      }),
    ).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz nowy plan" }),
    );

    expect(savePlan).toHaveBeenCalledWith({
      id: "p101",
      name: "Morning flow",
      description: "",
      content: [{ type: "exercise", id: exercise.id }],
    });
    expect(navigateBack).toHaveBeenCalledWith("/");
  });

  it("uses the same sequence card and drag handle in plan creation", async () => {
    await render(<NewPlanScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Nazwa planu"),
      "Plan with sequence",
    );
    expect(
      StyleSheet.flatten(screen.getByLabelText("Dodaj ćwiczenia").props.style)
        .backgroundColor,
    ).toBe(AppColors.cardBackground);
    await fireEvent.press(screen.getByLabelText("Dodaj sekwencję do planu"));
    await fireEvent.press(
      await screen.findByRole("checkbox", {
        name: `Dodaj sekwencję ${sequence.name}`,
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Zamknij" }));

    expect(screen.getByTestId("selected-plan-content")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: `${sequence.name}, przytrzymaj aby zmienić kolejność`,
      }),
    ).toBeTruthy();
    expect(
      screen.queryByLabelText(`Przesuń sekwencję ${sequence.name} wyżej`),
    ).toBeNull();
    await fireEvent.press(screen.getByLabelText("Dodaj ćwiczenia"));
    await fireEvent.press(
      await screen.findByRole("checkbox", {
        name: `Dodaj ${exercise.name} do planu`,
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Zamknij" }));
    const sequenceRow = screen.getByTestId(
      `reorderable-row:sequence:${sequence.id}`,
    );
    const exerciseRow = screen.getByTestId(
      `reorderable-row:exercise:${exercise.id}`,
    );
    sequenceRow.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 100 } },
    });
    exerciseRow.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 100, width: 300, height: 100 } },
    });
    const exerciseCard = within(exerciseRow).getByRole("checkbox", {
      name: `${exercise.name}, przytrzymaj aby zmienić kolejność`,
    });
    await fireEvent(exerciseCard, "longPress", {
      nativeEvent: { locationY: 50 },
    });
    await act(async () => {
      exerciseRow.props.onResponderMove({
        touchHistory: {
          mostRecentTimeStamp: 10,
          numberActiveTouches: 1,
          indexOfSingleActiveTouch: 0,
          touchBank: [
            {
              touchActive: true,
              currentTimeStamp: 10,
              currentPageX: 0,
              currentPageY: 30,
              previousPageX: 0,
              previousPageY: 150,
            },
          ],
        },
      });
    });
    await act(async () => {
      exerciseRow.props.onResponderRelease({});
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz nowy plan" }),
    );

    expect(savePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        content: [
          { type: "exercise", id: exercise.id },
          { type: "sequence", id: sequence.id },
        ],
      }),
    );
  });
});

describe("Sequence creation", () => {
  it("creates a sequence after selecting an exercise", async () => {
    await render(<NewSequenceScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Nazwa sekwencji"),
      "Core sequence",
    );
    await fireEvent.press(screen.getByLabelText("Dodaj ćwiczenia"));
    await fireEvent.press(
      await screen.findByRole("checkbox", {
        name: `Dodaj ${exercise.name} do sekwencji`,
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Zamknij" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz nową sekwencję" }),
    );

    expect(saveSequence).toHaveBeenCalledWith({
      id: "s101",
      name: "Core sequence",
      description: "",
      load: "",
      exerciseIds: [exercise.id],
    });
    expect(navigateBack).toHaveBeenCalledWith("/sequences");
  });

  it("allows selected sequence exercises to be reordered by dragging", async () => {
    const secondExercise = exercises[1];
    await render(<NewSequenceScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Nazwa sekwencji"),
      "Ordered sequence",
    );
    await fireEvent.press(screen.getByLabelText("Dodaj ćwiczenia"));
    await fireEvent.press(
      await screen.findByRole("checkbox", {
        name: `Dodaj ${exercise.name} do sekwencji`,
      }),
    );
    await fireEvent.press(
      await screen.findByRole("checkbox", {
        name: `Dodaj ${secondExercise.name} do sekwencji`,
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Zamknij" }));

    expect(screen.getByTestId("selected-sequence-content")).toBeTruthy();
    expect(
      screen.queryByLabelText(`Przesuń ${exercise.name} wyżej`),
    ).toBeNull();
    const firstRow = screen.getByTestId(
      `reorderable-row:exercise:${exercise.id}`,
    );
    const secondRow = screen.getByTestId(
      `reorderable-row:exercise:${secondExercise.id}`,
    );
    firstRow.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 100 } },
    });
    secondRow.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 100, width: 300, height: 100 } },
    });

    const firstCard = within(firstRow).getByRole("checkbox", {
      name: `${exercise.name}, przytrzymaj aby zmienić kolejność`,
    });
    await fireEvent(firstCard, "longPress", { nativeEvent: { locationY: 50 } });
    await act(async () => {
      firstRow.props.onResponderMove({
        touchHistory: {
          mostRecentTimeStamp: 10,
          numberActiveTouches: 1,
          indexOfSingleActiveTouch: 0,
          touchBank: [
            {
              touchActive: true,
              currentTimeStamp: 10,
              currentPageX: 0,
              currentPageY: 170,
              previousPageX: 0,
              previousPageY: 50,
            },
          ],
        },
      });
    });
    expect(screen.getByTestId("reorder-drop-indicator")).toBeTruthy();
    await act(async () => {
      firstRow.props.onResponderRelease({});
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz nową sekwencję" }),
    );

    expect(saveSequence).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseIds: [secondExercise.id, exercise.id],
      }),
    );
  });
});

describe("Plan and sequence details", () => {
  it("creates a PDF download directly instead of opening the browser print dialog", async () => {
    await printPlanPdfWeb({
      name: "Test plan",
      description: "Plan description",
      html: "<html></html>",
      items: [
        { type: "exercise", number: "1", exercise },
        {
          type: "sequence",
          number: "2",
          name: sequence.name,
          description: sequence.description,
          load: "Medium spring ",
          levels: ["Średniozaawansowany"],
          exercises: [{ number: "2.1", exercise: exercises[1] }],
        },
      ],
    });

    const pdfDefinition = jest.mocked(createPdf).mock.calls[0][0];
    expect(JSON.stringify(pdfDefinition)).toContain(exercise.name);
    expect(JSON.stringify(pdfDefinition)).toContain(exercise.startingPosition);
    expect(JSON.stringify(pdfDefinition)).toContain("Pozycja wejściowa");
    expect(JSON.stringify(pdfDefinition)).toContain(sequence.name);
    expect(JSON.stringify(pdfDefinition)).toContain("Medium spring");
    const pdfContent = JSON.stringify(pdfDefinition);
    expect(pdfContent).toContain(">P2</text>");
    expect(pdfContent.indexOf(">P2</text>")).toBeLessThan(
      pdfContent.indexOf("Medium spring"),
    );
    expect(JSON.stringify(pdfDefinition)).toContain(exercises[1].name);
    expect(pdfDefinition.styles?.exerciseTitle).toMatchObject({ bold: true });
    expect(pdfDefinition.styles?.sequenceTitle).toMatchObject({ bold: true });
    expect(pdfContent).toContain("rx");
    expect(pdfDefinition).not.toHaveProperty("header");
    expect(pdfDefinition).not.toHaveProperty("footer");
    expect(
      jest.mocked(createPdf).mock.results[0].value.download,
    ).toHaveBeenCalledWith("test-plan.pdf");
  });

  it("prints the plan details and ordered contents", async () => {
    await render(<PlanDetailScreen />);

    await fireEvent.press(
      await screen.findByRole("button", { name: "Drukuj plan" }),
    );

    expect(Print.printAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(`<h1>${plan.name}</h1>`),
      }),
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      exercise.name,
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      `class="item-number">1.</span> ${exercise.name}`,
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      "font-size: 17pt",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      "font-size: 7pt",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      "column-count: 2",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      "column-fill: auto",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      "font-size: 7.5pt",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      exercise.movementSequence,
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      'class="level-badge">P1</span>',
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      'class="load-badge">Light spring</span>',
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).not.toContain(
      "<svg",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      'class="position-badge">Supine (plecy)</span>',
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).not.toContain(
      "nogi",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).not.toContain(
      "Skład planu",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).not.toContain(
      "Obciążenie:",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).not.toContain(
      "Pozycja:",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      ".exercise h3 {\n              color: #202b30;\n              font-size: 7.5pt;\n              font-weight: 700;",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      ".load-badge, .position-badge {\n              align-items: center;\n              background: #fff;\n              border: 1px solid #dce5e3;",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      ".detail strong {\n              color: #526267;\n              font-size: 6pt;\n              font-weight: 700;",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      ".detail p {\n              color: #202b30;\n              display: inline;\n              font-size: 6.5pt;\n              font-weight: 400;",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).toContain(
      "@page { margin: 0; }",
    );
    expect(jest.mocked(Print.printAsync).mock.calls[0][0].html).not.toContain(
      "<title>",
    );
  });

  it("expands sequence exercises and includes their details in the print document", async () => {
    const sequenceExercise = exercises[1];
    const secondSequenceExercise = exercises[2];
    const trailingExercise = exercises[3];
    jest.mocked(loadPlans).mockResolvedValue([
      {
        ...plan,
        content: [
          { type: "exercise", id: exercise.id },
          { type: "sequence", id: sequence.id },
          { type: "exercise", id: trailingExercise.id },
        ],
      },
    ]);
    jest.mocked(loadSequences).mockResolvedValue([
      {
        ...sequence,
        description: "Sequence description",
        load: "Medium spring ",
        exerciseIds: [sequenceExercise.id, secondSequenceExercise.id],
      },
    ]);
    await render(<PlanDetailScreen />);

    await fireEvent.press(
      await screen.findByRole("button", { name: "Drukuj plan" }),
    );

    const printedHtml =
      jest.mocked(Print.printAsync).mock.calls[0][0].html ?? "";
    expect(printedHtml).toContain(`Sekwencja: ${sequence.name}`);
    expect(printedHtml).toContain(
      `class="item-number">2.</span> Sekwencja: ${sequence.name}`,
    );
    expect(printedHtml).toContain("Sequence description");
    const sequenceHeadingIndex = printedHtml.indexOf(
      `Sekwencja: ${sequence.name}`,
    );
    const sequenceLevelIndex = printedHtml.indexOf(
      '<span class="level-badge">P2</span><span class="level-badge">P3</span>',
    );
    const sequenceLoadIndex = printedHtml.indexOf(
      '<span class="load-badge">Medium spring</span>',
    );
    const sequenceDescriptionIndex = printedHtml.indexOf(
      "Sequence description",
    );
    expect(sequenceLevelIndex).toBeGreaterThan(sequenceHeadingIndex);
    expect(sequenceLoadIndex).toBeGreaterThan(sequenceLevelIndex);
    expect(sequenceDescriptionIndex).toBeGreaterThan(sequenceLoadIndex);
    expect(printedHtml).toContain(
      `class="item-number">1.</span> ${exercise.name}`,
    );
    expect(printedHtml).toContain(
      `class="item-number">2.1.</span> ${sequenceExercise.name}`,
    );
    expect(printedHtml).toContain(
      `class="item-number">2.2.</span> ${secondSequenceExercise.name}`,
    );
    expect(printedHtml).toContain(
      `class="item-number">3.</span> ${trailingExercise.name}`,
    );
    expect(printedHtml).toContain(sequenceExercise.startingPosition);
    expect(printedHtml).toContain("Pozycja wejściowa");
    expect(printedHtml).toContain("Sekwencja ruchu");
    expect(printedHtml).not.toContain("Skład planu");
  });

  it("uses a native scroll view to display expanded sequence exercises", async () => {
    const sequenceExercises = exercises.slice(0, 8);
    jest.mocked(loadPlans).mockResolvedValue([
      {
        ...plan,
        content: [{ type: "sequence", id: sequence.id }],
      },
    ]);
    jest.mocked(loadSequences).mockResolvedValue([
      {
        ...sequence,
        exerciseIds: sequenceExercises.map((item) => item.id),
      },
    ]);
    await render(<PlanDetailScreen />);

    expect(await screen.findByTestId("plan-details-scroll")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", {
        name: `Rozwiń sekwencję ${sequence.name}`,
      }),
    );

    expect(
      screen.getByText(sequenceExercises[sequenceExercises.length - 1].name),
    ).toBeTruthy();
  });

  it("loads plan content and saves edited plan details", async () => {
    await render(<PlanDetailScreen />);

    expect(await screen.findByText(plan.name)).toBeTruthy();
    expect(await screen.findByText(exercise.name)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Edytuj plan" }));
    expect(screen.getByText(exercise.name)).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Nazwa planu"),
      "Updated plan",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany planu" }),
    );

    expect(updatePlan).toHaveBeenCalledWith({
      ...plan,
      name: "Updated plan",
    });
  });

  it("keeps plan items visible in edit mode and enables hold-to-reorder", async () => {
    const secondExercise = exercises[1];
    jest.mocked(loadPlans).mockResolvedValue([
      {
        ...plan,
        content: [
          { type: "exercise", id: exercise.id },
          { type: "exercise", id: secondExercise.id },
        ],
      },
    ]);
    await render(<PlanDetailScreen />);
    await screen.findByText(plan.name);
    await fireEvent.press(screen.getByRole("button", { name: "Edytuj plan" }));

    expect(screen.getByTestId("plan-edit-list")).toBeTruthy();
    expect(screen.getByText(exercise.name)).toBeTruthy();
    expect(screen.getByText(secondExercise.name)).toBeTruthy();
    expect(
      screen.getByText(
        "Przytrzymaj kafelek i przeciągnij, aby zmienić kolejność.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: `${secondExercise.name}, przytrzymaj aby zmienić kolejność`,
      }),
    ).toBeTruthy();
    await fireEvent(
      screen.getByRole("button", {
        name: `${secondExercise.name}, przytrzymaj aby zmienić kolejność`,
      }),
      "longPress",
    );
    expect(
      screen.getByRole("button", {
        name: `${secondExercise.name}, zmienianie kolejności`,
      }),
    ).toBeTruthy();
    const reorderableRow = screen.getByTestId(
      `reorder-item:exercise:${secondExercise.id}`,
    );
    expect(typeof reorderableRow.props.onMoveShouldSetResponderCapture).toBe(
      "function",
    );
    expect(typeof reorderableRow.props.onTouchEnd).toBe("function");
    await act(async () => {
      reorderableRow.props.onTouchEnd();
    });
    expect(
      screen.getByRole("button", {
        name: `${secondExercise.name}, przytrzymaj aby zmienić kolejność`,
      }),
    ).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany planu" }),
    );

    expect(updatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        content: [
          { type: "exercise", id: exercise.id },
          { type: "exercise", id: secondExercise.id },
        ],
      }),
    );
  });

  it("keeps item order stable while dragging and commits the drop once released", async () => {
    const secondExercise = exercises[1];
    jest.mocked(loadPlans).mockResolvedValue([
      {
        ...plan,
        content: [
          { type: "exercise", id: exercise.id },
          { type: "exercise", id: secondExercise.id },
        ],
      },
    ]);
    await render(<PlanDetailScreen />);
    await screen.findByText(plan.name);
    await fireEvent.press(screen.getByRole("button", { name: "Edytuj plan" }));

    const firstItem = screen.getByTestId(
      `reorder-item:exercise:${exercise.id}`,
    );
    const secondItem = screen.getByTestId(
      `reorder-item:exercise:${secondExercise.id}`,
    );
    firstItem.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 100 } },
    });
    secondItem.props.onLayout({
      nativeEvent: { layout: { x: 0, y: 100, width: 300, height: 100 } },
    });
    await fireEvent(
      screen.getByRole("button", {
        name: `${exercise.name}, przytrzymaj aby zmienić kolejność`,
      }),
      "longPress",
    );

    const orderBeforeDrag = screen
      .getAllByTestId(/^reorder-item:/)
      .map((item) => item.props.testID);
    await act(async () => {
      firstItem.props.onResponderMove({
        touchHistory: {
          mostRecentTimeStamp: 2,
          numberActiveTouches: 1,
          indexOfSingleActiveTouch: 0,
          touchBank: [
            {
              touchActive: true,
              currentTimeStamp: 2,
              currentPageX: 0,
              currentPageY: 150,
              previousPageX: 0,
              previousPageY: 100,
            },
          ],
        },
      });
    });
    expect(
      screen.getAllByTestId(/^reorder-item:/).map((item) => item.props.testID),
    ).toEqual(orderBeforeDrag);
    expect(
      screen.getByTestId("drop-position-indicator").props.style[1].top,
    ).toBe(198);

    await act(async () => {
      firstItem.props.onResponderRelease({}, { moveY: 150 });
    });
    expect(
      screen.getAllByTestId(/^reorder-item:/).map((item) => item.props.testID),
    ).toEqual(orderBeforeDrag.reverse());
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany planu" }),
    );

    expect(updatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        content: [
          { type: "exercise", id: secondExercise.id },
          { type: "exercise", id: exercise.id },
        ],
      }),
    );
  });

  it("renders the sequence route and saves a personal sequence note", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "s100" });
    await render(<SequenceDetailScreen />);

    expect(await screen.findByText(sequence.name)).toBeTruthy();
    expect(await screen.findByText(exercise.name)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Drukuj plan" })).toBeNull();
    await fireEvent.press(
      screen.getByRole("button", { name: "Edytuj sekwencję" }),
    );
    await fireEvent(
      screen.getByRole("button", {
        name: `${exercise.name}, przytrzymaj aby zmienić kolejność`,
      }),
      "longPress",
    );
    expect(
      screen.getByRole("button", {
        name: `${exercise.name}, zmienianie kolejności`,
      }),
    ).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Notatka do sekwencji"),
      "Remember the breath",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz notatkę do sekwencji" }),
    );

    expect(saveSequenceNote).toHaveBeenCalledWith(
      "s100",
      "Remember the breath",
    );
  });

  it("shows a not-found state for an unknown plan", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "missing" });
    jest.mocked(loadPlans).mockResolvedValueOnce([]);

    await render(<PlanDetailScreen />);

    expect(await screen.findByText("Nie znaleziono planu.")).toBeTruthy();
  });

  it("shows a not-found state for an unknown sequence", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "missing" });
    jest.mocked(loadSequences).mockResolvedValueOnce([]);

    await render(<SequenceDetailScreen />);

    expect(await screen.findByText("Nie znaleziono sekwencji.")).toBeTruthy();
  });
});

describe("Calendar entry creation and details", () => {
  it("validates required time and plan before saving", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({});
    await render(<NewCalendarEntryScreen />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz trening" }),
    );

    expect(screen.getByText("Wybierz godzinę i plan treningowy.")).toBeTruthy();
    expect(saveCalendarEntries).not.toHaveBeenCalled();
  });

  it("creates a calendar entry with the selected plan and time", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({});
    await render(<NewCalendarEntryScreen />);
    await fireEvent.press(screen.getByRole("checkbox", { name: "18:00" }));
    await fireEvent.press(
      await screen.findByRole("radio", { name: /Test plan/ }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Opis treningu"),
      "  Evening session  ",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz trening" }),
    );

    expect(saveCalendarEntries).toHaveBeenCalledWith([
      expect.objectContaining({
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        hour: 18,
        planId: plan.id,
        planName: plan.name,
        description: "Evening session",
      }),
    ]);
    expect(saveCalendarEntry).not.toHaveBeenCalled();
    expect(navigateBack).toHaveBeenCalledWith("/calendar");
  });

  it("creates a separate calendar entry for every selected hour", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({});
    await render(<NewCalendarEntryScreen />);
    await fireEvent.press(screen.getByRole("checkbox", { name: "17:00" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "19:00" }));
    await fireEvent.press(
      await screen.findByRole("radio", { name: /Test plan/ }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz trening" }),
    );

    const savedEntries = jest.mocked(saveCalendarEntries).mock.calls[0][0];
    expect(savedEntries).toHaveLength(2);
    expect(savedEntries.map((entry) => entry.hour)).toEqual([17, 19]);
    expect(new Set(savedEntries.map((entry) => entry.id)).size).toBe(2);
    expect(savedEntries[0]).toEqual(
      expect.objectContaining({
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        planId: plan.id,
        planName: plan.name,
      }),
    );
    expect(navigateBack).toHaveBeenCalledWith("/calendar");
  });

  it("opens the edit form from calendar entry details", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: calendarEntry.id });
    await render(<CalendarEntryDetailsScreen />);

    expect(await screen.findByText("Szczegóły treningu")).toBeTruthy();
    expect(screen.getByText(calendarEntry.description)).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Edytuj trening" }),
    );

    expect(router.push).toHaveBeenCalledWith("/calendar/new?id=entry-1");
  });

  it("updates an existing calendar entry from its edit form", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: calendarEntry.id });
    await render(<NewCalendarEntryScreen />);

    await screen.findByText("Edytuj trening");
    expect(screen.queryByRole("checkbox", { name: "17:00" })).toBeNull();
    await fireEvent.press(screen.getByRole("radio", { name: "20:00" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany treningu" }),
    );

    expect(updateCalendarEntry).toHaveBeenCalledWith({
      ...calendarEntry,
      hour: 20,
    });
    expect(navigateBack).toHaveBeenCalledWith("/calendar");
  });

  it("shows a clear not-found state for a missing calendar entry", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "missing" });
    jest.mocked(loadCalendarEntries).mockResolvedValueOnce([]);
    await render(<CalendarEntryDetailsScreen />);

    expect(
      await screen.findByText("Nie znaleziono zaplanowanego treningu."),
    ).toBeTruthy();
  });
});

describe("Exercise details", () => {
  beforeEach(() => {
    jest.mocked(useExerciseImagePreference).mockReturnValue({
      showExerciseImages: true,
      loading: false,
      saving: false,
      error: "",
      setShowExerciseImages: jest.fn(),
    });
  });

  it("loads exercise details and saves a personal note", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: exercise.id });
    await render(<ExerciseDetailScreen />);

    expect(await screen.findByText(exercise.name)).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Notatka do ćwiczenia"),
      "Keep shoulders relaxed",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz notatkę do ćwiczenia" }),
    );

    expect(saveExerciseNote).toHaveBeenCalledWith(
      exercise.id,
      "Keep shoulders relaxed",
    );
    expect(await screen.findByText("Notatka aktualna")).toBeTruthy();
  });

  it("hides exercise detail images when image display is disabled", async () => {
    jest.mocked(useExerciseImagePreference).mockReturnValue({
      showExerciseImages: false,
      loading: false,
      saving: false,
      error: "",
      setShowExerciseImages: jest.fn(),
    });

    await render(<ExerciseDetailScreen />);

    expect(screen.queryByTestId("exercise-detail-image")).toBeNull();
  });

  it("saves edits to the exercise catalog", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: exercise.id });
    await render(<ExerciseDetailScreen />);

    await screen.findByText(exercise.name);
    await fireEvent.press(
      screen.getByRole("button", { name: "Edytuj ćwiczenie" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Nazwa ćwiczenia"),
      "Edited exercise",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany ćwiczenia" }),
    );

    expect(mockExerciseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: exercise.id,
        name: "Edited exercise",
      }),
    );
    expect(
      screen.getByRole("button", { name: "Edytuj ćwiczenie" }),
    ).toBeTruthy();
  });

  it("shows an explicit state when the exercise id is unknown", async () => {
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ id: "not-an-exercise" });
    await render(<ExerciseDetailScreen />);

    expect(screen.getByText("Nie znaleziono ćwiczenia.")).toBeTruthy();
  });
});

describe("Deletion confirmation", () => {
  it("asks before deleting a calendar entry", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: calendarEntry.id });
    await render(<CalendarEntryDetailsScreen />);

    await screen.findByText("Szczegóły treningu");
    await fireEvent.press(
      screen.getByRole("button", { name: "Usuń wpis z kalendarza" }),
    );

    expect(alertSpy).toHaveBeenCalledWith(
      "Usunąć wpis z kalendarza?",
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: "Usuń", style: "destructive" }),
      ]),
    );
    alertSpy.mockRestore();
  });
});
