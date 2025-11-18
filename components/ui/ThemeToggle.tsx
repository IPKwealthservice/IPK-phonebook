import { useMemo } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { useTheme } from "@/core/theme/ThemeProvider";
import { Text } from "@/components/ui/Text";

type Props = {
  label?: string;
};

export const ThemeToggle = ({ label = "Dark mode" }: Props) => {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const value = useMemo(() => theme.scheme === "dark", [theme.scheme]);
  const onChange = (next: boolean) => {
    if (theme.setScheme) {
      theme.setScheme(next ? "dark" : "light");
    }
  };

  return (
    <View style={styles.row}>
      <Text>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={value ? "#ffffff" : "#ffffff"}
        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
      />
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    }
  });

