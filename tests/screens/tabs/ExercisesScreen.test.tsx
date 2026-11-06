import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import ExercisesScreen from "../../../app/(tabs)/exercises";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
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
      cardImage: {},
      cardInfo: {},
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
jest.mock("../../../constants/exerciseImagePreference", () => ({
  useExerciseImagePreference: () => ({ showExerciseImages: true }),
}));
jest.mock("../../../constants/exerciseImages", () => ({
  getExerciseImage: () => 1,
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

describe("Exercises tab", () => {
  it("searches names, body areas and positions, and opens an exercise", async () => {
    await render(<ExercisesScreen />);
    expect(await screen.findByText("Alpha Press")).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj ćwiczenia"),
      "PLECY",
    );
    expect(screen.getByText("Bravo Rotation")).toBeTruthy();
    expect(screen.getByText("Alpha Press")).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj ćwiczenia"),
      "side-lying",
    );
    expect(screen.getByText("Bravo Rotation")).toBeTruthy();
    expect(screen.queryByText("Alpha Press")).toBeNull();
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj ćwiczenia"),
      "no result",
    );
    expect(screen.getByText("Brak pasujących ćwiczeń")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Szukaj ćwiczenia"), "");
    await fireEvent.press(screen.getByRole("button", { name: "Alpha Press" }));
    expect(router.push).toHaveBeenCalledWith("/exercise/1");
  });

  it("applies level, body-area and position filters and can clear individual chips", async () => {
    await render(<ExercisesScreen />);
    await fireEvent.press(screen.getByLabelText("Filtry"));
    await fireEvent.press(screen.getByRole("radio", { name: "Początkujący" }));
    await fireEvent.press(screen.getByText("Supine (plecy)"));
    await fireEvent.press(screen.getByText("nogi"));
    await fireEvent.press(screen.getByText("Pokaż 1 ćwiczenie"));
    expect(screen.getByText("Alpha Press")).toBeTruthy();
    expect(screen.queryByText("Bravo Rotation")).toBeNull();
    await fireEvent.press(screen.getByLabelText("Usuń filtr kategorii nogi"));
    expect(screen.queryByLabelText("Usuń filtr kategorii nogi")).toBeNull();
    await fireEvent.press(
      screen.getByLabelText("Usuń filtr poziomu Początkujący"),
    );
    await fireEvent.press(
      screen.getByLabelText("Usuń filtr pozycji Supine (plecy)"),
    );
    expect(screen.getByText("Charlie Reach")).toBeTruthy();
  });

  it("clears draft filters, dismisses the sheet, and reports empty results", async () => {
    await render(<ExercisesScreen />);
    await fireEvent.press(screen.getByLabelText("Filtry"));
    await fireEvent.press(screen.getByRole("radio", { name: "Zaawansowany" }));
    await fireEvent.press(screen.getByText("Wyczyść"));
    await fireEvent.press(screen.getByText("Pokaż 4 ćwiczenia"));
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj ćwiczenia"),
      "zzzzz",
    );
    expect(screen.getByText("Brak pasujących ćwiczeń")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Filtry"));
    await fireEvent.press(screen.getByLabelText("Zamknij filtry"));
    expect(
      screen.queryByText("Dopasuj ćwiczenia do swojego treningu"),
    ).toBeNull();
  });

  it("toggles a favorite and filters the list to favorites", async () => {
    await render(<ExercisesScreen />);
    await screen.findByText("Alpha Press");
    await fireEvent.press(
      screen.getByLabelText("Dodaj do ulubionych: Charlie Reach"),
    );
    expect(
      screen.getByLabelText("Usuń z ulubionych: Charlie Reach"),
    ).toBeTruthy();
    const ordered = screen
      .getAllByText(/Alpha Press|Charlie Reach/)
      .map((node) => node.props.children);
    expect(ordered[0]).toBe("Charlie Reach");
    await fireEvent.press(
      screen.getByLabelText("Usuń z ulubionych: Charlie Reach"),
    );
    expect(
      screen.getByLabelText("Dodaj do ulubionych: Charlie Reach"),
    ).toBeTruthy();
    await fireEvent.press(
      screen.getByLabelText("Dodaj do ulubionych: Charlie Reach"),
    );
    await fireEvent.press(screen.getByLabelText("Pokaż ulubione ćwiczenia"));
    expect(screen.getByText("Charlie Reach")).toBeTruthy();
    expect(screen.queryByText("Bravo Rotation")).toBeNull();
  });
});
