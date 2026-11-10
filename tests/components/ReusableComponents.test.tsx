import { fireEvent, render, screen } from "@testing-library/react-native";
import exercises from "../../constants/exercises";
import { ExerciseCard } from "../../components/ExerciseCard";
import { FavoriteIndicator } from "../../components/FavoriteIndicator";
import { PlanContentPicker } from "../../components/PlanContentPicker";
import { SequenceCard } from "../../components/SequenceCard";
import { SequenceContentCard } from "../../components/SequenceContentCard";
import { useExerciseImagePreference } from "../../constants/exerciseImagePreference";

jest.mock("../../constants/exercises", () => ({
  __esModule: true,
  default:
    jest.requireActual<typeof import("../fixtures/data")>("../fixtures/data")
      .exercises,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
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

jest.mock("../../constants/useFavorites", () => ({
  useFavorites: () => ({
    isFavorite: (_type: string, id: string) => id === "1",
    error: "",
  }),
}));

const exercise = exercises[0];
const sequence = {
  id: "s1",
  name: "Core flow",
  description: "A short core sequence",
  load: "",
  exerciseIds: [exercise.id],
};

describe("ExerciseCard", () => {
  beforeEach(() => {
    jest.mocked(useExerciseImagePreference).mockReturnValue({
      showExerciseImages: true,
      loading: false,
      saving: false,
      error: "",
      setShowExerciseImages: jest.fn(),
    });
  });

  it("renders exercise details and opens when pressed", async () => {
    const onPress = jest.fn();
    await render(<ExerciseCard exercise={exercise} onPress={onPress} />);

    fireEvent.press(screen.getByRole("button", { name: exercise.name }));

    expect(screen.getByText("P1")).toBeTruthy();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("exposes selection state when used as a checkbox", async () => {
    await render(
      <ExerciseCard
        exercise={exercise}
        selected
        accessibilityLabel="Select exercise"
      />,
    );

    const card = screen.getByRole("checkbox", { name: "Select exercise" });
    expect(card.props.accessibilityState).toEqual({ checked: true });
  });

  it("omits the exercise image when image display is disabled", async () => {
    jest.mocked(useExerciseImagePreference).mockReturnValue({
      showExerciseImages: false,
      loading: false,
      saving: false,
      error: "",
      setShowExerciseImages: jest.fn(),
    });

    await render(<ExerciseCard exercise={exercise} />);

    expect(screen.queryByTestId("exercise-card-image")).toBeNull();
  });
});

describe("SequenceContentCard", () => {
  it("uses the shared exercise card and forwards exercise navigation", async () => {
    const onExercisePress = jest.fn();
    await render(
      <SequenceContentCard
        sequence={sequence}
        exercises={[exercise]}
        expanded
        onToggle={jest.fn()}
        onExercisePress={onExercisePress}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: exercise.name }));

    expect(screen.getByText("1 ćwiczenie")).toBeTruthy();
    expect(onExercisePress).toHaveBeenCalledWith(exercise);
  });
});

describe("SequenceCard", () => {
  it("shares sequence details and selection behavior across lists", async () => {
    const onPress = jest.fn();
    await render(
      <SequenceCard
        sequence={sequence}
        exercises={[exercise]}
        onPress={onPress}
        accessibilityRole="checkbox"
        accessibilityLabel="Dodaj sekwencję Core flow"
        selected={false}
        countLabel="Ćwiczenia: 1"
      />,
    );

    const card = screen.getByRole("checkbox", {
      name: "Dodaj sekwencję Core flow",
    });
    expect(screen.getByText("A short core sequence")).toBeTruthy();
    expect(screen.getByText("Ćwiczenia: 1")).toBeTruthy();
    expect(card.props.accessibilityState).toEqual({ checked: false });
    fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("FavoriteIndicator", () => {
  it("does not render a marker for a non-favorite item", async () => {
    await render(<FavoriteIndicator favorite={false} label="Hundred" />);

    expect(
      screen.queryByRole("image", { name: "Ulubione: Hundred" }),
    ).toBeNull();
  });

  it("announces the item when it is a favorite", async () => {
    await render(<FavoriteIndicator favorite label="Hundred" />);

    expect(
      screen.getByRole("image", { name: "Ulubione: Hundred" }),
    ).toBeTruthy();
  });
});

describe("PlanContentPicker", () => {
  it("filters exercises by search and reports selection", async () => {
    const onToggle = jest.fn();
    await render(
      <PlanContentPicker
        visible
        type="exercise"
        exercises={[
          exercise,
          { ...exercise, id: "other", name: "Different exercise" },
        ]}
        sequences={[sequence]}
        content={[]}
        onToggle={onToggle}
        onClose={jest.fn()}
      />,
    );

    await fireEvent.changeText(
      screen.getByLabelText("Szukaj ćwiczenia do planu"),
      exercise.name,
    );
    expect(screen.getByText(exercise.name)).toBeTruthy();
    expect(screen.queryByText("Different exercise")).toBeNull();
    expect(screen.getByText("0 wybranych · 1 widocznych")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("checkbox", { name: `Dodaj ${exercise.name} do planu` }),
    );
    expect(onToggle).toHaveBeenCalledWith({
      type: "exercise",
      id: exercise.id,
    });
  });

  it("renders and selects a sequence in sequence mode", async () => {
    const onToggle = jest.fn();
    await render(
      <PlanContentPicker
        visible
        type="sequence"
        exercises={[exercise]}
        sequences={[sequence]}
        content={[]}
        onToggle={onToggle}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(
      screen.getByRole("checkbox", { name: "Dodaj sekwencję Core flow" }),
    );

    expect(onToggle).toHaveBeenCalledWith({ type: "sequence", id: "s1" });
  });
});
