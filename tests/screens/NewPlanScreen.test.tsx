import { mocks, exercise, sequence } from "./testHarness";
import { fireEvent, render, screen } from "@testing-library/react-native";
import NewPlanScreen from "../../app/plan/new";
import NewSequenceScreen from "../../app/sequence/new";

describe("New plan screen", () => {
  it("shows empty state, rejects whitespace-only names, then saves trimmed fields", async () => {
    await render(<NewPlanScreen />);
    expect(
      screen.getByText("Dodaj ćwiczenia, sekwencje lub notatki do planu."),
    ).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Nazwa planu"), "   ");
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz nowy plan" }),
    );
    expect(
      screen.getByText(
        "Uzupełnij nazwę planu i dodaj ćwiczenie, sekwencję lub notatkę.",
      ),
    ).toBeTruthy();
    expect(mocks.savePlan).not.toHaveBeenCalled();

    await fireEvent.changeText(
      screen.getByLabelText("Nazwa planu"),
      "  Morning flow  ",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Opis planu"),
      "  Gentle start  ",
    );
    await fireEvent.press(screen.getByLabelText("Dodaj sekwencję do planu"));
    await fireEvent.press(
      await screen.findByRole("checkbox", {
        name: `Dodaj sekwencję ${sequence.name}`,
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Zamknij" }));
    expect(screen.getByText(sequence.name)).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz nowy plan" }),
    );
    expect(mocks.savePlan).toHaveBeenCalledWith({
      id: "p101",
      name: "Morning flow",
      description: "Gentle start",
      content: [{ type: "sequence", id: sequence.id }],
    });
    expect(mocks.navigateBack).toHaveBeenCalledWith("/");
  });

  it("handles save failures without navigating and allows removing selected content", async () => {
    mocks.savePlan.mockRejectedValueOnce(new Error("Disk unavailable"));
    await render(<NewPlanScreen />);
    await fireEvent.changeText(screen.getByLabelText("Nazwa planu"), "Valid");
    await fireEvent.press(screen.getByLabelText("Dodaj ćwiczenia"));
    await fireEvent.press(
      await screen.findByRole("checkbox", {
        name: `Dodaj ${exercise.name} do planu`,
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Zamknij" }));
    await fireEvent.press(
      screen.getByRole("button", {
        name: `Usuń ćwiczenie ${exercise.name} z planu`,
      }),
    );
    expect(
      screen.getByText("Dodaj ćwiczenia, sekwencje lub notatki do planu."),
    ).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Dodaj ćwiczenia"));
    await fireEvent.press(
      await screen.findByRole("checkbox", {
        name: `Dodaj ${exercise.name} do planu`,
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Zamknij" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz nowy plan" }),
    );
    expect(await screen.findByText("Disk unavailable")).toBeTruthy();
    expect(mocks.navigateBack).not.toHaveBeenCalled();
  });

  it("reports a sequence-list load error while keeping the form usable", async () => {
    mocks.loadSequences.mockRejectedValueOnce("offline");
    await render(<NewPlanScreen />);
    expect(
      await screen.findByText("Nie udało się wczytać sekwencji."),
    ).toBeTruthy();
    expect(screen.getByLabelText("Dodaj sekwencję do planu")).toBeTruthy();
  });

  it("saves a plan containing only an editable note", async () => {
    await render(<NewPlanScreen />);
    await fireEvent.changeText(screen.getByLabelText("Nazwa planu"), "Mindful");
    await fireEvent.press(screen.getByLabelText("Dodaj notatkę do planu"));
    const noteInput = screen.getByLabelText("Treść notatki");
    expect(noteInput.props.placeholder).toBe("Wpisz treść notatki");
    expect(noteInput.props.textAlign).toBe("left");
    expect(noteInput.props.textAlignVertical).toBe("center");
    expect(noteInput.parent?.props.style).toEqual(
      expect.objectContaining({ justifyContent: "center" }),
    );
    await fireEvent.changeText(noteInput, "Oddychać spokojnie");
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz nowy plan" }),
    );

    expect(mocks.savePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Mindful",
        content: [
          expect.objectContaining({
            type: "note",
            text: "Oddychać spokojnie",
          }),
        ],
      }),
    );
  });

  it("removes a note tile from a new plan", async () => {
    await render(<NewPlanScreen />);
    await fireEvent.press(screen.getByLabelText("Dodaj notatkę do planu"));
    await fireEvent.press(
      screen.getByRole("button", { name: "Usuń notatkę z planu" }),
    );
    expect(
      screen.getByText("Dodaj ćwiczenia, sekwencje lub notatki do planu."),
    ).toBeTruthy();
  });

  it.each([
    ["plan", NewPlanScreen, "do planu"],
    ["sekwencję", NewSequenceScreen, "do sekwencji"],
  ] as const)(
    "shows exercise details from the selected tile when creating a %s",
    async (_kind, Screen, ownerLabel) => {
      await render(<Screen />);
      await fireEvent.press(screen.getByLabelText("Dodaj ćwiczenia"));
      await fireEvent.press(
        await screen.findByRole("checkbox", {
          name: `Dodaj ${exercise.name} ${ownerLabel}`,
        }),
      );
      await fireEvent.press(screen.getByRole("button", { name: "Zamknij" }));

      await fireEvent.press(
        screen.getByRole("button", {
          name: `Pokaż informacje o ćwiczeniu ${exercise.name}`,
        }),
      );
      expect(screen.getByTestId("exercise-info-popup")).toBeTruthy();
      expect(screen.getByText(exercise.startingPosition)).toBeTruthy();
    },
  );
});
