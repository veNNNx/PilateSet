import { mocks, exercise, secondExercise, plan, sequence } from "./testHarness";
import { Alert } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import SequenceDetailScreen from "../../app/sequence/[id]";

describe("Sequence detail screen", () => {
  it("loads its note, favorites the sequence, expands related plans, and navigates to the plan", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: sequence.id });
    mocks.loadPlans.mockResolvedValueOnce([
      { ...plan, content: [{ type: "sequence", id: sequence.id }] },
    ]);
    mocks.loadSequenceNotes.mockResolvedValueOnce([
      { sequenceId: sequence.id, note: "Breathe" },
    ]);
    await render(<SequenceDetailScreen />);
    expect(await screen.findByText(sequence.name)).toBeTruthy();
    expect(screen.getByDisplayValue("Breathe")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", {
        name: `Dodaj do ulubionych: ${sequence.name}`,
      }),
    );
    expect(mocks.toggleFavorite).toHaveBeenCalledWith("sequence", sequence.id);
    await fireEvent.press(
      screen.getByRole("button", { name: "Edytuj sekwencję" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Anuluj edycję" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: /Dodane do planu/ }),
    );
    expect(screen.getByText(plan.name)).toBeTruthy();
    await fireEvent.press(screen.getByText(plan.name));
    expect(mocks.router.push).toHaveBeenCalledWith(`/plan/${plan.id}`);
  });

  it("edits content and description, displays save errors, and recovers after retry", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: sequence.id });
    mocks.loadSequences.mockResolvedValueOnce([
      { ...sequence, exerciseIds: [exercise.id, secondExercise.id] },
    ]);
    mocks.updateSequence.mockRejectedValueOnce(
      new Error("Sequence cannot be edited"),
    );
    await render(<SequenceDetailScreen />);
    await screen.findByText(sequence.name);
    await fireEvent.press(
      screen.getByRole("button", { name: "Edytuj sekwencję" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Nazwa sekwencji"),
      "Updated flow",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Opis sekwencji"),
      " New description ",
    );
    await fireEvent.press(
      screen.getByRole("button", {
        name: `Usuń ${secondExercise.name} z sekwencji`,
      }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany sekwencji" }),
    );
    expect(await screen.findByText("Sequence cannot be edited")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany sekwencji" }),
    );
    expect(mocks.updateSequence).toHaveBeenLastCalledWith({
      id: sequence.id,
      name: "Updated flow",
      description: "New description",
      exerciseIds: [exercise.id],
    });
    expect(screen.getByText("Updated flow")).toBeTruthy();
  });

  it("saves an empty note as removal and reports note storage errors", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: sequence.id });
    mocks.loadSequenceNotes.mockResolvedValueOnce([
      { sequenceId: sequence.id, note: "Stored" },
    ]);
    await render(<SequenceDetailScreen />);
    await screen.findByText(sequence.name);
    await fireEvent.changeText(
      screen.getByLabelText("Notatka do sekwencji"),
      " ",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz notatkę do sekwencji" }),
    );
    expect(mocks.saveSequenceNote).toHaveBeenCalledWith(sequence.id, " ");
    expect(await screen.findByText("Notatka aktualna")).toBeTruthy();
    mocks.saveSequenceNote.mockRejectedValueOnce(new Error("Cannot store cue"));
    await fireEvent.changeText(
      screen.getByLabelText("Notatka do sekwencji"),
      "new",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz notatkę do sekwencji" }),
    );
    expect(await screen.findByText("Cannot store cue")).toBeTruthy();
  });

  it("shows note-load errors, missing-sequence state, and confirms/cancels deletion", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: sequence.id });
    mocks.loadSequenceNotes.mockRejectedValueOnce(new Error("Notes offline"));
    await render(<SequenceDetailScreen />);
    expect(await screen.findByText("Notes offline")).toBeTruthy();
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    await fireEvent.press(
      screen.getByRole("button", { name: `Usuń sekwencję ${sequence.name}` }),
    );
    const actions = alertSpy.mock.calls.at(-1)?.[2] as {
      onPress?: () => void;
    }[];
    await act(async () => actions[0].onPress?.());
    expect(mocks.deleteSequence).not.toHaveBeenCalled();
    await act(async () => actions[1].onPress?.());
    await waitFor(() =>
      expect(mocks.deleteSequence).toHaveBeenCalledWith(sequence.id),
    );
    expect(mocks.navigateBack).toHaveBeenCalledWith("/sequences");
    alertSpy.mockRestore();

    mocks.useLocalSearchParams.mockReturnValue({ id: "missing" });
    mocks.loadSequences.mockResolvedValueOnce([]);
    await render(<SequenceDetailScreen />);
    expect(await screen.findByText("Nie znaleziono sekwencji.")).toBeTruthy();
  });
});
