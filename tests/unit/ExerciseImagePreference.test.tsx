import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ExerciseImagePreferenceProvider,
  useExerciseImagePreference,
} from "../../constants/exerciseImagePreference";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

function PreferenceConsumer() {
  const { showExerciseImages, setShowExerciseImages } =
    useExerciseImagePreference();
  return (
    <>
      <Text>{showExerciseImages ? "visible" : "hidden"}</Text>
      <TouchableOpacity onPress={() => void setShowExerciseImages(false)}>
        <Text>hide images</Text>
      </TouchableOpacity>
    </>
  );
}

describe("exercise image preference", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
  });

  it("loads the saved preference and persists changes", async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue("true");

    await render(
      <ExerciseImagePreferenceProvider>
        <PreferenceConsumer />
      </ExerciseImagePreferenceProvider>,
    );

    expect(await screen.findByText("visible")).toBeTruthy();
    fireEvent.press(screen.getByText("hide images"));

    expect(await screen.findByText("hidden")).toBeTruthy();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "pilateset.showExerciseImages.v1",
      "false",
    );
  });

  it("hides images when the saved preference is disabled", async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue("false");

    await render(
      <ExerciseImagePreferenceProvider>
        <PreferenceConsumer />
      </ExerciseImagePreferenceProvider>,
    );

    expect(await screen.findByText("hidden")).toBeTruthy();
  });
});
