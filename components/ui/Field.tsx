import { forwardRef } from "react";
import { StyleSheet, TextInput, TextInputProps, View } from "react-native";

import { useTheme } from "@/core/theme/ThemeProvider";
import { Text } from "@/components/ui/Text";

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export const Field = forwardRef<TextInput, Props>(function Field(
  { label, error, style, ...rest },
  ref
) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      <Text size="sm" tone="muted">
        {label}
      </Text>
      <TextInput
        ref={ref}
        style={[styles.input, error ? styles.error : undefined, style]}
        placeholderTextColor={theme.colors.muted}
        {...rest}
      />
      {error ? (
        <Text size="sm" tone="primary">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.xs
    },
    input: {
      height: 48,
      borderRadius: theme.radii.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      color: theme.colors.text,
      backgroundColor: theme.colors.card
    },
    error: {
      borderColor: theme.colors.error
    }
  });