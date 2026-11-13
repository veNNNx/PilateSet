import { mocks, exercise, secondExercise, plan, sequence } from "./testHarness";
import { Alert } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import PlanDetailScreen from "../../app/plan/[id]";
import SequenceDetailScreen from "../../app/sequence/[id]";
import { printPlanPdf as printPlanPdfWeb } from "../../constants/planPdf.web";

describe("Plan detail screen", () => {
  it("keeps the loading state visible until data resolves, then reports a missing plan", async () => {
    let resolvePlans!: (value: (typeof plan)[]) => void;
    mocks.loadPlans.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePlans = resolve;
      }),
    );
    const view = await render(<PlanDetailScreen />);
    expect(screen.getByText("Wczytywanie planu…")).toBeTruthy();
    await act(async () => resolvePlans([]));
    expect(await screen.findByText("Nie znaleziono planu.")).toBeTruthy();
    view.unmount();
  });

  it("handles plan loading errors, browser-safe print escaping, and sparse exercise metadata", async () => {
    mocks.loadPlans.mockRejectedValueOnce("offline");
    await render(<PlanDetailScreen />);
    expect(
      await screen.findByText("Nie udało się wczytać planu."),
    ).toBeTruthy();

    const sparseExercise = {
      ...exercise,
      name: `A & <B> \"quoted\" 'name'`,
      level: "",
      bodyAreas: [],
      position: null,
      startingPosition: "",
      load: "",
      movementSequence: "",
      modifications: "",
    };
    mocks.useExercises.mockReturnValue({
      exercises: [sparseExercise],
      error: "",
      updateExercise: mocks.updateExercise,
    });
    mocks.loadPlans.mockResolvedValueOnce([
      {
        ...plan,
        name: "Escaped",
        content: [
          { type: "exercise", id: exercise.id },
          { type: "exercise", id: "missing" },
        ],
      },
    ]);
    await render(<PlanDetailScreen />);
    await screen.findByText("Escaped");
    await fireEvent.press(screen.getByRole("button", { name: "Drukuj plan" }));
    const html = mocks.printAsync.mock.calls[0][0].html;
    expect(html).toContain(
      "A &amp; &lt;B&gt; &quot;quoted&quot; &#39;name&#39;",
    );
    expect(html).not.toContain('<div class="metadata">');
    expect(html).not.toContain('<div class="details">');
  });

  it("covers plan edit validation, picker add/remove, cancel, and save failure", async () => {
    mocks.updatePlan.mockRejectedValueOnce(new Error("Plan is locked"));
    await render(<PlanDetailScreen />);
    await screen.findByText(plan.name);
    await fireEvent.press(screen.getByRole("button", { name: "Edytuj plan" }));
    await fireEvent.changeText(screen.getByLabelText("Nazwa planu"), "  ");
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany planu" }),
    );
    expect(screen.getByText("Podaj nazwę planu.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Nazwa planu"), "Updated");
    await fireEvent.press(
      screen.getByRole("button", { name: `Usuń ${exercise.name} z planu` }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany planu" }),
    );
    expect(
      screen.getByText(
        "Plan musi zawierać co najmniej jedno ćwiczenie lub sekwencję.",
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText("Ćwiczenie"));
    await fireEvent.press(
      await screen.findByRole("checkbox", {
        name: `Dodaj ${exercise.name} do planu`,
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Zamknij" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany planu" }),
    );
    expect(await screen.findByText("Plan is locked")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Anuluj edycję" }),
    );
    expect(screen.getByText(plan.name)).toBeTruthy();
  });

  it("saves plan changes, toggles favorites, navigates to exercises and handles delete cancel/success", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    await render(<PlanDetailScreen />);
    await screen.findByText(plan.name);
    await fireEvent.press(
      screen.getByRole("button", { name: "Dodaj do ulubionych: Test plan" }),
    );
    expect(mocks.toggleFavorite).toHaveBeenCalledWith("plan", plan.id);
    await fireEvent.press(screen.getByText(exercise.name));
    expect(mocks.router.push).toHaveBeenCalledWith(`/exercise/${exercise.id}`);
    await fireEvent.press(screen.getByRole("button", { name: "Edytuj plan" }));
    await fireEvent.changeText(
      screen.getByLabelText("Nazwa planu"),
      "  Saved  ",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Opis planu"),
      "  New desc  ",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany planu" }),
    );
    expect(mocks.updatePlan).toHaveBeenCalledWith({
      ...plan,
      name: "Saved",
      description: "New desc",
    });

    await fireEvent.press(
      screen.getByRole("button", { name: "Usuń plan Saved" }),
    );
    const actions = alertSpy.mock.calls.at(-1)?.[2] as {
      text: string;
      onPress?: () => void;
    }[];
    expect(actions[0].text).toBe("Anuluj");
    await act(async () => actions[0].onPress?.());
    expect(mocks.deletePlan).not.toHaveBeenCalled();
    await act(async () => actions[1].onPress?.());
    await waitFor(() => expect(mocks.deletePlan).toHaveBeenCalledWith(plan.id));
    expect(mocks.navigateBack).toHaveBeenCalledWith("/");
    alertSpy.mockRestore();
  });

  it("prints composed sequence content and surfaces native print failures", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    mocks.loadPlans.mockResolvedValueOnce([
      {
        ...plan,
        content: [
          { type: "exercise", id: exercise.id },
          { type: "sequence", id: sequence.id },
        ],
      },
    ]);
    mocks.loadSequences.mockResolvedValueOnce([
      { ...sequence, load: "", exerciseIds: [secondExercise.id, "missing"] },
    ]);
    await render(<PlanDetailScreen />);
    await screen.findByText(plan.name);
    await fireEvent.press(screen.getByRole("button", { name: "Drukuj plan" }));
    expect(mocks.printAsync).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining("Test plan") }),
    );
    expect(mocks.printAsync.mock.calls[0][0].html).toContain(
      secondExercise.name,
    );
    expect(mocks.printAsync.mock.calls[0][0].html).toContain(
      "Sekwencja: Test sequence",
    );

    mocks.printAsync.mockRejectedValueOnce(new Error("Printer unavailable"));
    await fireEvent.press(screen.getByRole("button", { name: "Drukuj plan" }));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Nie udało się rozpocząć drukowania",
        "Printer unavailable",
      ),
    );
    alertSpy.mockRestore();
  });

  it("uses the browser PDF download path and reports a failed download", async () => {
    await printPlanPdfWeb({
      name: "Web plan",
      description: "",
      html: "<html></html>",
      items: [],
    });
    expect(mocks.createPdf.mock.results[0].value.download).toHaveBeenCalledWith(
      "web-plan.pdf",
    );
    mocks.createPdf.mockReturnValueOnce({
      download: jest.fn().mockRejectedValue(new Error("Download failed")),
    });
    await expect(
      printPlanPdfWeb({
        name: "Web plan",
        description: "",
        html: "<html></html>",
        items: [],
      }),
    ).rejects.toThrow("Download failed");
  });

  it("shows a sequence detail, expands related plans and nested exercises, and saves then removes an empty note", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: sequence.id });
    mocks.loadPlans.mockResolvedValueOnce([
      { ...plan, content: [{ type: "sequence", id: sequence.id }] },
    ]);
    mocks.loadSequences.mockResolvedValueOnce([
      { ...sequence, exerciseIds: [exercise.id, secondExercise.id] },
    ]);
    mocks.loadSequenceNotes.mockResolvedValueOnce([
      { sequenceId: sequence.id, note: "Existing cue" },
    ]);
    await render(<SequenceDetailScreen />);
    expect(await screen.findByText(sequence.name)).toBeTruthy();
    expect(screen.getByDisplayValue("Existing cue")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: /Dodane do planu/ }),
    );
    expect(screen.getByText(plan.name)).toBeTruthy();
    await fireEvent.press(screen.getByText(plan.name));
    expect(mocks.router.push).toHaveBeenCalledWith(`/plan/${plan.id}`);
    await fireEvent.changeText(
      screen.getByLabelText("Notatka do sekwencji"),
      "   ",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz notatkę do sekwencji" }),
    );
    expect(mocks.saveSequenceNote).toHaveBeenCalledWith(sequence.id, "   ");
    expect(await screen.findByText("Notatka aktualna")).toBeTruthy();
  });

  it("expands and collapses the sequence included in a plan", async () => {
    mocks.loadPlans.mockResolvedValueOnce([
      { ...plan, content: [{ type: "sequence", id: sequence.id }] },
    ]);
    mocks.loadSequences.mockResolvedValueOnce([
      { ...sequence, exerciseIds: [secondExercise.id] },
    ]);
    await render(<PlanDetailScreen />);
    await screen.findByText(plan.name);
    await fireEvent.press(
      screen.getByRole("button", { name: `Rozwiń sekwencję ${sequence.name}` }),
    );
    expect(screen.getByText(secondExercise.name)).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: `Zwiń sekwencję ${sequence.name}` }),
    );
    expect(screen.queryByText(secondExercise.name)).toBeNull();
  });

  it("shows sequence note loading/save errors and validates sequence edits", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: sequence.id });
    mocks.loadSequenceNotes.mockRejectedValueOnce(
      new Error("Notes unavailable"),
    );
    mocks.updateSequence.mockRejectedValueOnce(
      new Error("Sequence write failed"),
    );
    await render(<SequenceDetailScreen />);
    expect(await screen.findByText("Notes unavailable")).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Notatka do sekwencji"),
      "new cue",
    );
    mocks.saveSequenceNote.mockRejectedValueOnce(
      new Error("Note write failed"),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz notatkę do sekwencji" }),
    );
    expect(await screen.findByText("Note write failed")).toBeTruthy();

    await fireEvent.press(
      screen.getByRole("button", { name: "Edytuj sekwencję" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: `Usuń ${exercise.name} z sekwencji` }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany sekwencji" }),
    );
    expect(
      screen.getByText("Sekwencja musi zawierać co najmniej jedno ćwiczenie."),
    ).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Anuluj edycję" }),
    );
    expect(screen.getByText(sequence.name)).toBeTruthy();
  });

  it("does not navigate when plan deletion fails", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    mocks.deletePlan.mockRejectedValueOnce(new Error("Delete unavailable"));
    await render(<PlanDetailScreen />);
    await screen.findByText(plan.name);
    await fireEvent.press(
      screen.getByRole("button", { name: `Usuń plan ${plan.name}` }),
    );
    const actions = alertSpy.mock.calls.at(-1)?.[2] as {
      onPress?: () => void;
    }[];
    await act(async () => actions[1].onPress?.());
    await waitFor(() => expect(mocks.deletePlan).toHaveBeenCalledWith(plan.id));
    expect(mocks.navigateBack).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("confirms sequence deletion and routes to the sequence list after success", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    mocks.useLocalSearchParams.mockReturnValue({ id: sequence.id });
    await render(<SequenceDetailScreen />);
    await screen.findByText(sequence.name);
    await fireEvent.press(
      screen.getByRole("button", { name: `Usuń sekwencję ${sequence.name}` }),
    );
    const actions = alertSpy.mock.calls.at(-1)?.[2] as {
      onPress?: () => void;
    }[];
    await act(async () => actions[1].onPress?.());
    await waitFor(() =>
      expect(mocks.deleteSequence).toHaveBeenCalledWith(sequence.id),
    );
    expect(mocks.navigateBack).toHaveBeenCalledWith("/sequences");
    alertSpy.mockRestore();
  });
});
