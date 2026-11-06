import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { getColors } from "../../constants/colors";
import exercises from "../../constants/exercises";
import { getExerciseImage } from "../../constants/exerciseImages";
import { ExerciseCard } from "../../components/ExerciseCard";
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
jest.mock("../../constants/exerciseImagePreference", () => ({
  useExerciseImagePreference: jest.fn(() => ({
    showExerciseImages: true,
    loading: false,
    saving: false,
    error: "",
    setShowExerciseImages: jest.fn(),
  })),
}));

const imagePreference = jest.requireMock<any>(
  "../../constants/exerciseImagePreference",
).useExerciseImagePreference as jest.Mock;
const exercise = exercises[0];

beforeEach(() => {
  setTestTheme(false);
  imagePreference.mockReturnValue({ showExerciseImages: true });
});

describe("ExerciseCard", () => {
  it("renders all exercise metadata and uses its first image", async () => {
    await render(<ExerciseCard exercise={exercise} />);

    expect(screen.getByText(exercise.name)).toBeTruthy();
    expect(screen.getByText(exercise.sets)).toBeTruthy();
    expect(screen.getByText(exercise.level)).toBeTruthy();
    expect(screen.getByText("Pozycja: Supine (plecy)")).toBeTruthy();
    expect(screen.getByText("nogi · mięśnie brzucha")).toBeTruthy();
    expect(screen.getByTestId("exercise-card-image").props.source).toEqual(
      getExerciseImage(exercise.id, exercise.images[0]),
    );
    expect(screen.getByRole("button", { name: exercise.name })).toBeTruthy();
  });

  it("forwards press and long-press events, custom accessibility and opacity", async () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    await render(
      <ExerciseCard
        exercise={exercise}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel="Pick this exercise"
        activeOpacity={0.4}
      />,
    );
    const button = screen.getByRole("button", { name: "Pick this exercise" });
    const event = { nativeEvent: { pageX: 2 } };
    await fireEvent.press(button);
    await fireEvent(button, "longPress", event);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledWith(event);
  });

  it.each([true, false])(
    "exposes checked state %s when selection is explicit",
    async (selected) => {
      await render(<ExerciseCard exercise={exercise} selected={selected} />);
      expect(
        screen.getByRole("checkbox", { name: exercise.name }).props
          .accessibilityState,
      ).toEqual({ checked: selected });
    },
  );

  it("omits checkbox state when selection is unspecified and renders trailing content", async () => {
    await render(
      <ExerciseCard exercise={exercise} trailing={<Text>More actions</Text>} />,
    );
    const button = screen.getByRole("button", { name: exercise.name });
    expect(button.props.accessibilityState.checked).toBeUndefined();
    expect(screen.getByText("More actions")).toBeTruthy();
  });

  it("hides images when preference is disabled", async () => {
    imagePreference.mockReturnValue({ showExerciseImages: false });
    await render(<ExerciseCard exercise={exercise} />);
    expect(screen.queryByTestId("exercise-card-image")).toBeNull();
  });

  it("uses the placeholder for an exercise without images", async () => {
    const imageLess = exercises.find((item) => item.id === "4")!;
    await render(<ExerciseCard exercise={imageLess} />);
    expect(screen.getByTestId("exercise-card-image").props.source).toEqual({
      uri: "https://via.placeholder.com/150",
    });
    expect(screen.queryByText("Dowolna")).toBeNull();
  });

  it("uses dark theme colors for dark cards", async () => {
    setTestTheme(true);
    await render(<ExerciseCard exercise={exercise} />);
    const position = screen.getByText("Pozycja: Supine (plecy)");
    expect(JSON.stringify(position.props.style)).toContain(
      getColors(true).textSecondary,
    );
  });
});
