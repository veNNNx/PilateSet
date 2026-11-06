import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { getColors } from "../../constants/colors";
import { FavoriteButton } from "../../components/FavoriteButton";
import { setTestTheme } from "./testTheme";

jest.mock("../../constants/useAppTheme", () =>
  jest.requireActual("./testTheme"),
);
jest.mock("@expo/vector-icons", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    Ionicons: (props: { name: string; color: string }) =>
      React.createElement(
        "Text",
        { testID: "favorite-icon", ...props },
        props.name,
      ),
  };
});

beforeEach(() => setTestTheme(false));

describe("FavoriteButton", () => {
  it("shows the add action, outline icon, hit slop and calls onPress", async () => {
    const onPress = jest.fn();
    await render(
      <FavoriteButton favorite={false} label="Bridge" onPress={onPress} />,
    );
    const button = screen.getByRole("button", {
      name: "Dodaj do ulubionych: Bridge",
    });
    expect(button.props.accessibilityState).toEqual({ selected: false });
    expect(button.props.hitSlop).toBe(8);
    expect(screen.getByTestId("favorite-icon").props.name).toBe(
      "heart-outline",
    );
    expect(screen.getByTestId("favorite-icon").props.color).toBe(
      getColors(false).textSecondary,
    );
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows the remove action and danger icon for favorites in dark mode", async () => {
    setTestTheme(true);
    const onPress = jest.fn();
    await render(<FavoriteButton favorite label="Bridge" onPress={onPress} />);
    const button = screen.getByRole("button", {
      name: "Usuń z ulubionych: Bridge",
    });
    expect(button.props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId("favorite-icon").props.name).toBe("heart");
    expect(screen.getByTestId("favorite-icon").props.color).toBe(
      getColors(true).danger,
    );
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
