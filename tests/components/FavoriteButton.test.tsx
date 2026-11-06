import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { FavoriteButton } from "../../components/FavoriteButton";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

describe("FavoriteButton", () => {
  it("announces the action to add an item to favorites", async () => {
    await render(
      <FavoriteButton favorite={false} label="Hundred" onPress={jest.fn()} />,
    );

    expect(
      screen.getByRole("button", { name: "Dodaj do ulubionych: Hundred" }).props
        .accessibilityState,
    ).toEqual({ selected: false });
  });

  it("announces the action to remove a favorite and calls onPress", async () => {
    const onPress = jest.fn();
    await render(<FavoriteButton favorite label="Hundred" onPress={onPress} />);

    const button = screen.getByRole("button", {
      name: "Usuń z ulubionych: Hundred",
    });

    expect(button.props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
