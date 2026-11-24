import React, { useMemo, type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Spacing } from "../constants/colors";
import { useAppTheme } from "../constants/useAppTheme";

const COLLAPSED_LINES = 3;
const COLLAPSED_HEIGHT = 60;
const LONG_NOTE_CHARACTERS = 120;

type PlanNoteCardProps = {
  text: string;
  onChangeText?: (text: string) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  trailing?: ReactNode;
  active?: boolean;
};

export function PlanNoteCard({
  text,
  onChangeText,
  onLongPress,
  trailing,
  active = false,
}: PlanNoteCardProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = React.useState(false);
  const [measuredOverflow, setMeasuredOverflow] = React.useState(false);
  const [inputContentHeight, setInputContentHeight] = React.useState(24);
  const canExpand =
    measuredOverflow ||
    text.length > LONG_NOTE_CHARACTERS ||
    text.split("\n").length > COLLAPSED_LINES;
  const inputHeight =
    !expanded && canExpand
      ? Math.min(inputContentHeight, COLLAPSED_HEIGHT)
      : inputContentHeight;
  const icon = (
    <Ionicons name="document-text-outline" size={18} color={colors.primary} />
  );

  return (
    <View style={[styles.card, active && styles.activeCard]}>
      {onLongPress ? (
        <TouchableOpacity
          style={styles.iconButton}
          onLongPress={onLongPress}
          delayLongPress={250}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Notatka, przytrzymaj aby zmienić kolejność"
          accessibilityHint="Przytrzymaj ikonę i przeciągnij notatkę, aby zmienić jej kolejność."
        >
          {icon}
        </TouchableOpacity>
      ) : (
        <View style={styles.iconContainer}>{icon}</View>
      )}
      <View style={styles.content}>
        {onChangeText ? (
          <View style={styles.inputContainer}>
            <TextInput
              value={text}
              onChangeText={onChangeText}
              onContentSizeChange={({ nativeEvent }) => {
                const { height } = nativeEvent.contentSize;
                setInputContentHeight(Math.max(24, height));
                setMeasuredOverflow(height > COLLAPSED_HEIGHT);
              }}
              placeholder="Wpisz treść notatki"
              placeholderTextColor={colors.textSecondary}
              multiline
              scrollEnabled={!expanded && canExpand}
              textAlign="left"
              textAlignVertical="center"
              style={[styles.input, { height: inputHeight }]}
              accessibilityLabel="Treść notatki"
            />
          </View>
        ) : (
          <Text
            onTextLayout={({ nativeEvent }) =>
              setMeasuredOverflow(nativeEvent.lines.length > COLLAPSED_LINES)
            }
            numberOfLines={!expanded && canExpand ? COLLAPSED_LINES : undefined}
            style={[styles.text, !text && styles.emptyText]}
          >
            {text || "Brak treści notatki."}
          </Text>
        )}
        {canExpand ? (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setExpanded((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? "Zwiń notatkę" : "Rozwiń notatkę"}
          >
            <Text style={styles.expandText}>
              {expanded ? "Zwiń" : "Rozwiń"}
            </Text>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.primary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    card: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.cardBackground,
      padding: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    activeCard: {
      borderColor: colors.primary,
      backgroundColor: colors.selectedBackground,
    },
    iconContainer: {
      width: 24,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    iconButton: {
      width: 24,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      flex: 1,
      alignItems: "stretch",
    },
    inputContainer: {
      minHeight: 44,
      justifyContent: "center",
    },
    input: {
      padding: 0,
      color: colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "left",
      textAlignVertical: "center",
    },
    text: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
      textAlign: "left",
    },
    expandButton: {
      minHeight: 24,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.xs,
    },
    expandText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "600",
    },
    trailing: {
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: { color: colors.textSecondary },
  });
