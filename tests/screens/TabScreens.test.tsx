import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { loadCalendarEntries } from "../../constants/calendarStorage";
import { loadExerciseNotes } from "../../constants/exerciseNotesStorage";
import { loadFavorites } from "../../constants/favoritesStorage";
import { exportJson } from "../../constants/jsonExport";
import { loadPlans } from "../../constants/planStorage";
import { loadSequenceNotes } from "../../constants/sequenceNotesStorage";
import { loadSequences } from "../../constants/sequenceStorage";
import exercises from "../../constants/exercises";
import PlansScreen from "../../app/(tabs)/index";
import SequencesScreen from "../../app/(tabs)/sequences";
import ExercisesScreen from "../../app/(tabs)/exercises";
import CalendarScreen from "../../app/(tabs)/calendar";
import InfoScreen from "../../app/(tabs)/info";

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
    useLocalSearchParams: () => ({ id: "entry-1" }),
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("../../constants/exerciseImages", () => ({
  getExerciseImage: () => 1,
}));

jest.mock("../../constants/exerciseImagePreference", () => ({
  useExerciseImagePreference: () => ({
    showExerciseImages: true,
    loading: false,
    saving: false,
    error: "",
    setShowExerciseImages: jest.fn(),
  }),
}));

jest.mock("../../constants/useFavorites", () => ({
  useFavorites: () => ({
    isFavorite: () => false,
    toggle: jest.fn(),
    error: "",
  }),
}));

jest.mock("../../constants/useExercises", () => ({
  useExercises: () => ({
    exercises: jest.requireMock<any>("../../constants/exercises").default,
  }),
}));

jest.mock("../../constants/planStorage", () => ({
  loadPlans: jest.fn(),
}));

jest.mock("../../constants/sequenceStorage", () => ({
  loadSequences: jest.fn(),
}));

jest.mock("../../constants/calendarStorage", () => ({
  loadCalendarEntries: jest.fn(),
}));

jest.mock("../../constants/favoritesStorage", () => ({
  loadFavorites: jest.fn(),
}));

jest.mock("../../constants/exerciseNotesStorage", () => ({
  loadExerciseNotes: jest.fn(),
}));

jest.mock("../../constants/sequenceNotesStorage", () => ({
  loadSequenceNotes: jest.fn(),
}));

jest.mock("../../constants/jsonExport", () => ({
  exportJson: jest.fn(),
}));

jest.mock("../../constants/jsonImport", () => ({
  importJsonBackup: jest.fn(),
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

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(loadPlans).mockResolvedValue([plan]);
  jest.mocked(loadSequences).mockResolvedValue([sequence]);
  jest.mocked(loadCalendarEntries).mockResolvedValue([calendarEntry]);
  jest.mocked(loadFavorites).mockResolvedValue([]);
  jest.mocked(loadExerciseNotes).mockResolvedValue([]);
  jest.mocked(loadSequenceNotes).mockResolvedValue([]);
  jest.mocked(exportJson).mockResolvedValue(undefined);
});

describe("Plans screen", () => {
  it("loads plans, filters by name, and navigates to plan details", async () => {
    await render(<PlansScreen />);

    await fireEvent.press(await screen.findByText(plan.name));
    expect(router.push).toHaveBeenCalledWith(`/plan/${plan.id}`);

    await fireEvent.changeText(
      screen.getByLabelText("Szukaj planu"),
      "no matching plan",
    );
    expect(await screen.findByText("Nie znaleziono planów.")).toBeTruthy();
  });

  it("shows a loading failure instead of an empty successful list", async () => {
    jest
      .mocked(loadPlans)
      .mockRejectedValueOnce(new Error("Plans unavailable"));
    jest.mocked(loadSequences).mockResolvedValueOnce([]);

    await render(<PlansScreen />);

    expect(await screen.findByText("Plans unavailable")).toBeTruthy();
  });
});

describe("Sequences screen", () => {
  it("shows sequences and opens sequence details", async () => {
    await render(<SequencesScreen />);

    await fireEvent.press(await screen.findByText(sequence.name));

    expect(router.push).toHaveBeenCalledWith(`/sequence/${sequence.id}`);
    expect(screen.getByText("Ćwiczenia: 1")).toBeTruthy();
  });

  it("offers creation from the empty state", async () => {
    jest.mocked(loadSequences).mockResolvedValueOnce([]);

    await render(<SequencesScreen />);

    await fireEvent.press(await screen.findByText("Utwórz sekwencję"));

    expect(router.push).toHaveBeenCalledWith("/sequence/new");
  });
});

describe("Exercises screen", () => {
  it("searches and opens the matching exercise", async () => {
    await render(<ExercisesScreen />);

    await screen.findByText(exercise.name);
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj ćwiczenia"),
      "no matching exercise",
    );

    expect(await screen.findByText("Brak pasujących ćwiczeń")).toBeTruthy();
  });

  it("opens the filter sheet and applies a difficulty filter", async () => {
    await render(<ExercisesScreen />);

    await fireEvent.press(screen.getByLabelText("Filtry"));
    expect(
      screen.getByText("Dopasuj ćwiczenia do swojego treningu"),
    ).toBeTruthy();
  });

  it("opens a matching exercise detail screen", async () => {
    await render(<ExercisesScreen />);

    await fireEvent.press(
      await screen.findByRole("button", { name: exercise.name }),
    );

    expect(router.push).toHaveBeenCalledWith(`/exercise/${exercise.id}`);
  });
});

describe("Calendar screen", () => {
  it("groups upcoming sessions and navigates to a selected session", async () => {
    await render(<CalendarScreen />);

    const entryButton = await screen.findByRole("button", {
      name: `${plan.name}, ${calendarEntry.date}, godzina 18:00`,
    });
    await fireEvent.press(entryButton);

    expect(router.push).toHaveBeenCalledWith("/calendar/entry-1");
  });

  it("shows a create-session action when the calendar is empty", async () => {
    jest.mocked(loadCalendarEntries).mockResolvedValueOnce([]);

    await render(<CalendarScreen />);

    await fireEvent.press(await screen.findByText("Dodaj pierwszy trening"));

    expect(router.push).toHaveBeenCalledWith("/calendar/new");
  });
});

describe("Information screen", () => {
  it("offers a switch for exercise image visibility", async () => {
    await render(<InfoScreen />);

    expect(
      screen.getByRole("switch", { name: "Pokazuj zdjęcia ćwiczeń" }).props
        .value,
    ).toBe(true);
  });

  it("expands the release history", async () => {
    await render(<InfoScreen />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Rozwiń historię zmian" }),
    );

    expect(
      screen.getByText(
        "Dodano grupowanie treningów w kalendarzu i poziom trudności planów.",
      ),
    ).toBeTruthy();
  });

  it("exports the current data and reports success", async () => {
    await render(<InfoScreen />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Pobierz wszystkie dane JSON" }),
    );

    expect(
      await screen.findByText("Eksport danych został przygotowany."),
    ).toBeTruthy();
    expect(exportJson).toHaveBeenCalledWith(
      "pilateset-wszystkie-dane.json",
      expect.objectContaining({
        formatVersion: 1,
        "plans.json": [plan],
        "sequences.json": [sequence],
        "calendar.json": [calendarEntry],
      }),
    );
  });

  it("offers to load a JSON backup", async () => {
    await render(<InfoScreen />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Załaduj dane z pliku JSON" }),
    );

    expect(screen.getByText("Załadować kopię zapasową?")).toBeTruthy();
    expect(screen.getByText("Wybierz plik")).toBeTruthy();
  });
});
