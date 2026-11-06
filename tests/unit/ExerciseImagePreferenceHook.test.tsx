import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ExerciseImagePreferenceProvider,
  useExerciseImagePreference,
} from "../../constants/exerciseImagePreference";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));
const wrapper = ({ children }: React.PropsWithChildren) => (
  <ExerciseImagePreferenceProvider>{children}</ExerciseImagePreferenceProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
});

describe("useExerciseImagePreference", () => {
  it("exposes loading and saving state while persisting a preference", async () => {
    const { result } = await renderHook(() => useExerciseImagePreference(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.showExerciseImages).toBe(true);
    await act(async () => {
      await result.current.setShowExerciseImages(false);
    });
    expect(result.current.showExerciseImages).toBe(false);
    expect(result.current.saving).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "pilateset.showExerciseImages.v1",
      "false",
    );
  });

  it("reports malformed persisted values and load failures", async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue("yes");
    const { result, unmount } = await renderHook(
      () => useExerciseImagePreference(),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(
      "Zapis ustawienia zdjęć ćwiczeń jest nieprawidłowy.",
    );
    unmount();

    jest
      .mocked(AsyncStorage.getItem)
      .mockRejectedValueOnce(new Error("read failed"));
    const next = await renderHook(() => useExerciseImagePreference(), {
      wrapper,
    });
    await waitFor(() => expect(next.result.current.error).toBe("read failed"));
  });
});
