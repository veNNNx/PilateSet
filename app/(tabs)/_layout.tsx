import { router, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../constants/useAppTheme";

export default function TabLayout() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStatusBarHeight: insets.top + 8,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerStyle: { backgroundColor: colors.cardBackground },
        headerTitleStyle: { color: colors.textPrimary, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Plany",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/plan/new")}
              style={{
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
              accessibilityRole="button"
              accessibilityLabel="Utwórz plan"
            >
              <Ionicons
                name="add-circle-outline"
                size={26}
                color={colors.primary}
              />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="list-outline"
              size={size}
              color={focused ? colors.primary : colors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sequences"
        options={{
          title: "Sekwencje",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/sequence/new")}
              style={{
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
              accessibilityRole="button"
              accessibilityLabel="Utwórz sekwencję"
            >
              <Ionicons
                name="add-circle-outline"
                size={26}
                color={colors.primary}
              />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="layers-outline"
              size={size}
              color={focused ? colors.primary : colors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: "Ćwiczenia",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="fitness-outline"
              size={size}
              color={focused ? colors.primary : colors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Kalendarz",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/calendar/new")}
              style={{
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
              accessibilityRole="button"
              accessibilityLabel="Dodaj trening"
            >
              <Ionicons
                name="add-circle-outline"
                size={26}
                color={colors.primary}
              />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="calendar-outline"
              size={size}
              color={focused ? colors.primary : colors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="info"
        options={{
          title: "Informacje",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="information-circle-outline"
              size={size}
              color={focused ? colors.primary : colors.textSecondary}
            />
          ),
        }}
      />
    </Tabs>
  );
}
