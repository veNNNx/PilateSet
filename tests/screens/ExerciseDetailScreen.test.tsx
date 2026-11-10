import { mocks, exercise, plan, sequence } from "./testHarness";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import ExerciseDetailScreen from "../../app/exercise/[id]";

describe("Exercise detail screen", () => {
  it("loads related plans/sequences, favorites, image, and expands/collapses both relationships", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: exercise.id });
    mocks.loadPlans.mockResolvedValueOnce([
      { ...plan, content: [{ type: "exercise", id: exercise.id }] },
    ]);
    mocks.loadSequences.mockResolvedValueOnce([
      { ...sequence, exerciseIds: [exercise.id] },
    ]);
    await render(<ExerciseDetailScreen />);
    expect(await screen.findByText(exercise.name)).toBeTruthy();
    expect(
      screen.getAllByTestId("exercise-detail-image").length,
    ).toBeGreaterThan(0);
    await fireEvent.press(
      screen.getByRole("button", {
        name: `Dodaj do ulubionych: ${exercise.name}`,
      }),
    );
    expect(mocks.toggleFavorite).toHaveBeenCalledWith("exercise", exercise.id);
    await fireEvent.press(screen.getByText("Dodane do planu (1)"));
    expect(screen.getByText(plan.name)).toBeTruthy();
    await fireEvent.press(screen.getByText(plan.name));
    expect(mocks.router.push).toHaveBeenCalledWith(`/plan/${plan.id}`);
    await fireEvent.press(screen.getByText("Dodane do planu (1)"));
    expect(screen.queryByText(plan.name)).toBeNull();
    await fireEvent.press(screen.getByText("Dodane do sekwencji (1)"));
    await fireEvent.press(screen.getByText(sequence.name));
    expect(mocks.router.push).toHaveBeenCalledWith(`/sequence/${sequence.id}`);
  });

  it("loads an existing note, removes it by saving an empty value, and handles note write failures", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: exercise.id });
    mocks.loadExerciseNotes.mockResolvedValueOnce([
      { exerciseId: exercise.id, note: "Existing cue" },
    ]);
    await render(<ExerciseDetailScreen />);
    expect(await screen.findByDisplayValue("Existing cue")).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Notatka do ćwiczenia"),
      "   ",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz notatkę do ćwiczenia" }),
    );
    expect(mocks.saveExerciseNote).toHaveBeenCalledWith(exercise.id, "   ");
    expect(await screen.findByText("Notatka aktualna")).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Notatka do ćwiczenia"),
      "retry",
    );
    mocks.saveExerciseNote.mockRejectedValueOnce(
      new Error("Note storage offline"),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz notatkę do ćwiczenia" }),
    );
    expect(await screen.findByText("Note storage offline")).toBeTruthy();
  });

  it("validates the exercise editor, cancels edits, then persists normalized catalog fields", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: exercise.id });
    await render(<ExerciseDetailScreen />);
    await fireEvent.press(
      screen.getByRole("button", { name: "Edytuj ćwiczenie" }),
    );
    await fireEvent.changeText(screen.getByLabelText("Nazwa ćwiczenia"), "  ");
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany ćwiczenia" }),
    );
    expect(
      screen.getByText("Nazwa ćwiczenia nie może być pusta."),
    ).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Nazwa ćwiczenia"),
      "  Edited press  ",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Pozycja wejściowa"),
      "  Start  ",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Obciążenie"),
      "  Heavy  ",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Sekwencja ruchu"),
      "  Move  ",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Modyfikacje"),
      "  Easier  ",
    );
    await fireEvent.press(screen.getByText("Zaawansowany"));
    await fireEvent.press(screen.getByText("Brak"));
    await fireEvent.press(screen.getByText("klatka piersiowa"));
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany ćwiczenia" }),
    );
    await waitFor(() =>
      expect(mocks.updateExercise).toHaveBeenCalledWith(
        expect.objectContaining({
          id: exercise.id,
          name: "Edited press",
          load: "Heavy",
          startingPosition: "Start",
          movementSequence: "Move",
          modifications: "Easier",
          position: null,
        }),
      ),
    );
    expect(
      screen.getByRole("button", { name: "Edytuj ćwiczenie" }),
    ).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Edytuj ćwiczenie" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Nazwa ćwiczenia"),
      "discard",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Anuluj edycję ćwiczenia" }),
    );
    expect(screen.getByText(exercise.name)).toBeTruthy();
  });

  it("renders errors from note/catalog loading and catalog save attempts", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: exercise.id });
    mocks.loadExerciseNotes.mockRejectedValueOnce(
      new Error("Note read failed"),
    );
    mocks.loadPlans.mockRejectedValueOnce(new Error("Plans read failed"));
    mocks.updateExercise.mockRejectedValueOnce(
      new Error("Catalog is read-only"),
    );
    await render(<ExerciseDetailScreen />);
    expect(await screen.findByText("Note read failed")).toBeTruthy();
    expect(await screen.findByText("Plans read failed")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Edytuj ćwiczenie" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Nazwa ćwiczenia"),
      "Will fail",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany ćwiczenia" }),
    );
    expect(await screen.findByText("Catalog is read-only")).toBeTruthy();
  });

  it("renders the missing-exercise state without attempting persistence", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: "unknown" });
    await render(<ExerciseDetailScreen />);
    expect(screen.getByText("Nie znaleziono ćwiczenia.")).toBeTruthy();
    expect(mocks.saveExerciseNote).not.toHaveBeenCalled();
  });
});
