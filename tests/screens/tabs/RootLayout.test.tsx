import React from "react";
import { render, screen } from "@testing-library/react-native";
import RootLayout from "../../../app/_layout";

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View, Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const Screen = ({ name }: { name: string }) => (
    <Text testID={`stack-screen-${name}`}>{name}</Text>
  );
  const Stack = Object.assign(
    ({ children }: React.PropsWithChildren) => (
      <View testID="root-stack">{children}</View>
    ),
    { Screen },
  );
  return { Stack };
});
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: ({ children }: React.PropsWithChildren) => (
    <>{children}</>
  ),
}));
jest.mock("../../../constants/useAppTheme", () => ({
  useAppTheme: () => ({ colors: { background: "#fefefe" } }),
}));
jest.mock("../../../constants/exerciseImagePreference", () => ({
  ExerciseImagePreferenceProvider: ({ children }: React.PropsWithChildren) => (
    <>{children}</>
  ),
}));

describe("Root layout", () => {
  it("provides gesture and image-preference roots around the router stack", async () => {
    await render(<RootLayout />);
    expect(screen.getByTestId("root-stack")).toBeTruthy();
    expect(screen.getByTestId("stack-screen-(tabs)")).toBeTruthy();
  });
});
