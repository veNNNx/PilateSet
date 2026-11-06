import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import { Text, TouchableOpacity } from "react-native";
import { getColors } from "../../constants/colors";
import { ReorderableItems } from "../../components/ReorderableItems";
import { setTestTheme } from "./testTheme";

jest.mock("../../constants/useAppTheme", () =>
  jest.requireActual("./testTheme"),
);
const mockResponderConfigs: Record<
  string,
  (event: unknown, gesture: any) => any
>[] = [];

jest.mock("react-native", () => {
  const Native =
    jest.requireActual<typeof import("react-native")>("react-native");
  Object.defineProperty(Native, "PanResponder", {
    configurable: true,
    value: {
      create: (
        config: Record<string, (event: unknown, gesture: any) => any>,
      ) => {
        mockResponderConfigs.push(config);
        return {
          panHandlers: {
            onMoveShouldSetResponderCapture:
              config.onMoveShouldSetPanResponderCapture,
            onResponderMove: config.onPanResponderMove,
            onResponderRelease: config.onPanResponderRelease,
            onResponderTerminate: config.onPanResponderTerminate,
            onResponderTerminationRequest:
              config.onPanResponderTerminationRequest,
          },
        };
      },
    },
  });
  return Native;
});

const original = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Bravo" },
  { id: "c", label: "Charlie" },
];

beforeEach(async () => {
  await cleanup();
  setTestTheme(false);
  mockResponderConfigs.length = 0;
});

async function renderItems(onReorder = jest.fn(), items = original) {
  const renderItem = jest.fn(
    ({
      item,
      index,
      dragging,
      onLongPress,
    }: {
      item: (typeof original)[number];
      index: number;
      dragging: boolean;
      onLongPress: (event: any) => void;
    }) => (
      <TextButton
        item={item}
        index={index}
        dragging={dragging}
        onLongPress={onLongPress}
      />
    ),
  );
  const view = await render(
    <ReorderableItems
      items={items}
      getKey={(item) => item.id}
      onReorder={onReorder}
      renderItem={renderItem}
      testID="sequence-items"
    />,
  );
  return { ...view, onReorder, renderItem };
}

function TextButton({
  item,
  index,
  dragging,
  onLongPress,
}: {
  item: (typeof original)[number];
  index: number;
  dragging: boolean;
  onLongPress: (event: any) => void;
}) {
  return React.createElement(
    TouchableOpacity,
    {
      onLongPress,
      accessibilityRole: "button",
      accessibilityLabel: item.label,
    },
    React.createElement(
      Text,
      { testID: `content-${item.id}` },
      `${index}:${item.label}:${dragging}`,
    ),
  );
}

async function layout(id: string, y: number, height = 20) {
  await fireEvent(screen.getByTestId(`reorderable-row:${id}`), "layout", {
    nativeEvent: { layout: { y, height, x: 0, width: 100 } },
  });
}

async function dragRow(id: string, locationY = 10) {
  await fireEvent(
    screen.getByRole("button", {
      name: original.find((item) => item.id === id)?.label ?? id,
    }),
    "longPress",
    {
      nativeEvent: { locationY },
    },
  );
  return screen.getByTestId(`reorderable-row:${id}`);
}

describe("ReorderableItems", () => {
  it("renders keyed rows with index, drag state, and the supplied test ID", async () => {
    const { renderItem } = await renderItems();
    expect(screen.getByTestId("sequence-items")).toBeTruthy();
    expect(screen.getByTestId("content-a").children.join("")).toBe(
      "0:Alpha:false",
    );
    expect(screen.getByTestId("content-b").children.join("")).toBe(
      "1:Bravo:false",
    );
    const row = screen.getByTestId("reorderable-row:a");
    expect(mockResponderConfigs[0].onStartShouldSetPanResponder!({}, {})).toBe(
      false,
    );
    expect(
      mockResponderConfigs[0].onMoveShouldSetPanResponderCapture!(
        {},
        { dy: 5 },
      ),
    ).toBe(false);
    await fireEvent(row, "touchEnd");
    expect(renderItem.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByTestId("reorder-drop-indicator")).toBeNull();
  });

  it("does not start dragging before layout is known", async () => {
    const { onReorder } = await renderItems();
    await fireEvent(
      screen.getByRole("button", { name: "Alpha" }),
      "longPress",
      { nativeEvent: { locationY: 10 } },
    );
    expect(screen.queryByTestId("reorder-drop-indicator")).toBeNull();
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("starts on long press, tracks movement, shows the insertion indicator, and commits reorder", async () => {
    const onReorder = jest.fn();
    await renderItems(onReorder);
    await layout("a", 0);
    await layout("b", 20);
    await layout("c", 40);
    let row = await dragRow("a");
    expect(screen.getByTestId("content-a").children.join("")).toBe(
      "0:Alpha:true",
    );
    expect(
      screen.getByTestId("reorder-drop-indicator").props.accessibilityLabel,
    ).toBe("Miejsce upuszczenia elementu");

    await act(async () => {
      expect(
        mockResponderConfigs[0].onStartShouldSetPanResponder!({}, {}),
      ).toBe(false);
      expect(
        mockResponderConfigs[0].onMoveShouldSetPanResponderCapture!(
          {},
          { dy: 4 },
        ),
      ).toBe(false);
      expect(
        mockResponderConfigs[0].onMoveShouldSetPanResponderCapture!(
          {},
          { dy: 8 },
        ),
      ).toBe(true);
      expect(row.props.onResponderTerminationRequest({}, {})).toBe(false);
      row.props.onResponderMove({}, { dy: 55 });
    });
    expect(screen.getByTestId("reorder-drop-indicator").props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ top: 58 }),
        expect.objectContaining({ backgroundColor: getColors(false).primary }),
      ]),
    );
    row = screen.getByTestId("reorderable-row:a");
    await act(async () => row.props.onResponderRelease({}, {}));
    expect(onReorder).toHaveBeenCalledWith([
      original[1],
      original[2],
      original[0],
    ]);
    expect(screen.queryByTestId("reorder-drop-indicator")).toBeNull();
  });

  it("supports moving to the start, cancels on touch cancellation, and ignores unchanged order", async () => {
    const onReorder = jest.fn();
    await renderItems(onReorder);
    await layout("a", 0);
    await layout("b", 20);
    await layout("c", 40);
    let row = await dragRow("c");
    await act(async () => row.props.onResponderMove({}, { dy: -45 }));
    expect(screen.getByTestId("reorder-drop-indicator").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ top: 0 })]),
    );
    await act(async () => row.props.onTouchCancel());
    await act(async () => row.props.onResponderTerminate({}, {}));
    await fireEvent(screen.getByTestId("reorderable-row:c"), "touchCancel");
    expect(onReorder).toHaveBeenCalledWith([
      original[2],
      original[0],
      original[1],
    ]);
    expect(screen.queryByTestId("reorder-drop-indicator")).toBeNull();

    row = await dragRow("a");
    await act(async () => row.props.onResponderRelease({}, {}));
    expect(onReorder).toHaveBeenCalledTimes(1);
  });

  it("releases an armed drag on touch end and does not reorder after changing the item list", async () => {
    const onReorder = jest.fn();
    const { rerender } = await renderItems(onReorder);
    await layout("a", 0);
    await layout("b", 20);
    await layout("c", 40);
    await dragRow("b");
    await fireEvent(screen.getByTestId("reorderable-row:b"), "touchEnd");
    expect(onReorder).not.toHaveBeenCalled();
    expect(screen.queryByTestId("reorder-drop-indicator")).toBeNull();

    await layout("a", 0);
    await layout("b", 20);
    await layout("c", 40);
    const row = await dragRow("a");
    await act(async () => row.props.onResponderMove({}, { dy: 55 }));
    const changed = [original[1], original[2]];
    await rerender(
      <ReorderableItems
        items={changed}
        getKey={(item) => item.id}
        onReorder={onReorder}
        renderItem={({ item, onLongPress }) => (
          <TextButton
            item={item}
            index={0}
            dragging={false}
            onLongPress={onLongPress}
          />
        )}
      />,
    );
    await act(async () => row.props.onResponderRelease({}, {}));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("handles a one-item list without a drop target or reorder", async () => {
    const onReorder = jest.fn();
    await renderItems(onReorder, [original[0]]);
    await layout("a", 0);
    const row = await dragRow("a");
    expect(screen.queryByTestId("reorder-drop-indicator")).toBeNull();
    await act(async () => row.props.onResponderMove({}, { dy: 10 }));
    await act(async () => row.props.onResponderRelease({}, {}));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("uses dark theme colors on the drag indicator", async () => {
    setTestTheme(true);
    await renderItems();
    await layout("a", 0);
    await layout("b", 20);
    await dragRow("a");
    expect(screen.getByTestId("reorder-drop-indicator").props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: getColors(true).primary }),
      ]),
    );
  });
});
