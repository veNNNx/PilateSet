import React from "react";
import { Alert } from "react-native";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import InfoScreen from "../../../app/(tabs)/info";
import appInfo from "../../../data/appInfo.json";
import { loadCalendarEntries } from "../../../constants/calendarStorage";
import { loadExerciseNotes } from "../../../constants/exerciseNotesStorage";
import { loadFavorites } from "../../../constants/favoritesStorage";
import { loadPlans } from "../../../constants/planStorage";
import { loadSequenceNotes } from "../../../constants/sequenceNotesStorage";
import { loadSequences } from "../../../constants/sequenceStorage";
import { exportJson } from "../../../constants/jsonExport";
import { importJsonBackup } from "../../../constants/jsonImport";
import { readPickedJson } from "../../../constants/readPickedJson";
import * as DocumentPicker from "expo-document-picker";

const mockSetShowExerciseImages = jest.fn();
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
      white: "white",
      selectedBackground: "#eee",
      danger: "red",
    },
    globalStyles: { container: {} },
  }),
}));
jest.mock("../../../constants/useExercises", () => ({
  useExercises: () => ({
    exercises: jest.requireActual("../../fixtures/data").exercises,
  }),
}));
jest.mock("../../../constants/exerciseImagePreference", () => ({
  useExerciseImagePreference: () => ({
    showExerciseImages: true,
    loading: false,
    saving: false,
    error: "",
    setShowExerciseImages: mockSetShowExerciseImages,
  }),
}));
jest.mock("../../../constants/calendarStorage", () => ({
  loadCalendarEntries: jest.fn(),
}));
jest.mock("../../../constants/planStorage", () => ({ loadPlans: jest.fn() }));
jest.mock("../../../constants/sequenceStorage", () => ({
  loadSequences: jest.fn(),
}));
jest.mock("../../../constants/favoritesStorage", () => ({
  loadFavorites: jest.fn(),
}));
jest.mock("../../../constants/exerciseNotesStorage", () => ({
  loadExerciseNotes: jest.fn(),
}));
jest.mock("../../../constants/sequenceNotesStorage", () => ({
  loadSequenceNotes: jest.fn(),
}));
jest.mock("../../../constants/jsonExport", () => ({ exportJson: jest.fn() }));
jest.mock("../../../constants/jsonImport", () => ({
  importJsonBackup: jest.fn(),
}));
jest.mock("../../../constants/readPickedJson", () => ({
  readPickedJson: jest.fn(),
}));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  jest.mocked(loadPlans).mockResolvedValue([]);
  jest.mocked(loadSequences).mockResolvedValue([]);
  jest.mocked(loadCalendarEntries).mockResolvedValue([]);
  jest.mocked(loadFavorites).mockResolvedValue([]);
  jest.mocked(loadExerciseNotes).mockResolvedValue([]);
  jest.mocked(loadSequenceNotes).mockResolvedValue([]);
  jest.mocked(exportJson).mockResolvedValue(undefined);
  jest.mocked(importJsonBackup).mockResolvedValue(undefined);
  jest.mocked(readPickedJson).mockResolvedValue('{"formatVersion":1}');
});

async function chooseFile() {
  await fireEvent.press(
    screen.getByRole("button", { name: "Załaduj dane z pliku JSON" }),
  );
  await fireEvent.press(screen.getByText("Wybierz plik"));
}

describe("Info tab", () => {
  it("renders appInfo description, version, release date and each changelog entry", async () => {
    await render(<InfoScreen />);
    expect(screen.getByText("PilateSet")).toBeTruthy();
    expect(screen.getByText(appInfo.description)).toBeTruthy();
    expect(screen.getByText(appInfo.version)).toBeTruthy();
    expect(screen.getByText("6 listopada 2026")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Rozwiń historię zmian" }),
    );
    for (const item of appInfo.changelog)
      expect(screen.getByText(item.message)).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Zwiń historię zmian" }),
    );
    expect(screen.queryByText(appInfo.changelog[0].message)).toBeNull();
  });

  it("forwards exercise-image preference changes to its provider", async () => {
    await render(<InfoScreen />);
    const toggle = screen.getByRole("switch", {
      name: "Pokazuj zdjęcia ćwiczeń",
    });
    expect(toggle.props.value).toBe(true);
    fireEvent(toggle, "valueChange", false);
    expect(mockSetShowExerciseImages).toHaveBeenCalledWith(false);
  });

  it("exports every backup dataset and displays success; export errors are alerted", async () => {
    const sequence = {
      id: "s1",
      name: "Section with load",
      description: "",
      load: "Medium spring",
      exerciseIds: ["1"],
    };
    jest.mocked(loadSequences).mockResolvedValue([sequence]);
    await render(<InfoScreen />);
    await fireEvent.press(
      screen.getByRole("button", { name: "Pobierz wszystkie dane JSON" }),
    );
    expect(
      await screen.findByText("Eksport danych został przygotowany."),
    ).toBeTruthy();
    expect(exportJson).toHaveBeenCalledWith(
      "pilateset-wszystkie-dane.json",
      expect.objectContaining({
        formatVersion: 1,
        "exercises.json": expect.any(Array),
        "bodyAreas.json": expect.any(Array),
        "exerciseLevels.json": expect.any(Array),
        "exercisePositions.json": expect.any(Array),
        "favorites.json": [],
        "exercise-notes.json": [],
        "sequence-notes.json": [],
        "plans.json": [],
        "sequences.json": [],
        "calendar.json": [],
        exportedAt: expect.any(String),
      }),
    );
    const exportedData = jest.mocked(exportJson).mock.calls[0][1];
    expect(exportedData).toEqual(
      expect.objectContaining({ "sequences.json": [sequence] }),
    );
    expect(JSON.stringify(exportedData)).not.toContain('"sets"');
    expect(JSON.stringify(exportedData)).toContain('"load":"Light spring"');

    jest.mocked(exportJson).mockRejectedValueOnce(new Error("share failed"));
    await fireEvent.press(
      screen.getByRole("button", { name: "Pobierz wszystkie dane JSON" }),
    );
    expect(await screen.findByText("share failed")).toBeTruthy();
    expect(Alert.alert).toHaveBeenCalledWith(
      "Nie udało się wyeksportować danych",
      "share failed",
    );
  });

  it("does not open the picker until confirmation and supports canceling both dialogs", async () => {
    await render(<InfoScreen />);
    await fireEvent.press(
      screen.getByRole("button", { name: "Załaduj dane z pliku JSON" }),
    );
    expect(screen.getByText("Załadować kopię zapasową?")).toBeTruthy();
    await fireEvent.press(screen.getByText("Anuluj"));
    expect(DocumentPicker.getDocumentAsync).not.toHaveBeenCalled();
    await fireEvent.press(
      screen.getByRole("button", { name: "Załaduj dane z pliku JSON" }),
    );
    jest
      .mocked(DocumentPicker.getDocumentAsync)
      .mockResolvedValueOnce({ canceled: true, assets: [] } as never);
    await fireEvent.press(screen.getByText("Wybierz plik"));
    await waitFor(() =>
      expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled(),
    );
    expect(importJsonBackup).not.toHaveBeenCalled();
  });

  it("imports valid JSON, rejects non-JSON files and reports read/import failures", async () => {
    await render(<InfoScreen />);
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ name: "backup.json", uri: "file://backup" }],
    } as never);
    await chooseFile();
    expect(await screen.findByText("Dane zostały zaimportowane.")).toBeTruthy();
    expect(readPickedJson).toHaveBeenCalled();
    expect(importJsonBackup).toHaveBeenCalledWith('{"formatVersion":1}');

    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ name: "backup.txt", uri: "file://backup" }],
    } as never);
    await chooseFile();
    expect(
      await screen.findByText("Wybierz plik z rozszerzeniem .json."),
    ).toBeTruthy();
    expect(Alert.alert).toHaveBeenCalledWith(
      "Nie udało się zaimportować danych",
      "Wybierz plik z rozszerzeniem .json.",
    );

    jest
      .mocked(DocumentPicker.getDocumentAsync)
      .mockRejectedValueOnce(new Error("picker broken"));
    await chooseFile();
    expect(await screen.findByText("picker broken")).toBeTruthy();

    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ name: "bad.json", uri: "file://bad" }],
    } as never);
    jest.mocked(readPickedJson).mockRejectedValueOnce(new Error("cannot read"));
    await chooseFile();
    expect(await screen.findByText("cannot read")).toBeTruthy();

    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ name: "bad.json", uri: "file://bad" }],
    } as never);
    jest
      .mocked(importJsonBackup)
      .mockRejectedValueOnce(new Error("invalid backup"));
    await chooseFile();
    expect(await screen.findByText("invalid backup")).toBeTruthy();
  });
});
