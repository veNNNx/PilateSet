import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import PlansScreen from "../../../app/(tabs)/index";
import { loadPlans } from "../../../constants/planStorage";
import { loadSequences } from "../../../constants/sequenceStorage";
import { initialPlans, initialSequences } from "../../fixtures/data";

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
    globalStyles: { container: {}, listContainer: {} },
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
      isFavorite: (_type: string, id: string) => ids.includes(id),
      toggle: async (_type: string, id: string) =>
        setIds((old) =>
          old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
        ),
      error: "",
    };
  },
}));
jest.mock("../../../constants/planStorage", () => ({ loadPlans: jest.fn() }));
jest.mock("../../../constants/sequenceStorage", () => ({
  loadSequences: jest.fn(),
}));

const plans = [
  {
    ...initialPlans[0],
    id: "p-a",
    name: "Zebra Pilates",
    description: "Beginner mobility",
  },
  {
    ...initialPlans[1],
    id: "p-b",
    name: "Alpha Core",
    description: "Advanced balance",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(loadPlans).mockResolvedValue(plans as never);
  jest.mocked(loadSequences).mockResolvedValue(initialSequences as never);
});

describe("Plans tab", () => {
  it("loads plans, displays their metadata and navigates to details", async () => {
    await render(<PlansScreen />);
    expect(await screen.findByText("Zebra Pilates")).toBeTruthy();
    expect(screen.getByText("Ćwiczenia: 2")).toBeTruthy();
    await fireEvent.press(screen.getByText("Zebra Pilates"));
    expect(router.push).toHaveBeenCalledWith("/plan/p-a");
  });

  it("searches both plan names and descriptions and shows the no-match state", async () => {
    await render(<PlansScreen />);
    await screen.findByText("Zebra Pilates");
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj planu"),
      "MOBILITY",
    );
    expect(screen.getByText("Zebra Pilates")).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj planu"),
      "does not exist",
    );
    expect(screen.getByText("Nie znaleziono planów.")).toBeTruthy();
  });

  it("applies and clears the level filter and supports draft clear and dismiss", async () => {
    await render(<PlansScreen />);
    await screen.findByText("Zebra Pilates");
    await fireEvent.press(screen.getByLabelText("Filtry"));
    expect(screen.getByText("Filtry planów")).toBeTruthy();
    await fireEvent.press(screen.getByText("Początkujący"));
    await fireEvent.press(screen.getByText("Pokaż plany"));
    expect(screen.getByText("Poziom: Początkujący ×")).toBeTruthy();
    expect(screen.queryByText("Alpha Core")).toBeNull();
    await fireEvent.press(screen.getByText("Poziom: Początkujący ×"));
    expect(screen.getByText("Alpha Core")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Filtry"));
    await fireEvent.press(screen.getByText("Początkujący"));
    await fireEvent.press(screen.getByText("Wyczyść"));
    await fireEvent.press(screen.getByText("Pokaż plany"));
    expect(screen.queryByText(/Poziom:/)).toBeNull();
    await fireEvent.press(screen.getByLabelText("Filtry"));
    await fireEvent.press(screen.getByLabelText("Zamknij filtry"));
    expect(screen.queryByText("Filtry planów")).toBeNull();
  });

  it("toggles favorites, filters to favorites and sorts favorites ahead alphabetically", async () => {
    await render(<PlansScreen />);
    await screen.findByText("Zebra Pilates");
    await fireEvent.press(
      screen.getByLabelText("Dodaj do ulubionych: Zebra Pilates"),
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Usuń z ulubionych: Zebra Pilates"),
      ).toBeTruthy(),
    );
    const ordered = screen
      .getAllByText(/Zebra Pilates|Alpha Core/)
      .map((node) => node.props.children);
    expect(ordered).toEqual(["Zebra Pilates", "Alpha Core"]);
    await fireEvent.press(
      screen.getByLabelText("Usuń z ulubionych: Zebra Pilates"),
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Dodaj do ulubionych: Zebra Pilates"),
      ).toBeTruthy(),
    );
    expect(
      screen
        .getAllByText(/Zebra Pilates|Alpha Core/)
        .map((node) => node.props.children),
    ).toEqual(["Alpha Core", "Zebra Pilates"]);
    await fireEvent.press(
      screen.getByLabelText("Dodaj do ulubionych: Zebra Pilates"),
    );
    await fireEvent.press(screen.getByLabelText("Pokaż ulubione plany"));
    expect(screen.getByText("Zebra Pilates")).toBeTruthy();
    expect(screen.queryByText("Alpha Core")).toBeNull();
  });

  it("shows loading, handles rejected loads, and resolves to an empty list", async () => {
    let resolve!: (v: never[]) => void;
    jest.mocked(loadPlans).mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }) as never,
    );
    await render(<PlansScreen />);
    expect(screen.getByText("Wczytywanie planów…")).toBeTruthy();
    resolve([]);
    expect(await screen.findByText("Nie znaleziono planów.")).toBeTruthy();

    jest.mocked(loadPlans).mockRejectedValueOnce(new Error("plans offline"));
    jest.mocked(loadSequences).mockResolvedValueOnce([] as never);
    await render(<PlansScreen />);
    expect(await screen.findByText("plans offline")).toBeTruthy();
  });
});
