import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/core/theme/ThemeProvider";
import { Text } from "@/components/ui/Text";

type Props = PropsWithChildren<{
  title: string;
  description?: string;
}>;

export const EmptyState = ({ title, description, children }: Props) => {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      <Text weight="semibold" size="lg">
        {title}
      </Text>
      {description ? (
        <Text tone="muted" style={styles.description}>
          {description}
        </Text>
      ) : null}
      {children}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: theme.spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm
    },
    description: {
      textAlign: "center"
    }
  });