export const EXERCISE_IMAGES: Record<string, Record<string, any>> = {
  "1": {
    "1.jpg": require("../assets/exercises/1/1.jpg"),
  },
};

export const getExerciseImage = (exerciseId: string, imageName: string) => {
  return (
    EXERCISE_IMAGES[exerciseId]?.[imageName] || {
      uri: "https://via.placeholder.com/150",
    }
  );
};
