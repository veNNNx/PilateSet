import { beforeEach, jest } from "@jest/globals";

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
  return {
    router,
    useFocusEffect: (callback: () => void | (() => void)) =>
      React.useEffect(callback, [callback]),
    useLocalSearchParams: jest.fn(() => ({ id: "p100" })),
    useRouter: () => router,
  };
});
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("@react-native-community/datetimepicker", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text, TouchableOpacity, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: (props: {
      onChange: (event: { type: string }, date?: Date) => void;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(
          TouchableOpacity,
          {
            accessibilityRole: "button",
            accessibilityLabel: "Mock set date",
            onPress: () =>
              props.onChange({ type: "set" }, new Date(2026, 1, 3)),
          },
          React.createElement(Text, null, "Set mocked date"),
        ),
        React.createElement(
          TouchableOpacity,
          {
            accessibilityRole: "button",
            accessibilityLabel: "Mock dismiss date",
            onPress: () => props.onChange({ type: "dismissed" }),
          },
          React.createElement(Text, null, "Dismiss mocked date"),
        ),
      ),
  };
});
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
jest.mock("../../constants/exercises", () => ({
  __esModule: true,
  default:
    jest.requireActual<typeof import("../fixtures/data")>("../fixtures/data")
      .exercises,
}));
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
  const favorites = new Set<string>();
  const toggle = jest.fn(async (_kind: string, id: string) => {
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
  });
  const isFavorite = jest.fn((_kind: string, id: string) => favorites.has(id));
  return {
    useFavorites: jest.fn(() => ({ isFavorite, toggle, error: "" })),
    __favorites: favorites,
    __toggle: toggle,
    __isFavorite: isFavorite,
  };
});
jest.mock("../../constants/useExercises", () => {
  const updateExercise = jest.fn();
  return {
    useExercises: jest.fn(() => ({
      exercises: jest.requireMock<any>("../../constants/exercises").default,
      error: "",
      updateExercise,
    })),
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
jest.mock("../../constants/navigation", () => ({ navigateBack: jest.fn() }));
jest.mock("../../constants/jsonFileStorage", () => ({
  getJsonFileLocation: () => "pamięć urządzenia",
}));
jest.mock("expo-print", () => ({
  printAsync: jest.fn(async () => undefined),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));
jest.mock("pdfmake", () => ({
  addVirtualFileSystem: jest.fn(),
  createPdf: jest.fn(() => ({
    download: jest.fn(async () => undefined),
  })),
}));
jest.mock("pdfmake/build/vfs_fonts", () => ({}));

const { useLocalSearchParams, router } = jest.requireMock<any>("expo-router");
const { getNextPlanId, loadPlans, savePlan, updatePlan, deletePlan } =
  jest.requireMock<any>("../../constants/planStorage");
const {
  getNextSequenceId,
  loadSequences,
  saveSequence,
  updateSequence,
  deleteSequence,
} = jest.requireMock<any>("../../constants/sequenceStorage");
const {
  loadCalendarEntries,
  saveCalendarEntries,
  saveCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
} = jest.requireMock<any>("../../constants/calendarStorage");
const { loadExerciseNotes, saveExerciseNote } = jest.requireMock<any>(
  "../../constants/exerciseNotesStorage",
);
const { loadSequenceNotes, saveSequenceNote } = jest.requireMock<any>(
  "../../constants/sequenceNotesStorage",
);
const { navigateBack } = jest.requireMock<any>("../../constants/navigation");
const exercises = jest.requireMock<any>("../../constants/exercises").default;

export const exercise = exercises[0];
export const secondExercise = exercises[1];
export const plan = {
  id: "p100",
  name: "Test plan",
  description: "A focused session",
  content: [{ type: "exercise" as const, id: exercise.id }],
};
export const sequence = {
  id: "s100",
  name: "Test sequence",
  description: "A short flow",
  exerciseIds: [exercise.id],
};
export const calendarEntry = {
  id: "entry-1",
  date: "2099-12-31",
  hour: 18,
  planId: plan.id,
  planName: plan.name,
  description: "Evening session",
};

export const mocks = {
  useLocalSearchParams,
  router,
  loadPlans,
  loadSequences,
  loadCalendarEntries,
  saveCalendarEntries,
  saveCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
  getNextPlanId,
  savePlan,
  updatePlan,
  deletePlan,
  getNextSequenceId,
  saveSequence,
  updateSequence,
  deleteSequence,
  loadExerciseNotes,
  saveExerciseNote,
  loadSequenceNotes,
  saveSequenceNote,
  navigateBack,
  get useExercises() {
    return jest.requireMock<any>("../../constants/useExercises")
      .useExercises as jest.Mock<(...args: any[]) => any>;
  },
  get updateExercise() {
    return jest.requireMock<any>("../../constants/useExercises")
      .__updateExercise;
  },
  get favorites() {
    return jest.requireMock<any>("../../constants/useFavorites")
      .__favorites as Set<string>;
  },
  get toggleFavorite() {
    return jest.requireMock<any>("../../constants/useFavorites")
      .__toggle as jest.Mock<(...args: any[]) => any>;
  },
  get printAsync() {
    return jest.requireMock<any>("expo-print").printAsync as jest.Mock<
      (...args: any[]) => any
    >;
  },
  get createPdf() {
    return jest.requireMock<any>("pdfmake").createPdf as jest.Mock<
      (...args: any[]) => any
    >;
  },
  get sharing() {
    return jest.requireMock<any>("expo-sharing") as {
      isAvailableAsync: jest.Mock;
      shareAsync: jest.Mock;
    };
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getNextPlanId).mockResolvedValue("p101");
  jest.mocked(loadPlans).mockResolvedValue([plan]);
  jest.mocked(savePlan).mockResolvedValue(undefined);
  jest.mocked(updatePlan).mockResolvedValue(undefined);
  jest.mocked(deletePlan).mockResolvedValue(undefined);
  jest.mocked(getNextSequenceId).mockResolvedValue("s101");
  jest.mocked(loadSequences).mockResolvedValue([sequence]);
  jest.mocked(saveSequence).mockResolvedValue(undefined);
  jest.mocked(updateSequence).mockResolvedValue(undefined);
  jest.mocked(deleteSequence).mockResolvedValue(undefined);
  jest.mocked(loadCalendarEntries).mockResolvedValue([calendarEntry]);
  jest.mocked(saveCalendarEntries).mockResolvedValue(undefined);
  jest.mocked(saveCalendarEntry).mockResolvedValue(undefined);
  jest.mocked(updateCalendarEntry).mockResolvedValue(undefined);
  jest.mocked(deleteCalendarEntry).mockResolvedValue(undefined);
  jest.mocked(loadExerciseNotes).mockResolvedValue([]);
  jest.mocked(saveExerciseNote).mockResolvedValue(undefined);
  jest.mocked(loadSequenceNotes).mockResolvedValue([]);
  jest.mocked(saveSequenceNote).mockResolvedValue(undefined);
  mocks.useLocalSearchParams.mockReturnValue({ id: plan.id });
  mocks.favorites.clear();
  mocks.updateExercise.mockResolvedValue(undefined);
  mocks.useExercises.mockReturnValue({
    exercises: jest.requireMock<any>("../../constants/exercises").default,
    error: "",
    updateExercise: mocks.updateExercise,
  });
});
