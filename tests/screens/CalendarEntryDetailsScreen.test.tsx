import {
  mocks,
  exercise,
  secondExercise,
  plan,
  sequence,
  calendarEntry,
} from "./testHarness";
import { Alert } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import CalendarEntryDetailsScreen from "../../app/calendar/[id]";

describe("Calendar entry details screen", () => {
  it("renders plan contents and links, expands a sequence, and encodes the edit route", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: calendarEntry.id });
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
      { ...sequence, exerciseIds: [secondExercise.id] },
    ]);
    await render(<CalendarEntryDetailsScreen />);
    expect(await screen.findByText("Szczegóły treningu")).toBeTruthy();
    expect(screen.getByText("Evening session")).toBeTruthy();
    expect(screen.getByText("Test plan")).toBeTruthy();
    expect(screen.getByText(exercise.name)).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: `Rozwiń sekwencję ${sequence.name}` }),
    );
    expect(screen.getByText(secondExercise.name)).toBeTruthy();
    await fireEvent.press(screen.getByRole("link", { name: "Zobacz plan" }));
    expect(mocks.router.push).toHaveBeenCalledWith(`/plan/${plan.id}`);
    await fireEvent.press(
      screen.getByRole("button", { name: "Edytuj trening" }),
    );
    expect(mocks.router.push).toHaveBeenCalledWith("/calendar/new?id=entry-1");
  });

  it("shows the loading message while calendar entries are unresolved", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: calendarEntry.id });
    let resolveEntries!: (entries: (typeof calendarEntry)[]) => void;
    mocks.loadCalendarEntries.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveEntries = resolve;
      }),
    );
    await render(<CalendarEntryDetailsScreen />);
    expect(screen.getByText("Wczytywanie treningu…")).toBeTruthy();
    await act(async () => resolveEntries([calendarEntry]));
    expect(await screen.findByText("Evening session")).toBeTruthy();
  });

  it("renders empty-description and missing-plan fallback states", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: calendarEntry.id });
    mocks.loadCalendarEntries.mockResolvedValueOnce([
      { ...calendarEntry, description: "" },
    ]);
    mocks.loadPlans.mockResolvedValueOnce([]);
    await render(<CalendarEntryDetailsScreen />);
    expect(await screen.findByText("Brak opisu")).toBeTruthy();
    expect(screen.queryByText(/Poziom:/)).toBeNull();
  });

  it("handles entry-load and related-plan load failures", async () => {
    mocks.loadCalendarEntries.mockRejectedValueOnce(
      new Error("Calendar unavailable"),
    );
    await render(<CalendarEntryDetailsScreen />);
    expect(await screen.findByText("Calendar unavailable")).toBeTruthy();

    mocks.useLocalSearchParams.mockReturnValue({ id: calendarEntry.id });
    mocks.loadCalendarEntries.mockResolvedValueOnce([calendarEntry]);
    mocks.loadPlans.mockRejectedValueOnce(new Error("Plan index unavailable"));
    await render(<CalendarEntryDetailsScreen />);
    expect(await screen.findByText("Plan index unavailable")).toBeTruthy();
  });

  it("confirms deletion, supports cancel, deletes on confirmation, and reports deletion errors", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: calendarEntry.id });
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    await render(<CalendarEntryDetailsScreen />);
    await screen.findByText("Szczegóły treningu");
    await fireEvent.press(
      screen.getByRole("button", { name: "Usuń wpis z kalendarza" }),
    );
    const actions = alertSpy.mock.calls.at(-1)?.[2] as {
      text: string;
      onPress?: () => void;
    }[];
    await act(async () => actions[0].onPress?.());
    expect(mocks.deleteCalendarEntry).not.toHaveBeenCalled();
    await act(async () => actions[1].onPress?.());
    await waitFor(() =>
      expect(mocks.deleteCalendarEntry).toHaveBeenCalledWith(calendarEntry.id),
    );
    expect(mocks.navigateBack).toHaveBeenCalledWith("/calendar");

    mocks.deleteCalendarEntry.mockRejectedValueOnce(
      new Error("Delete rejected"),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Usuń wpis z kalendarza" }),
    );
    const retryActions = alertSpy.mock.calls.at(-1)?.[2] as {
      onPress?: () => void;
    }[];
    await act(async () => retryActions[1].onPress?.());
    await waitFor(() =>
      expect(mocks.deleteCalendarEntry).toHaveBeenCalledTimes(2),
    );
    expect(mocks.navigateBack).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });
});
