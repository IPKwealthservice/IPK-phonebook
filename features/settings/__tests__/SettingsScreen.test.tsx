import { render } from "@testing-library/react-native";

import { ThemeProvider } from "@/core/theme/ThemeProvider";
import { SettingsScreen } from "@/features/settings/screens/SettingsScreen";

describe("SettingsScreen", () => {
  it("renders appearance section", () => {
    const { getByText } = render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>
    );

    expect(getByText("Appearance")).toBeTruthy();
  });
});