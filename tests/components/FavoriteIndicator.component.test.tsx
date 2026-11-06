import React from "react";
import { render, screen } from "@testing-library/react-native";
import { getColors } from "../../constants/colors";
import { FavoriteIndicator } from "../../components/FavoriteIndicator";
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
        { testID: "favorite-indicator-icon", ...props },
        props.name,
      ),
  };
});

beforeEach(() => setTestTheme(false));

describe("FavoriteIndicator", () => {
  it("renders no indicator for a non-favorite", async () => {
    await render(<FavoriteIndicator favorite={false} label="Bridge" />);
    expect(screen.queryByRole("image")).toBeNull();
    expect(screen.queryByTestId("favorite-indicator-icon")).toBeNull();
  });

  it("announces the favorite and renders a heart in light and dark themes", async () => {
    const { rerender } = await render(
      <FavoriteIndicator favorite label="Bridge" />,
    );
    expect(
      screen.getByRole("image", { name: "Ulubione: Bridge" }),
    ).toBeTruthy();
    expect(screen.getByTestId("favorite-indicator-icon").props.name).toBe(
      "heart",
    );
    expect(screen.getByTestId("favorite-indicator-icon").props.color).toBe(
      getColors(false).danger,
    );
    setTestTheme(true);
    await rerender(<FavoriteIndicator favorite label="Bridge" />);
    expect(screen.getByTestId("favorite-indicator-icon").props.color).toBe(
      getColors(true).danger,
    );
  });
});
