import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import exercisesData, { type Exercise } from "./exercises";
import { loadExercises, saveExercise } from "./exerciseStorage";

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>(exercisesData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      loadExercises()
        .then((loadedExercises) => {
          if (!isActive) return;
          setExercises(loadedExercises);
          setError("");
        })
        .catch((loadError: unknown) => {
          if (isActive) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Nie udało się wczytać ćwiczeń.",
            );
          }
        })
        .finally(() => {
          if (isActive) setLoading(false);
        });
      return () => {
        isActive = false;
      };
    }, []),
  );

  const updateExercise = useCallback(async (exercise: Exercise) => {
    const updatedExercises = await saveExercise(exercise);
    setExercises(updatedExercises);
    setError("");
  }, []);

  return { exercises, loading, error, updateExercise };
}
