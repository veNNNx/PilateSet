export const EXERCISE_IMAGES: Record<string, Record<string, any>> = {
  "1": {
    "1.jpg": require("../assets/exercises/1/1.jpg"),
    "2.jpg": require("../assets/exercises/1/2.jpg"),
  },
  "2": { "1.jpg": require("../assets/exercises/2/1.jpg") },
  "3": { "1.jpg": require("../assets/exercises/3/1.jpg") },
  "4": { "1.jpg": require("../assets/exercises/4/1.jpg") },
  "5": { "1.jpg": require("../assets/exercises/5/1.jpg") },
  "6": { "1.jpg": require("../assets/exercises/6/1.jpg") },
  "7": { "1.jpg": require("../assets/exercises/7/1.jpg") },
  "8": { "1.jpg": require("../assets/exercises/8/1.jpg") },
  "9": { "1.jpg": require("../assets/exercises/9/1.jpg") },
};

export const getExerciseImage = (exerciseId: string, imageName: string) => {
  return (
    EXERCISE_IMAGES[exerciseId]?.[imageName] || {
      uri: "https://via.placeholder.com/150",
    }
  );
};
