import { PropsWithChildren } from "react";
import { Animated, Easing, StyleSheet, ViewStyle } from "react-native";

import { useTheme } from "@/core/theme/ThemeProvider";

type Props = PropsWithChildren<{
  style?: ViewStyle;
}>;

export const Skeleton = ({ style }: Props) => {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const shimmer = new Animated.Value(0);
  Animated.loop(
    Animated.timing(shimmer, {
      toValue: 1,
      duration: 1200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true
    })
  ).start();

  const opacity = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.4] });

  return <Animated.View style={[styles.base, { opacity }, style]} />;
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    base: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      height: 16
    }
  });

