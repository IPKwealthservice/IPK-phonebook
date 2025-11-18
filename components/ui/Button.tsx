import React, { useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Appearance,
  GestureResponderEvent,
  Platform,
  Pressable,
  Text as RNText,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

type ButtonProps = {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<any>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  accessibilityLabel?: string;
  loadingText?: string;
};

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  accessibilityLabel,
  loadingText,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (to: number) => {
    Animated.timing(scale, {
      toValue: to,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const flattenedStyle = useMemo(
    () => (style ? StyleSheet.flatten(style) : undefined),
    [style]
  );

  const animatedTransform = useMemo<StyleProp<ViewStyle>>(
    () => [{ transform: [{ scale }] }],
    [scale]
  );

  const baseStyle: ViewStyle = {
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 220,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: "#3143FF",
    borderWidth: 1,
    borderColor: "rgba(49,67,255,0.45)",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  };

  const contentOpacity = disabled ? 0.7 : 1;
  const isLightMode =
    Platform.OS !== "web" && Appearance.getColorScheme?.() === "light";

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled || loading}
      onPress={(e) => {
        if (!disabled && !loading) onPress?.(e);
      }}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
      android_ripple={{
        color: "rgba(255,255,255,0.25)",
        borderless: false,
      }}
      style={({ pressed }) => [
        baseStyle,
        {
          backgroundColor:
            flattenedStyle?.backgroundColor ??
            baseStyle.backgroundColor ??
            "#3143FF",
          opacity: pressed ? 0.95 : 1,
          overflow: Platform.OS === "android" ? "hidden" : undefined,
        },
        animatedTransform,
        style,
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {loading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator color={isLightMode ? "#1A1A1A" : "#FFFFFF"} />
          {loadingText ? (
            <RNText
              style={[
                {
                  color: isLightMode ? "#1A1A1A" : "#FFFFFF",
                  fontWeight: "700",
                  fontSize: 16,
                  opacity: contentOpacity,
                },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {loadingText}
            </RNText>
          ) : null}
        </View>
      ) : (
        <>
          {leftIcon}
          <RNText
            style={[
              {
                color: isLightMode ? "#1A1A1A" : "#FFFFFF",
                fontWeight: "700",
                fontSize: 16,
                opacity: contentOpacity,
              },
              textStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </RNText>
          {rightIcon}
        </>
      )}
    </AnimatedPressable>
  );
};
