import { Text } from "@/components/ui/Text";
import React from "react";
import { Pressable, View } from "react-native";

type DialButtonProps = {
  label: string;
  hint?: string;
  onPress?: () => void;
  testID?: string;
};

const DialButton: React.FC<DialButtonProps> = ({
  label,
  hint,
  onPress,
  testID,
}) => {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="flex-[0_0_32%] aspect-square items-center justify-center rounded-2xl bg-white dark:bg-[#0C111D] border border-gray-200 dark:border-gray-700 shadow-sm active:opacity-90"
    >
      <View className="items-center">
        <Text weight="bold" className="text-2xl text-gray-900 dark:text-gray-100">
          {label}
        </Text>
        {hint && (
          <Text size="sm" className="text-gray-500 dark:text-gray-400 mt-0.5">
            {hint}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

export default DialButton;
