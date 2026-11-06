import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAppTheme } from "../constants/useAppTheme";
import { ExerciseImagePreferenceProvider } from "../constants/exerciseImagePreference";

export default function RootLayout() {
  const { colors } = useAppTheme();

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ExerciseImagePreferenceProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ExerciseImagePreferenceProvider>
    </GestureHandlerRootView>
  );
}
