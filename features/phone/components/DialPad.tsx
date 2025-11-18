import { MaterialIcons } from "@expo/vector-icons";
import { AnimatePresence, MotiView } from "moti";
import React from "react";
import { Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DialButton from "./DialButton";

type DialPadProps = {
  visible: boolean;
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  onCall: (val: string) => void;
};

const DialPad: React.FC<DialPadProps> = ({
  visible,
  value,
  onChange,
  onClose,
  onCall,
}) => {
  const insets = useSafeAreaInsets();
  const KEYS = [
    { l: "1", h: undefined },
    { l: "2", h: "ABC" },
    { l: "3", h: "DEF" },
    { l: "4", h: "GHI" },
    { l: "5", h: "JKL" },
    { l: "6", h: "MNO" },
    { l: "7", h: "PQRS" },
    { l: "8", h: "TUV" },
    { l: "9", h: "WXYZ" },
  ];

  const add = (d: string) => onChange(value + d);
  const back = () => onChange(value.slice(0, -1));

  return (
    <AnimatePresence>
      {visible && (
        <MotiView
          key="overlay"
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "timing", duration: 200 }}
          className="absolute inset-0"
        >
          <Pressable onPress={onClose} className="flex-1" />

          <MotiView
            key="sheet"
            from={{ opacity: 0, translateY: 50 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 50 }}
            transition={{ type: "timing", duration: 250 }}
            style={{ marginBottom: insets.bottom + 12 }}
            className="m-4 p-3 rounded-2xl bg-white dark:bg-[#1A2231] border border-gray-200 dark:border-gray-700 shadow-lg self-center w-[92%] max-w-[360]"
          >
            {/* Input for manual editing / clipboard */}
            <TextInput
              value={value}
              onChangeText={onChange}
              keyboardType="phone-pad"
              placeholder="Enter Number"
              placeholderTextColor="#9BA1A6"
              className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-base text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-black/20 mb-2.5"
            />

            {/* Keypad grid */}
            <View className="flex-row flex-wrap justify-between">
              {KEYS.map(({ l, h }) => (
                <View key={l} className="mb-3">
                  <DialButton label={l} hint={h} onPress={() => add(l)} />
                </View>
              ))}
              <View className="mb-3">
                <DialButton label="*" onPress={() => add("*")} />
              </View>
              <View className="mb-3">
                <DialButton label="0" hint="+" onPress={() => add("0")} />
              </View>
              <View className="mb-3">
                <DialButton label="#" onPress={() => add("#")} />
              </View>
            </View>

            {/* Bottom action row: close + call */}
            <View className="mt-3 flex-row items-center">
              <Pressable
                onPress={onClose}
                className="h-10 w-10 rounded-lg items-center justify-center border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0C111D] mr-3"
              >
                <MaterialIcons name="close" size={18} color="#9BA1A6" />
              </Pressable>
              <Pressable
                onPress={() => onCall(value)}
                className="flex-1 h-10 rounded-lg items-center justify-center bg-indigo-600"
              >
                <MaterialIcons name="call" size={20} color="#fff" />
              </Pressable>
            </View>
          </MotiView>
        </MotiView>
      )}
    </AnimatePresence>
  );
};

export default DialPad;
