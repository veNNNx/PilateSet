import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import TabLayout from "../../../app/(tabs)/_layout";

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View, Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const Screen = ({
    name,
    options,
  }: {
    name: string;
    options: {
      title: string;
      headerRight?: () => React.ReactNode;
      tabBarIcon?: (args: {
        focused: boolean;
        size: number;
      }) => React.ReactNode;
    };
  }) => (
    <View testID={`screen-${name}`}>
      <Text>{options.title}</Text>
      {options.headerRight?.()}
      {options.tabBarIcon?.({ focused: true, size: 22 })}
      {options.tabBarIcon?.({ focused: false, size: 22 })}
    </View>
  );
  const Tabs = Object.assign(
    ({ children }: React.PropsWithChildren) => (
      <View testID="tabs">{children}</View>
    ),
    { Screen },
  );
  return { Tabs, router: { push: jest.fn() } };
});
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 24 }),
}));
jest.mock("../../../constants/useAppTheme", () => ({
  useAppTheme: () => ({
    colors: {
      background: "white",
      cardBackground: "white",
      border: "gray",
      primary: "blue",
      textPrimary: "black",
      textSecondary: "gray",
    },
  }),
}));

describe("Tabs layout", () => {
  it("sets all five tab screens and renders focused and unfocused icons", async () => {
    await render(<TabLayout />);
    expect(screen.getByTestId("tabs")).toBeTruthy();
    for (const [name, title] of [
      ["index", "Plany"],
      ["sequences", "Sekwencje"],
      ["exercises", "Ćwiczenia"],
      ["calendar", "Kalendarz"],
      ["info", "Informacje"],
    ]) {
      expect(screen.getByTestId(`screen-${name}`)).toBeTruthy();
      expect(screen.getByText(title)).toBeTruthy();
    }
  });

  it("routes header actions to create a plan, sequence and calendar entry", async () => {
    await render(<TabLayout />);
    await fireEvent.press(screen.getByLabelText("Utwórz plan"));
    await fireEvent.press(screen.getByLabelText("Utwórz sekwencję"));
    await fireEvent.press(screen.getByLabelText("Dodaj trening"));
    expect(router.push).toHaveBeenNthCalledWith(1, "/plan/new");
    expect(router.push).toHaveBeenNthCalledWith(2, "/sequence/new");
    expect(router.push).toHaveBeenNthCalledWith(3, "/calendar/new");
  });
});
