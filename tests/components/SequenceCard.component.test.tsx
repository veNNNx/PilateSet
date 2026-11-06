import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { getColors } from "../../constants/colors";
import exercises from "../../constants/exercises";
import { SequenceCard } from "../../components/SequenceCard";
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

const sequence = {
  id: "s1",
  name: "Core Flow",
  description: "A short flow",
  exerciseIds: ["1", "3"],
};

beforeEach(() => setTestTheme(false));

describe("SequenceCard", () => {
  it("renders levels derived from exercises, description, count and forwards press", async () => {
    const onPress = jest.fn();
    await render(
      <SequenceCard
        sequence={sequence}
        exercises={exercises}
        onPress={onPress}
        countLabel="2 moves"
      />,
    );
    expect(screen.getByText("Core Flow")).toBeTruthy();
    expect(screen.getByText("Początkujący · Zaawansowany")).toBeTruthy();
    expect(screen.getByText("A short flow")).toBeTruthy();
    expect(screen.getByText("2 moves")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Core Flow" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("exposes custom checkbox selection and accessibility label", async () => {
    await render(
      <SequenceCard
        sequence={sequence}
        exercises={exercises}
        onPress={jest.fn()}
        accessibilityRole="checkbox"
        accessibilityLabel="Pick flow"
        selected
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: "Pick flow" }).props
        .accessibilityState,
    ).toEqual({ checked: true });
  });

  it("handles empty levels and fallback description with a custom button role", async () => {
    const emptySequence = {
      ...sequence,
      description: "",
      exerciseIds: ["unknown"],
    };
    await render(
      <SequenceCard
        sequence={emptySequence}
        exercises={[]}
        onPress={jest.fn()}
        descriptionFallback="No details"
      />,
    );
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText("No details")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Core Flow" })).toBeTruthy();
  });

  it("renders optional trailing content and uses dark theme styles", async () => {
    setTestTheme(true);
    await render(
      <SequenceCard
        sequence={sequence}
        exercises={exercises}
        onPress={jest.fn()}
        trailing={<Text>Actions</Text>}
        style={{ marginTop: 12 }}
      />,
    );
    expect(screen.getByText("Actions")).toBeTruthy();
    expect(screen.getByText("Core Flow").props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: getColors(true).textPrimary }),
      ]),
    );
  });
});
