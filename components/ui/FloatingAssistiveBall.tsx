import React, { useMemo, useRef } from "react";
import { Animated, PanResponder, Platform, Pressable, StyleSheet, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/core/theme/ThemeProvider";

type FloatingAssistiveBallProps = {
  onPress?: () => void;
  size?: number;
  bottomOffset?: number;
  rightOffset?: number;
};

export const FloatingAssistiveBall: React.FC<FloatingAssistiveBallProps> = ({
  onPress,
  size = 56,
  bottomOffset = 32,
  rightOffset = 24,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 6,
        onPanResponderGrant: () => {
          pan.setOffset({ x: (pan as any).x._value, y: (pan as any).y._value });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: () => {
          pan.flattenOffset();
        },
      }),
    [pan]
  );

  const ballStyle: ViewStyle = {
    position: "absolute",
    right: rightOffset,
    bottom: bottomOffset + insets.bottom,
    width: size,
    height: size,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    // subtle elevation/shadow
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
      },
      default: {},
    }),
  };

  return (
    <Animated.View style={[ballStyle, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]} {...panResponder.panHandlers}>
      <Pressable onPress={onPress} style={StyleSheet.absoluteFillObject} android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true }}>
        <MaterialIcons name="dialpad" size={24} color="#FFFFFF" style={{ alignSelf: "center", marginTop: (size - 24) / 2 }} />
      </Pressable>
    </Animated.View>
  );
};

