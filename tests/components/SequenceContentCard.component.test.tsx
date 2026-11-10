import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { getColors } from "../../constants/colors";
import exercises from "../../constants/exercises";
import { SequenceContentCard } from "../../components/SequenceContentCard";
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
jest.mock("../../constants/exerciseImagePreference", () => ({
  useExerciseImagePreference: () => ({ showExerciseImages: false }),
}));

const sequence = {
  id: "seq-1",
  name: "Morning Flow",
  description: "Flow",
  load: "",
  exerciseIds: ["1", "missing", "2"],
};

beforeEach(() => setTestTheme(false));

describe("SequenceContentCard", () => {
  it("shows mapped exercise levels in the top-right of the sequence header", async () => {
    await render(
      <SequenceContentCard
        sequence={sequence}
        exercises={exercises}
        expanded={false}
        onToggle={jest.fn()}
      />,
    );

    expect(screen.getByText("P1 · P2")).toBeTruthy();
  });

  it("shows the load next to the title only when it is set", async () => {
    const { rerender } = await render(
      <SequenceContentCard
        sequence={{ ...sequence, load: "Cz-CzCz" }}
        exercises={exercises}
        expanded={false}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByLabelText("Obciążenie: Cz-CzCz")).toBeTruthy();
    expect(screen.getByText("Cz-CzCz")).toBeTruthy();
    await rerender(
      <SequenceContentCard
        sequence={sequence}
        exercises={exercises}
        expanded={false}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText(/Obciążenie:/)).toBeNull();
  });

  it("toggles collapsed/expanded state, forwards long press, and reports exercise navigation", async () => {
    const onToggle = jest.fn();
    const onHeaderLongPress = jest.fn();
    const onExercisePress = jest.fn();
    const { rerender } = await render(
      <SequenceContentCard
        sequence={sequence}
        exercises={exercises}
        expanded={false}
        onToggle={onToggle}
        onHeaderLongPress={onHeaderLongPress}
        onExercisePress={onExercisePress}
      />,
    );
    const collapsed = screen.getByRole("button", {
      name: "Rozwiń sekwencję Morning Flow",
    });
    expect(collapsed.props.accessibilityState).toEqual({ expanded: false });
    await fireEvent.press(collapsed);
    const longPressEvent = { nativeEvent: { pageY: 3 } };
    await fireEvent(collapsed, "longPress", longPressEvent);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onHeaderLongPress).toHaveBeenCalledWith(longPressEvent);
    expect(screen.queryByText("1 ćwiczenie")).toBeNull();

    await rerender(
      <SequenceContentCard
        sequence={sequence}
        exercises={exercises}
        expanded
        onToggle={onToggle}
        onExercisePress={onExercisePress}
      />,
    );
    expect(screen.getByText("2 ćwiczenia")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Zwiń sekwencję Morning Flow" }).props
        .accessibilityState,
    ).toEqual({ expanded: true });
    await fireEvent.press(screen.getByRole("button", { name: "Alpha Press" }));
    expect(onExercisePress).toHaveBeenCalledWith(exercises[0]);
    expect(screen.getByRole("button", { name: "Bravo Rotation" })).toBeTruthy();
  });

  it("supports custom header label, active style, explicit trailing content and custom style", async () => {
    await render(
      <SequenceContentCard
        sequence={sequence}
        exercises={exercises}
        expanded={false}
        onToggle={jest.fn()}
        headerAccessibilityLabel="Custom header"
        active
        style={{ marginTop: 10 }}
        trailing={<Text>Menu</Text>}
        onSequencePress={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Custom header" })).toBeTruthy();
    expect(screen.getByText("Menu")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Otwórz sekwencję Morning Flow" }),
    ).toBeNull();
  });

  it("uses the built-in sequence action when trailing content is absent", async () => {
    const onSequencePress = jest.fn();
    await render(
      <SequenceContentCard
        sequence={sequence}
        exercises={exercises}
        expanded={false}
        onToggle={jest.fn()}
        onSequencePress={onSequencePress}
      />,
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Otwórz sekwencję Morning Flow" }),
    );
    expect(onSequencePress).toHaveBeenCalledTimes(1);
  });

  it("renders the empty preview when all sequence exercise references are missing", async () => {
    await render(
      <SequenceContentCard
        sequence={{ ...sequence, exerciseIds: ["gone"] }}
        exercises={[]}
        expanded
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByText("Brak dostępnych ćwiczeń.")).toBeTruthy();
  });

  it("renders expanded exercises without an optional press handler", async () => {
    await render(
      <SequenceContentCard
        sequence={sequence}
        exercises={exercises}
        expanded
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Alpha Press" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bravo Rotation" })).toBeTruthy();
  });

  it("uses dark colors for active sequence cards", async () => {
    setTestTheme(true);
    const { toJSON } = await render(
      <SequenceContentCard
        sequence={sequence}
        exercises={exercises}
        expanded={false}
        onToggle={jest.fn()}
        active
      />,
    );
    expect(JSON.stringify(toJSON())).toContain(getColors(true).primary);
  });
});
