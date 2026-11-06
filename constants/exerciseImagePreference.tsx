import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "pilateset.showExerciseImages.v1";

type ExerciseImagePreferenceContextValue = {
  showExerciseImages: boolean;
  loading: boolean;
  saving: boolean;
  error: string;
  setShowExerciseImages: (show: boolean) => Promise<void>;
};

const ExerciseImagePreferenceContext =
  createContext<ExerciseImagePreferenceContextValue | null>(null);

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function ExerciseImagePreferenceProvider({
  children,
}: React.PropsWithChildren) {
  const [showExerciseImages, setShowExerciseImagesState] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!isActive || value === null) return;
        if (value !== "true" && value !== "false") {
          setError("Zapis ustawienia zdjęć ćwiczeń jest nieprawidłowy.");
          return;
        }
        setShowExerciseImagesState(value === "true");
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            getErrorMessage(
              loadError,
              "Nie udało się wczytać ustawienia zdjęć ćwiczeń.",
            ),
          );
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const setShowExerciseImages = useCallback(async (show: boolean) => {
    setSaving(true);
    setError("");
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(show));
      setShowExerciseImagesState(show);
    } catch (saveError: unknown) {
      setError(
        getErrorMessage(
          saveError,
          "Nie udało się zapisać ustawienia zdjęć ćwiczeń.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      showExerciseImages,
      loading,
      saving,
      error,
      setShowExerciseImages,
    }),
    [error, loading, saving, setShowExerciseImages, showExerciseImages],
  );

  return (
    <ExerciseImagePreferenceContext.Provider value={value}>
      {children}
    </ExerciseImagePreferenceContext.Provider>
  );
}

export function useExerciseImagePreference() {
  const value = useContext(ExerciseImagePreferenceContext);
  if (!value) {
    throw new Error(
      "useExerciseImagePreference musi być użyty wewnątrz ExerciseImagePreferenceProvider.",
    );
  }
  return value;
}
