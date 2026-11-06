import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { BorderRadius } from "../constants/colors";
import { useAppTheme } from "../constants/useAppTheme";

type ReorderableItemsProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (options: {
    item: T;
    index: number;
    dragging: boolean;
    onLongPress: (event: GestureResponderEvent) => void;
  }) => React.ReactNode;
  testID?: string;
};

type ItemLayout = { y: number; height: number };

function ReorderableRow<T>({
  armed,
  item,
  index,
  renderItem,
  onLongPress,
  onMove,
  onRelease,
  onLayout,
  testID,
}: {
  armed: boolean;
  item: T;
  index: number;
  renderItem: ReorderableItemsProps<T>["renderItem"];
  onLongPress: (item: T, index: number, event: GestureResponderEvent) => void;
  onMove: (dy: number) => void;
  onRelease: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  testID: string;
}) {
  const armedRef = useRef(armed);
  const callbacksRef = useRef({ onMove, onRelease, onLongPress });
  const [panHandlers, setPanHandlers] = useState<
    ReturnType<typeof PanResponder.create>["panHandlers"] | null
  >(null);

  useEffect(() => {
    armedRef.current = armed;
    callbacksRef.current = { onMove, onRelease, onLongPress };
  }, [armed, onLongPress, onMove, onRelease]);

  useEffect(() => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
        armedRef.current && Math.abs(gestureState.dy) > 4,
      onPanResponderMove: (_event, gestureState) =>
        callbacksRef.current.onMove(gestureState.dy),
      onPanResponderRelease: () => callbacksRef.current.onRelease(),
      onPanResponderTerminate: () => callbacksRef.current.onRelease(),
      onPanResponderTerminationRequest: () => false,
    });
    setPanHandlers(responder.panHandlers);
  }, []);
  const handleChildLongPress = useCallback(
    (event: GestureResponderEvent) => onLongPress(item, index, event),
    [index, item, onLongPress],
  );

  return (
    <View
      {...(panHandlers ?? {})}
      onLayout={onLayout}
      testID={testID}
      onTouchEnd={() => {
        if (armedRef.current) callbacksRef.current.onRelease();
      }}
      onTouchCancel={() => callbacksRef.current.onRelease()}
    >
      {renderItem({
        item,
        index,
        dragging: armed,
        onLongPress: handleChildLongPress,
      })}
    </View>
  );
}

export function ReorderableItems<T>({
  items,
  getKey,
  onReorder,
  renderItem,
  testID,
}: ReorderableItemsProps<T>) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [indicatorTop, setIndicatorTop] = useState<number | null>(null);
  const activeKeyRef = useRef<string | null>(null);
  const itemsRef = useRef(items);
  const layoutsRef = useRef(new Map<string, ItemLayout>());
  const startYRef = useRef(0);
  const targetIndexRef = useRef(0);
  const onReorderRef = useRef(onReorder);
  useEffect(() => {
    itemsRef.current = items;
    onReorderRef.current = onReorder;
  }, [items, onReorder]);

  const getCandidates = useCallback(
    (draggedKey: string) =>
      itemsRef.current.filter((item) => getKey(item) !== draggedKey),
    [getKey],
  );

  const calculateIndicatorTop = useCallback(
    (index: number, candidates: T[]) => {
      const nextItem = candidates[index] ?? candidates[candidates.length - 1];
      if (!nextItem) return null;
      const layout = layoutsRef.current.get(getKey(nextItem));
      if (!layout) return null;
      return Math.max(
        0,
        (index >= candidates.length ? layout.y + layout.height : layout.y) - 2,
      );
    },
    [getKey],
  );

  const beginDrag = useCallback(
    (item: T, index: number, event: GestureResponderEvent) => {
      const key = getKey(item);
      const layout = layoutsRef.current.get(key);
      if (!layout) return;
      activeKeyRef.current = key;
      startYRef.current = layout.y + event.nativeEvent.locationY;
      const initialIndex = getCandidates(key).filter(
        (candidate) =>
          itemsRef.current.findIndex(
            (entry) => getKey(entry) === getKey(candidate),
          ) < index,
      ).length;
      targetIndexRef.current = initialIndex;
      setIndicatorTop(calculateIndicatorTop(initialIndex, getCandidates(key)));
      setActiveKey(key);
    },
    [calculateIndicatorTop, getCandidates, getKey],
  );

  const moveDrag = useCallback(
    (dy: number) => {
      const key = activeKeyRef.current;
      if (!key) return;
      const candidates = getCandidates(key);
      const pointerY = startYRef.current + dy;
      const targetIndex = candidates.filter((item) => {
        const layout = layoutsRef.current.get(getKey(item));
        return layout !== undefined && pointerY >= layout.y + layout.height / 2;
      }).length;
      targetIndexRef.current = targetIndex;
      setIndicatorTop(calculateIndicatorTop(targetIndex, candidates));
    },
    [calculateIndicatorTop, getCandidates, getKey],
  );

  const finishDrag = useCallback(() => {
    const key = activeKeyRef.current;
    if (key) {
      const currentItems = itemsRef.current;
      const fromIndex = currentItems.findIndex((item) => getKey(item) === key);
      const targetIndex = targetIndexRef.current;
      if (
        fromIndex >= 0 &&
        targetIndex >= 0 &&
        targetIndex < currentItems.length
      ) {
        const reordered = [...currentItems];
        const [item] = reordered.splice(fromIndex, 1);
        reordered.splice(targetIndex, 0, item);
        if (
          reordered.some(
            (item, index) => getKey(item) !== getKey(currentItems[index]),
          )
        ) {
          onReorderRef.current(reordered);
        }
      }
    }
    activeKeyRef.current = null;
    setActiveKey(null);
    setIndicatorTop(null);
  }, [getKey]);

  const handleItemLayout = useCallback(
    (key: string, event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      layoutsRef.current.set(key, { y, height });
    },
    [],
  );

  return (
    <View style={styles.group} testID={testID}>
      {items.map((item, index) => {
        const key = getKey(item);
        const dragging = activeKey === key;
        return (
          <ReorderableRow
            key={key}
            armed={dragging}
            item={item}
            index={index}
            renderItem={renderItem}
            onLongPress={beginDrag}
            onMove={moveDrag}
            onRelease={finishDrag}
            onLayout={(event) => handleItemLayout(key, event)}
            testID={`reorderable-row:${key}`}
          />
        );
      })}
      {activeKey !== null && indicatorTop !== null ? (
        <View
          pointerEvents="none"
          style={[styles.dropIndicator, { top: indicatorTop }]}
          testID="reorder-drop-indicator"
          accessibilityLabel="Miejsce upuszczenia elementu"
        />
      ) : null}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    group: {
      position: "relative",
    },
    dropIndicator: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 4,
      borderRadius: BorderRadius.sm,
      backgroundColor: colors.primary,
      zIndex: 2,
    },
  });
