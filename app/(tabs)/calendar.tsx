import React, { useCallback, useMemo, useState } from "react";
import {
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, BorderRadius, type AppColors } from "../../constants/colors";
import { useAppTheme } from "../../constants/useAppTheme";
import {
  loadCalendarEntries,
  type CalendarEntry,
} from "../../constants/calendarStorage";
import {
  dateKeyFromDate,
  formatDateKey,
  formatHour,
  parseDateKey,
} from "../../constants/dateUtils";
import { ScreenMessage } from "../../components/ScreenMessage";

type CalendarSectionKey = "today" | "future" | "past";

interface CalendarSection {
  key: CalendarSectionKey;
  title: string;
  data: CalendarEntry[];
  count: number;
}

export default function CalendarScreen() {
  const { colors: Colors, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<CalendarSectionKey, boolean>
  >({
    today: false,
    future: false,
    past: true,
  });
  const today = dateKeyFromDate(new Date());

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setLoading(true);
      loadCalendarEntries()
        .then((loadedEntries) => {
          if (!isActive) return;
          setEntries(loadedEntries);
          setError("");
        })
        .catch((loadError: unknown) => {
          if (!isActive) return;
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nie udało się wczytać kalendarza.",
          );
        })
        .finally(() => {
          if (isActive) setLoading(false);
        });
      return () => {
        isActive = false;
      };
    }, []),
  );

  const sections = useMemo<CalendarSection[]>(() => {
    const todayEntries = entries
      .filter((entry) => entry.date === today)
      .sort((a, b) => a.hour - b.hour);
    const futureEntries = entries
      .filter((entry) => entry.date > today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour);
    const pastEntries = entries
      .filter((entry) => entry.date < today)
      .sort((a, b) => b.date.localeCompare(a.date) || b.hour - a.hour);

    const groupedSections: CalendarSection[] = [
      {
        key: "today",
        title: "Dzisiaj",
        data: todayEntries,
        count: todayEntries.length,
      },
      {
        key: "future",
        title: "Przyszłe",
        data: futureEntries,
        count: futureEntries.length,
      },
      {
        key: "past",
        title: "Przeszłe",
        data: pastEntries,
        count: pastEntries.length,
      },
    ];

    return groupedSections.map((section) => ({
      ...section,
      data: collapsedSections[section.key] ? [] : section.data,
    }));
  }, [collapsedSections, entries, today]);

  const renderEntry = ({ item }: { item: CalendarEntry }) => (
    <TouchableOpacity
      style={styles.entryCard}
      activeOpacity={0.75}
      onPress={() => router.push(`/calendar/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${item.planName}, ${item.date}, godzina ${item.hour}:00`}
    >
      <View style={styles.dateBadge}>
        <View style={styles.dateBadgeDate}>
          <Text style={styles.dateBadgeDay}>
            {String(parseDateKey(item.date).getDate()).padStart(2, "0")}
          </Text>
          <Text style={styles.dateBadgeMonth}>
            {formatDateKey(item.date, { month: "short" }).replace(".", "")}
          </Text>
        </View>
        <Text style={styles.dateBadgeTime}>{formatHour(item.hour)}</Text>
      </View>
      <View style={styles.entryInfo}>
        <Text style={styles.entryName} numberOfLines={1}>
          {item.planName}
        </Text>
        <Text style={styles.entryDate}>{formatDateKey(item.date)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={globalStyles.container}>
      {loading ? (
        <ScreenMessage message="Wczytywanie kalendarza…" />
      ) : error ? (
        <ScreenMessage message={error} error />
      ) : entries.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="calendar-outline"
              size={32}
              color={Colors.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>Zaplanuj trening</Text>
          <Text style={styles.emptyDescription}>
            Dodaj trening do kalendarza, aby łatwo śledzić swój plan.
          </Text>
          <Text style={styles.storageNote}>
            Wpisy zapisują się lokalnie na tym urządzeniu.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push("/calendar/new")}
            accessibilityRole="button"
          >
            <Text style={styles.emptyButtonText}>Dodaj pierwszy trening</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => {
            const collapsed = collapsedSections[section.key];
            return (
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() =>
                  setCollapsedSections((current) => ({
                    ...current,
                    [section.key]: !current[section.key],
                  }))
                }
                accessibilityRole="button"
                accessibilityLabel={`${collapsed ? "Rozwiń" : "Zwiń"} sekcję ${section.title}`}
                accessibilityState={{ expanded: !collapsed }}
              >
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.sectionHeaderRight}>
                  <Text style={styles.sectionCount}>{section.count}</Text>
                  <Ionicons
                    name={collapsed ? "chevron-down" : "chevron-up"}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const createStyles = (Colors: AppColors) =>
  StyleSheet.create({
    list: {
      padding: Spacing.md,
      paddingBottom: Spacing.xl,
    },
    sectionHeader: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.sm,
      marginBottom: Spacing.sm,
      backgroundColor: Colors.background,
    },
    sectionTitle: {
      color: Colors.textPrimary,
      fontSize: 17,
      fontWeight: "700",
    },
    sectionHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    sectionCount: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    entryCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.cardBackground,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    dateBadge: {
      width: 64,
      minHeight: 68,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.selectedBackground,
      borderRadius: BorderRadius.sm,
      marginRight: Spacing.md,
    },
    dateBadgeDate: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: Spacing.xs,
    },
    dateBadgeDay: {
      color: Colors.primaryDark,
      fontSize: 15,
      fontWeight: "700",
    },
    dateBadgeMonth: {
      color: Colors.primaryDark,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    dateBadgeTime: {
      color: Colors.primaryDark,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 2,
    },
    entryInfo: { flex: 1 },
    entryName: {
      color: Colors.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    entryDate: {
      color: Colors.textSecondary,
      fontSize: 12,
      marginTop: 3,
      textTransform: "capitalize",
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: Spacing.xl,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: Colors.selectedBackground,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: Spacing.md,
    },
    emptyTitle: {
      color: Colors.textPrimary,
      fontSize: 20,
      fontWeight: "700",
    },
    emptyDescription: {
      color: Colors.textSecondary,
      fontSize: 14,
      textAlign: "center",
      marginTop: Spacing.xs,
    },
    storageNote: {
      color: Colors.textSecondary,
      fontSize: 12,
      textAlign: "center",
      marginTop: Spacing.sm,
    },
    emptyButton: {
      minHeight: 46,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg,
      marginTop: Spacing.lg,
    },
    emptyButtonText: {
      color: Colors.white,
      fontSize: 14,
      fontWeight: "600",
    },
  });
