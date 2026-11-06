import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import SequencesScreen from "../../../app/(tabs)/sequences";
import { loadSequences } from "../../../constants/sequenceStorage";
import { initialSequences } from "../../fixtures/data";

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    router: { push: jest.fn() },
    useFocusEffect: (cb: () => void | (() => void)) =>
      React.useEffect(cb, [cb]),
  };
});
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("../../../constants/useAppTheme", () => ({
  useAppTheme: () => ({
    colors: {
      background: "white",
      cardBackground: "white",
      border: "gray",
      primary: "blue",
      primaryDark: "blue",
      textPrimary: "black",
      textSecondary: "gray",
      white: "white",
      selectedBackground: "#eee",
      danger: "red",
    },
    globalStyles: {
      container: {},
      listContainer: {},
      card: {},
      selectedCard: {},
    },
    typography: { h2: {}, caption: {} },
  }),
}));
jest.mock("../../../constants/useExercises", () => ({
  useExercises: () => ({
    exercises: jest.requireActual("../../fixtures/data").exercises,
  }),
}));
jest.mock("../../../constants/useFavorites", () => ({
  useFavorites: () => {
    const React = jest.requireActual<typeof import("react")>("react");
    const [ids, setIds] = React.useState<string[]>([]);
    return {
      isFavorite: (_t: string, id: string) => ids.includes(id),
      toggle: async (_t: string, id: string) =>
        setIds((old) =>
          old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
        ),
      error: "",
    };
  },
}));
jest.mock("../../../constants/sequenceStorage", () => ({
  loadSequences: jest.fn(),
}));

const sequences = [
  {
    ...initialSequences[0],
    id: "s-z",
    name: "Zebra Flow",
    description: "Morning",
  },
  {
    ...initialSequences[1],
    id: "s-a",
    name: "Alpha Stretch",
    description: "Evening",
  },
];
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(loadSequences).mockResolvedValue(sequences as never);
});

describe("Sequences tab", () => {
  it("loads sequence cards, displays exercise count and navigates", async () => {
    await render(<SequencesScreen />);
    await fireEvent.press(await screen.findByText("Zebra Flow"));
    expect(router.push).toHaveBeenCalledWith("/sequence/s-z");
    expect(screen.getAllByText("Ćwiczenia: 2").length).toBeGreaterThan(0);
  });

  it("searches title and description and distinguishes empty catalog from no match", async () => {
    await render(<SequencesScreen />);
    await screen.findByText("Zebra Flow");
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj sekwencji"),
      "EVENING",
    );
    expect(screen.getByText("Alpha Stretch")).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj sekwencji"),
      "missing",
    );
    expect(screen.getByText("Nie znaleziono sekwencji.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Szukaj sekwencji"), "");
  });

  it("filters by level, clears the chip and offers creation for an empty catalog", async () => {
    await render(<SequencesScreen />);
    await screen.findByText("Zebra Flow");
    await fireEvent.press(screen.getByLabelText("Filtry"));
    await fireEvent.press(screen.getByRole("radio", { name: "Początkujący" }));
    await fireEvent.press(screen.getByText("Pokaż sekwencje"));
    expect(screen.getByText("Poziom: Początkujący ×")).toBeTruthy();
    await fireEvent.press(screen.getByText("Poziom: Początkujący ×"));
    expect(screen.getByText("Alpha Stretch")).toBeTruthy();
    jest.mocked(loadSequences).mockResolvedValueOnce([]);
    await render(<SequencesScreen />);
    await fireEvent.press(await screen.findByText("Utwórz sekwencję"));
    expect(router.push).toHaveBeenCalledWith("/sequence/new");
  });

  it("shows a loading state while the catalog load is pending", async () => {
    let resolve!: (value: never[]) => void;
    jest.mocked(loadSequences).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }) as never,
    );
    await render(<SequencesScreen />);
    expect(screen.getByText("Wczytywanie sekwencji…")).toBeTruthy();
    resolve([]);
    expect(await screen.findByText("Nie masz jeszcze sekwencji.")).toBeTruthy();
  });

  it("toggles favorite filtering and reports load errors", async () => {
    await render(<SequencesScreen />);
    await screen.findByText("Zebra Flow");
    await fireEvent.press(
      screen.getByLabelText("Dodaj do ulubionych: Zebra Flow"),
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Usuń z ulubionych: Zebra Flow"),
      ).toBeTruthy(),
    );
    const ordered = screen
      .getAllByText(/Zebra Flow|Alpha Stretch/)
      .map((node) => node.props.children);
    expect(ordered).toEqual(["Zebra Flow", "Alpha Stretch"]);
    await fireEvent.press(
      screen.getByLabelText("Usuń z ulubionych: Zebra Flow"),
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Dodaj do ulubionych: Zebra Flow"),
      ).toBeTruthy(),
    );
    expect(
      screen
        .getAllByText(/Zebra Flow|Alpha Stretch/)
        .map((node) => node.props.children),
    ).toEqual(["Alpha Stretch", "Zebra Flow"]);
    await fireEvent.press(
      screen.getByLabelText("Dodaj do ulubionych: Zebra Flow"),
    );
    await fireEvent.press(screen.getByLabelText("Pokaż ulubione sekwencje"));
    expect(screen.getByText("Zebra Flow")).toBeTruthy();
    expect(screen.queryByText("Alpha Stretch")).toBeNull();

    jest.mocked(loadSequences).mockRejectedValueOnce("nope");
    await render(<SequencesScreen />);
    expect(
      await screen.findByText("Nie udało się wczytać sekwencji."),
    ).toBeTruthy();
  });
});
