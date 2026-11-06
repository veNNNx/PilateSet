import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import CalendarScreen from "../../../app/(tabs)/calendar";
import { loadCalendarEntries } from "../../../constants/calendarStorage";

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    router: { push: jest.fn() },
    useFocusEffect: (cb: () => void | (() => void)) =>
      React.useEffect(cb, [cb]),
  };
});
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("../../../constants/useAppTheme", () => ({
  useAppTheme: () => ({
    colors: {
      background: "white",
      cardBackground: "white",
      border: "gray",
      primary: "blue",
      primaryDark: "blue",
      textPrimary: "black",
      textSecondary: "gray",
      selectedBackground: "#eee",
      danger: "red",
    },
    globalStyles: { container: {} },
  }),
}));
jest.mock("../../../constants/calendarStorage", () => ({
  loadCalendarEntries: jest.fn(),
}));

const entry = (id: string, date: string, hour: number, planName: string) => ({
  id,
  date,
  hour,
  planId: id,
  planName,
  description: "",
});
const entries = [
  entry("past-late", "2026-11-05", 18, "Past late"),
  entry("future-late", "2026-11-08", 18, "Future late"),
  entry("today-late", "2026-11-06", 18, "Today late"),
  entry("past-early", "2026-11-05", 8, "Past early"),
  entry("today-early", "2026-11-06", 8, "Today early"),
  entry("future-early", "2026-11-07", 10, "Future early"),
];
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date("2026-11-06T12:00:00"));
  jest.mocked(loadCalendarEntries).mockResolvedValue(entries as never);
});
afterEach(() => jest.useRealTimers());

describe("Calendar tab", () => {
  it("groups and sorts sessions by Today, Upcoming and Past", async () => {
    await render(<CalendarScreen />);
    expect(await screen.findByText("Dzisiaj")).toBeTruthy();
    expect(screen.getByText("Przyszłe")).toBeTruthy();
    expect(screen.getByText("Przeszłe")).toBeTruthy();
    expect(screen.getByText("Today early")).toBeTruthy();
    expect(screen.getByText("Today late")).toBeTruthy();
    expect(screen.getByText("Future early")).toBeTruthy();
    expect(screen.getByText("Future late")).toBeTruthy();
    expect(screen.queryByText("Past late")).toBeNull();
    await fireEvent.press(screen.getByLabelText("Rozwiń sekcję Przeszłe"));
    expect(screen.getByText("Past late")).toBeTruthy();
    expect(
      screen
        .getAllByRole("button")
        .some((node) =>
          node.props.accessibilityLabel?.startsWith("Past late,"),
        ),
    ).toBe(true);
    const todayOrder = screen
      .getAllByText(/Today (early|late)/)
      .map((node) => node.props.children);
    const upcomingOrder = screen
      .getAllByText(/Future (early|late)/)
      .map((node) => node.props.children);
    expect(todayOrder).toEqual(["Today early", "Today late"]);
    expect(upcomingOrder).toEqual(["Future early", "Future late"]);
  });

  it("collapses and expands Today and Upcoming, then navigates to an entry", async () => {
    await render(<CalendarScreen />);
    await screen.findByText("Today early");
    await fireEvent.press(screen.getByLabelText("Zwiń sekcję Dzisiaj"));
    expect(screen.queryByText("Today early")).toBeNull();
    await fireEvent.press(screen.getByLabelText("Rozwiń sekcję Dzisiaj"));
    await fireEvent.press(screen.getByLabelText("Zwiń sekcję Przyszłe"));
    expect(screen.queryByText("Future early")).toBeNull();
    await fireEvent.press(screen.getByLabelText("Rozwiń sekcję Przyszłe"));
    await fireEvent.press(
      screen.getByRole("button", {
        name: "Today early, 2026-11-06, godzina 8:00",
      }),
    );
    expect(router.push).toHaveBeenCalledWith("/calendar/today-early");
  });

  it("shows loading and errors, and offers a create action for an empty calendar", async () => {
    let resolve!: (value: never[]) => void;
    jest.mocked(loadCalendarEntries).mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }) as never,
    );
    await render(<CalendarScreen />);
    expect(screen.getByText("Wczytywanie kalendarza…")).toBeTruthy();
    resolve([]);
    expect(await screen.findByText("Zaplanuj trening")).toBeTruthy();
    await fireEvent.press(screen.getByText("Dodaj pierwszy trening"));
    expect(router.push).toHaveBeenCalledWith("/calendar/new");

    jest
      .mocked(loadCalendarEntries)
      .mockRejectedValueOnce(new Error("calendar offline"));
    await render(<CalendarScreen />);
    expect(await screen.findByText("calendar offline")).toBeTruthy();
  });
});
