import React from "react";
import * as ReactNative from "react-native";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useExercises } from "../../constants/useExercises";
import { useFavorites } from "../../constants/useFavorites";
import { useAppTheme } from "../../constants/useAppTheme";
import { navigateBack } from "../../constants/navigation";
import { loadExercises, saveExercise } from "../../constants/exerciseStorage";
import {
  loadFavorites,
  toggleFavorite,
} from "../../constants/favoritesStorage";
import { router, useFocusEffect } from "expo-router";

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn(),
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
jest.mock("../../constants/exerciseStorage", () => ({
  loadExercises: jest.fn(),
  saveExercise: jest.fn(),
}));
jest.mock("../../constants/favoritesStorage", () => ({
  loadFavorites: jest.fn(),
  toggleFavorite: jest.fn(),
}));
jest.mock(
  "../../data/exercises.json",
  () =>
    jest.requireActual<typeof import("../fixtures/data")>("../fixtures/data")
      .exercises,
);

const sampleExercise = {
  id: "1",
  name: "Exercise",
  bodyAreas: [],
  position: null,
  level: "Basic",
  sets: "1",
  images: [],
  load: "",
  startingPosition: "",
  movementSequence: "",
  modifications: "",
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useFocusEffect).mockImplementation((callback) => {
    React.useEffect(callback, [callback]);
  });
  jest.mocked(loadExercises).mockResolvedValue([sampleExercise] as never);
  jest.mocked(saveExercise).mockResolvedValue([sampleExercise] as never);
  jest.mocked(loadFavorites).mockResolvedValue([{ type: "exercise", id: "1" }]);
  jest.mocked(toggleFavorite).mockResolvedValue([]);
});

describe("useExercises and useFavorites", () => {
  it("loads exercises on focus and exposes updates", async () => {
    const { result } = await renderHook(() => useExercises());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.exercises).toEqual([sampleExercise]);
    await act(async () => {
      await result.current.updateExercise(sampleExercise as never);
    });
    expect(saveExercise).toHaveBeenCalledWith(sampleExercise);
  });

  it("reports load and update failures for exercises", async () => {
    jest.mocked(loadExercises).mockRejectedValueOnce(new Error("load failed"));
    const { result } = await renderHook(() => useExercises());
    await waitFor(() => expect(result.current.error).toBe("load failed"));
    jest.mocked(saveExercise).mockRejectedValueOnce(new Error("save failed"));
    await expect(
      act(async () => result.current.updateExercise(sampleExercise as never)),
    ).rejects.toThrow("save failed");
  });

  it("loads and toggles favorites", async () => {
    const { result } = await renderHook(() => useFavorites());
    await waitFor(() =>
      expect(result.current.isFavorite("exercise", "1")).toBe(true),
    );
    await act(async () => {
      await result.current.toggle("exercise", "1");
    });
    expect(toggleFavorite).toHaveBeenCalledWith("exercise", "1");
    expect(result.current.isFavorite("exercise", "1")).toBe(false);
  });

  it("surfaces favorite load and toggle errors", async () => {
    jest.mocked(loadFavorites).mockRejectedValueOnce(new Error("load error"));
    const { result } = await renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.error).toBe("load error"));
    jest
      .mocked(toggleFavorite)
      .mockRejectedValueOnce(new Error("toggle error"));
    await act(async () => {
      await result.current.toggle("plan", "p1");
    });
    expect(result.current.error).toBe("toggle error");
  });
});

describe("app theme hook", () => {
  it("selects dark colors and memoizes the derived theme by color scheme", async () => {
    const scheme = jest
      .spyOn(ReactNative, "useColorScheme")
      .mockReturnValue("dark");
    const { result, rerender } = await renderHook(() => useAppTheme());
    const first = result.current;
    expect(first.isDark).toBe(true);
    expect(first.colors.background).toBe("#101918");
    rerender({});
    expect(result.current).toBe(first);
    scheme.mockRestore();
  });
});

describe("navigation fallback", () => {
  it("goes back when navigation history exists", () => {
    jest.mocked(router.canGoBack).mockReturnValue(true);
    navigateBack("/home");
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("replaces with the supplied fallback when history is empty", () => {
    jest.mocked(router.canGoBack).mockReturnValue(false);
    navigateBack("/home");
    expect(router.replace).toHaveBeenCalledWith("/home");
    expect(router.back).not.toHaveBeenCalled();
  });
});
