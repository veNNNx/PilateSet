import { mocks, exercise } from "./testHarness";
import { fireEvent, render, screen } from "@testing-library/react-native";
import NewSequenceScreen from "../../app/sequence/new";

describe("New sequence screen", () => {
  it("requires a name and exercise, then saves a trimmed sequence to its own route", async () => {
    await render(<NewSequenceScreen />);
    expect(screen.getByText("Dodaj ćwiczenia do sekwencji.")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz nową sekwencję" }),
    );
    expect(
      screen.getByText(
        "Uzupełnij nazwę sekwencji i wybierz co najmniej jedno ćwiczenie.",
      ),
    ).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Nazwa sekwencji"),
      "  Steady flow  ",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Opis sekwencji"),
      "  Slow and calm  ",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Obciążenie sekwencji"),
      "  Cz-CzCz  ",
    );
    await fireEvent.press(screen.getByLabelText("Dodaj ćwiczenia"));
    await fireEvent.press(
      await screen.findByRole("checkbox", {
        name: `Dodaj ${exercise.name} do sekwencji`,
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Zamknij" }));
    expect(screen.queryByLabelText("Dodaj sekwencję do planu")).toBeNull();
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz nową sekwencję" }),
    );
    expect(mocks.saveSequence).toHaveBeenCalledWith({
      id: "s101",
      name: "Steady flow",
      description: "Slow and calm",
      load: "Cz-CzCz",
      exerciseIds: [exercise.id],
    });
    expect(mocks.navigateBack).toHaveBeenCalledWith("/sequences");
  });

  it("shows save errors and keeps the selected exercise available for retry", async () => {
    mocks.saveSequence.mockRejectedValueOnce(
      new Error("Sequence write failed"),
    );
    await render(<NewSequenceScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Nazwa sekwencji"),
      "Retry me",
    );
    await fireEvent.press(screen.getByLabelText("Dodaj ćwiczenia"));
    await fireEvent.press(
      await screen.findByRole("checkbox", {
        name: `Dodaj ${exercise.name} do sekwencji`,
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Zamknij" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz nową sekwencję" }),
    );
    expect(await screen.findByText("Sequence write failed")).toBeTruthy();
    expect(screen.getByText(exercise.name)).toBeTruthy();
    expect(mocks.navigateBack).not.toHaveBeenCalled();
  });
});
