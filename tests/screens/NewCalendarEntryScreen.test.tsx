import { mocks, plan, calendarEntry } from "./testHarness";
import { Platform } from "react-native";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import NewCalendarEntryScreen from "../../app/calendar/new";

describe("New calendar entry screen", () => {
  afterEach(() => jest.useRealTimers());
  it("sets the date through the mocked native picker and dismisses without changing it", async () => {
    mocks.useLocalSearchParams.mockReturnValue({});
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 15, 12));
    await render(<NewCalendarEntryScreen />);
    const dateButton = screen.getByRole("button", { name: "Wybierz datę" });
    const originalDate = screen.getByText("15.01.2026").props.children;
    await fireEvent.press(dateButton);
    await fireEvent.press(
      screen.getByRole("button", { name: "Mock set date" }),
    );
    expect(screen.getByText("03.02.2026")).toBeTruthy();
    await fireEvent.press(dateButton);
    await fireEvent.press(
      screen.getByRole("button", { name: "Mock dismiss date" }),
    );
    expect(screen.getByText("03.02.2026")).toBeTruthy();
    expect(originalDate).toBeTruthy();
  });

  it("validates selection, filters plans, de-duplicates selected hours, and saves a fixed-date batch", async () => {
    mocks.useLocalSearchParams.mockReturnValue({});
    jest.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    const otherPlan = {
      ...plan,
      id: "p200",
      name: "Another plan",
      description: "Pilates for back",
      content: [{ type: "exercise" as const, id: "2" }],
    };
    mocks.loadPlans.mockResolvedValueOnce([plan, otherPlan]);
    mocks.favorites.add(otherPlan.id);
    await render(<NewCalendarEntryScreen />);
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz trening" }),
    );
    expect(screen.getByText("Wybierz godzinę i plan treningowy.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("checkbox", { name: "18:00" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "18:00" }));
    expect(
      screen.getByRole("checkbox", { name: "18:00" }).props.accessibilityState
        .checked,
    ).toBe(false);
    await fireEvent.press(screen.getByRole("checkbox", { name: "18:00" }));
    await fireEvent.changeText(
      screen.getByLabelText("Szukaj planu"),
      "unknown",
    );
    expect(screen.queryByRole("radio", { name: /Test plan/ })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Szukaj planu"), "");
    await fireEvent.press(
      screen.getByRole("checkbox", { name: "Pokaż ulubione plany" }),
    );
    expect(screen.getByRole("radio", { name: /Another plan/ })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: /Test plan/ })).toBeNull();
    await fireEvent.press(
      screen.getByRole("checkbox", { name: "Pokaż wszystkie plany" }),
    );
    await fireEvent.press(screen.getByRole("radio", { name: /Test plan/ }));
    await fireEvent.changeText(
      screen.getByLabelText("Opis treningu"),
      "  evening  ",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz trening" }),
    );
    await waitFor(() => expect(mocks.saveCalendarEntries).toHaveBeenCalled());
    const [saved] = mocks.saveCalendarEntries.mock.calls[0];
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      hour: 18,
      planId: plan.id,
      description: "evening",
    });
    expect(saved[0].id).toBeTruthy();
    expect(mocks.navigateBack).toHaveBeenCalledWith("/calendar");
    jest.restoreAllMocks();
  });

  it("validates browser date input and creates entries for independently selected hours", async () => {
    mocks.useLocalSearchParams.mockReturnValue({});
    const replaceOs = jest.replaceProperty(Platform, "OS", "web");
    await render(<NewCalendarEntryScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Data, dzień miesiąc rok"),
      "31.02.2026",
    );
    await fireEvent.press(screen.getByRole("checkbox", { name: "16:00" }));
    await fireEvent.press(screen.getByRole("radio", { name: /Test plan/ }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz trening" }),
    );
    expect(
      screen.getByText("Wpisz prawidłową datę w formacie DD.MM.RRRR."),
    ).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Data, dzień miesiąc rok"),
      "03.02.2026",
    );
    await fireEvent.press(screen.getByRole("checkbox", { name: "17:00" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz trening" }),
    );
    expect(mocks.saveCalendarEntries).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ date: "2026-02-03", hour: 16 }),
        expect.objectContaining({ date: "2026-02-03", hour: 17 }),
      ]),
    );
    replaceOs.restore();
  });

  it("loads an existing entry in single-hour edit mode and handles update errors", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: calendarEntry.id });
    mocks.updateCalendarEntry.mockRejectedValueOnce(
      new Error("Calendar is read-only"),
    );
    await render(<NewCalendarEntryScreen />);
    expect(await screen.findByText("Edytuj trening")).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "17:00" })).toBeNull();
    await fireEvent.press(screen.getByRole("radio", { name: "20:00" }));
    await fireEvent.changeText(
      screen.getByLabelText("Opis treningu"),
      " updated ",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Zapisz zmiany treningu" }),
    );
    expect(await screen.findByText("Calendar is read-only")).toBeTruthy();
    expect(mocks.navigateBack).not.toHaveBeenCalled();
  });

  it("shows a loading failure from plan and sequence storage", async () => {
    mocks.useLocalSearchParams.mockReturnValue({});
    mocks.loadPlans.mockRejectedValueOnce(new Error("Plan list unavailable"));
    await render(<NewCalendarEntryScreen />);
    expect(await screen.findByText("Plan list unavailable")).toBeTruthy();
  });

  it("shows missing-entry and loading-error states", async () => {
    mocks.useLocalSearchParams.mockReturnValue({ id: "missing" });
    mocks.loadCalendarEntries.mockResolvedValueOnce([]);
    await render(<NewCalendarEntryScreen />);
    expect(
      await screen.findByText("Nie znaleziono zaplanowanego treningu."),
    ).toBeTruthy();
  });
});
