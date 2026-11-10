import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import { getColors } from "../../constants/colors";
import exercises from "../../constants/exercises";
import { PlanContentPicker } from "../../components/PlanContentPicker";
import { setTestTheme } from "./testTheme";

jest.mock("../../constants/useAppTheme", () =>
  jest.requireActual("./testTheme"),
);
jest.mock("../../constants/exercises", () => ({
  __esModule: true,
  default:
    jest.requireActual<typeof import("../fixtures/data")>("../fixtures/data")
      .exercises,
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("react-native/Libraries/Modal/Modal", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const Native =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: ({
      visible,
      onRequestClose,
      children,
    }: {
      visible: boolean;
      onRequestClose: () => void;
      children: React.ReactNode;
    }) =>
      visible
        ? React.createElement(
            Native.View,
            null,
            children,
            React.createElement(Native.Pressable, {
              accessibilityRole: "button",
              accessibilityLabel: "Request native modal close",
              onPress: onRequestClose,
            }),
          )
        : null,
  };
});
jest.mock("../../constants/exerciseImagePreference", () => ({
  useExerciseImagePreference: () => ({ showExerciseImages: false }),
}));
jest.mock("../../constants/useFavorites", () => ({
  useFavorites: jest.fn(() => ({ isFavorite: () => false, error: "" })),
}));

const useFavoritesMock = jest.requireMock<any>("../../constants/useFavorites")
  .useFavorites as jest.Mock;
const sequences = [
  {
    id: "s1",
    name: "Warm Flow",
    description: "Easy flow",
    load: "",
    exerciseIds: ["1", "4"],
  },
  {
    id: "s2",
    name: "Power Flow",
    description: "Strong flow",
    load: "",
    exerciseIds: ["2", "3"],
  },
  {
    id: "s3",
    name: "Quiet Flow",
    description: "Slow flow",
    load: "",
    exerciseIds: ["4"],
  },
];
const emptyContent: { type: "exercise" | "sequence"; id: string }[] = [];

beforeEach(async () => {
  await cleanup();
  setTestTheme(false);
  useFavoritesMock.mockReturnValue({ isFavorite: () => false, error: "" });
});

const renderPicker = async (
  props: Partial<React.ComponentProps<typeof PlanContentPicker>> = {},
) =>
  await render(
    <PlanContentPicker
      visible
      type="exercise"
      exercises={exercises}
      sequences={sequences}
      content={emptyContent}
      onToggle={jest.fn()}
      onClose={jest.fn()}
      {...props}
    />,
  );

describe("PlanContentPicker", () => {
  it("searches exercise name, body area, and position and reports additions", async () => {
    const onToggle = jest.fn();
    await renderPicker({ onToggle });
    expect(screen.getByText("Dodaj ćwiczenia")).toBeTruthy();
    expect(
      screen.getByLabelText("Szukaj ćwiczenia do planu").props.placeholder,
    ).toBe("Szukaj po nazwie lub partii");
    expect(screen.getByText("0 wybranych · 4 widocznych")).toBeTruthy();

    await fireEvent.changeText(
      screen.getByLabelText("Szukaj ćwiczenia do planu"),
      "  ALPHA  ",
    );
    expect(screen.getByText("Alpha Press")).toBeTruthy();
    expect(screen.queryByText("Bravo Rotation")).toBeNull();
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj ćwiczenia do planu"),
      "plecy",
    );
    expect(screen.getByText("Bravo Rotation")).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj ćwiczenia do planu"),
      "standing",
    );
    expect(screen.getByText("Charlie Reach")).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj ćwiczenia do planu"),
      "",
    );
    await fireEvent.press(
      screen.getByRole("checkbox", { name: "Dodaj Alpha Press do planu" }),
    );
    expect(onToggle).toHaveBeenCalledWith({ type: "exercise", id: "1" });
  });

  it("filters exercises by level and position, and toggles each filter off", async () => {
    await renderPicker();
    await fireEvent.press(screen.getByRole("radio", { name: "Zaawansowany" }));
    expect(screen.getByText("Charlie Reach")).toBeTruthy();
    expect(screen.queryByText("Alpha Press")).toBeNull();
    await fireEvent.press(screen.getByRole("radio", { name: "Zaawansowany" }));

    await fireEvent.press(screen.getByRole("radio", { name: "Standing" }));
    expect(screen.getByText("Charlie Reach")).toBeTruthy();
    expect(screen.queryByText("Bravo Rotation")).toBeNull();
    await fireEvent.press(screen.getByRole("radio", { name: "Standing" }));
    expect(screen.getByText("Bravo Rotation")).toBeTruthy();
  });

  it.each(["plan", "sequence"] as const)(
    "omits body-area filters when adding exercises to a %s and keeps areas in the list",
    async (owner) => {
      await renderPicker({ owner });
      expect(screen.queryByText("Partia ciała")).toBeNull();
      expect(screen.queryByRole("radio", { name: "nogi" })).toBeNull();
      expect(screen.getByText("nogi · mięśnie brzucha")).toBeTruthy();
      expect(screen.getAllByText("Light spring").length).toBeGreaterThan(0);
    },
  );

  it("still searches exercises by body area", async () => {
    await renderPicker();
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj ćwiczenia do planu"),
      "klatka piersiowa",
    );
    expect(screen.getByText("Charlie Reach")).toBeTruthy();
    expect(screen.queryByText("Alpha Press")).toBeNull();
  });

  it("shows favorites including selected items and keeps selected items ordered first", async () => {
    useFavoritesMock.mockReturnValue({
      isFavorite: (_type: string, id: string) => id === "3",
      error: "",
    });
    await renderPicker({
      content: [
        { type: "exercise", id: "2" },
        { type: "exercise", id: "1" },
      ],
    });
    const favoritesAreOn = Boolean(
      screen.queryByRole("checkbox", { name: "Pokaż wszystkie" }),
    );
    if (!favoritesAreOn)
      await fireEvent.press(
        screen.getByRole("checkbox", { name: "Pokaż ulubione" }),
      );
    expect(screen.getByText("Charlie Reach")).toBeTruthy();
    expect(screen.getByText("Bravo Rotation")).toBeTruthy();
    expect(screen.getByText("Alpha Press")).toBeTruthy();
    expect(screen.queryByText("Delta Bridge")).toBeNull();
    const exerciseLabels = screen
      .getAllByRole("checkbox")
      .map((item) => item.props.accessibilityLabel);
    expect(exerciseLabels.indexOf("Usuń Bravo Rotation z planu")).toBeLessThan(
      exerciseLabels.indexOf("Usuń Alpha Press z planu"),
    );
    expect(
      screen.getByRole("checkbox", { name: "Usuń Alpha Press z planu" }).props
        .accessibilityState,
    ).toEqual({ checked: true });
    await fireEvent.press(
      screen.getByRole("checkbox", { name: "Pokaż wszystkie" }),
    );
    expect(
      screen.getByRole("checkbox", { name: "Pokaż ulubione" }).props
        .accessibilityState,
    ).toEqual({ checked: false });
    expect(screen.getByText("Delta Bridge")).toBeTruthy();
  });

  it("supports sequence mode, filters sequence names and levels, and toggles selection", async () => {
    const onToggle = jest.fn();
    await renderPicker({
      type: "sequence",
      onToggle,
      content: [{ type: "sequence", id: "s2" }],
      owner: "sequence",
    });
    expect(screen.getByText("Dodaj sekwencje")).toBeTruthy();
    expect(
      screen.getByLabelText("Szukaj sekwencji do sekwencji").props.placeholder,
    ).toBe("Szukaj sekwencji po nazwie");
    expect(screen.queryByText("Pozycja")).toBeNull();
    expect(screen.queryByText("Partia ciała")).toBeNull();
    expect(
      screen.getByRole("checkbox", { name: "Usuń sekwencję Power Flow" }).props
        .accessibilityState,
    ).toEqual({ checked: true });
    await fireEvent.press(
      screen.getByRole("checkbox", { name: "Dodaj sekwencję Warm Flow" }),
    );
    expect(onToggle).toHaveBeenCalledWith({ type: "sequence", id: "s1" });
    await fireEvent.press(screen.getByRole("radio", { name: "Zaawansowany" }));
    expect(screen.getByText("Power Flow")).toBeTruthy();
    expect(screen.queryByText("Warm Flow")).toBeNull();
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj sekwencji do sekwencji"),
      "quiet",
    );
    expect(
      screen.getByText("Brak sekwencji spełniających filtry."),
    ).toBeTruthy();
  });

  it("shows favorites and selected sequences in content order", async () => {
    useFavoritesMock.mockReturnValue({
      isFavorite: (_type: string, id: string) => id === "s3",
      error: "",
    });
    await renderPicker({
      type: "sequence",
      content: [
        { type: "sequence", id: "s2" },
        { type: "sequence", id: "s1" },
      ],
    });
    const favoritesAreOn = Boolean(
      screen.queryByRole("checkbox", { name: "Pokaż wszystkie" }),
    );
    if (!favoritesAreOn)
      await fireEvent.press(
        screen.getByRole("checkbox", { name: "Pokaż ulubione" }),
      );
    expect(screen.getByText("Quiet Flow")).toBeTruthy();
    expect(screen.getByText("Power Flow")).toBeTruthy();
    expect(screen.getByText("Warm Flow")).toBeTruthy();
    const sequenceLabels = screen
      .getAllByRole("checkbox")
      .map((item) => item.props.accessibilityLabel);
    expect(sequenceLabels.indexOf("Usuń sekwencję Power Flow")).toBeLessThan(
      sequenceLabels.indexOf("Usuń sekwencję Warm Flow"),
    );
  });

  it("covers no-data and no-filter-match empty states and favorites errors", async () => {
    useFavoritesMock.mockReturnValue({
      isFavorite: () => false,
      error: "Favorites unavailable",
    });
    await renderPicker({ exercises: [] });
    expect(screen.getByText("Favorites unavailable")).toBeTruthy();
    expect(screen.getByText("Nie masz jeszcze ćwiczeń.")).toBeTruthy();
  });

  it("closes from the header, backdrop, and native modal request; stays hidden when not visible", async () => {
    const onClose = jest.fn();
    const { rerender } = await renderPicker({ onClose });
    await fireEvent.press(screen.getByRole("button", { name: "Zamknij" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Zamknij wybór" }),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
    await fireEvent.press(
      screen.getByRole("button", { name: "Request native modal close" }),
    );
    expect(onClose).toHaveBeenCalledTimes(3);
    await rerender(
      <PlanContentPicker
        visible={false}
        type="exercise"
        exercises={exercises}
        sequences={sequences}
        content={emptyContent}
        onToggle={jest.fn()}
        onClose={onClose}
      />,
    );
    expect(screen.queryByText("Dodaj ćwiczenia")).toBeNull();
  });

  it("shows the sequence no-data empty state and dark picker colors", async () => {
    setTestTheme(true);
    await renderPicker({ type: "sequence", sequences: [] });
    expect(screen.getByText("Nie masz jeszcze sekwencji.")).toBeTruthy();
    expect(
      JSON.stringify(
        screen.getByText("Dodaj sekwencje").parent?.parent?.parent?.props.style,
      ),
    ).toContain(getColors(true).background);
  });
});
