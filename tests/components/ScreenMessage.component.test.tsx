import React from "react";
import { render, screen } from "@testing-library/react-native";
import { getColors } from "../../constants/colors";
import { ScreenMessage } from "../../components/ScreenMessage";
import { setTestTheme } from "./testTheme";

jest.mock("../../constants/useAppTheme", () =>
  jest.requireActual("./testTheme"),
);

beforeEach(() => setTestTheme(false));

describe("ScreenMessage", () => {
  it("renders the message with the secondary text color by default", async () => {
    await render(<ScreenMessage message="Nothing here" />);
    expect(screen.getByText("Nothing here").props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: getColors(false).textSecondary }),
      ]),
    );
  });

  it("uses the danger color for errors and accepts a custom container style", async () => {
    await render(
      <ScreenMessage message="Load failed" error style={{ marginTop: 17 }} />,
    );
    const message = screen.getByText("Load failed");
    expect(message.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: getColors(false).danger }),
      ]),
    );
    expect(screen.getByText("Load failed").parent?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ marginTop: 17 })]),
    );
  });

  it("uses dark theme colors when rendered in dark mode", async () => {
    setTestTheme(true);
    await render(<ScreenMessage message="Dark notice" />);
    expect(screen.getByText("Dark notice").props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: getColors(true).textSecondary }),
      ]),
    );
  });
});
