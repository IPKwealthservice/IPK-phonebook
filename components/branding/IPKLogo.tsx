import { memo } from "react";
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";

import { useTheme } from "@/core/theme/ThemeProvider";

type Props = {
  size?: number;
};

export const IPKLogo = memo(function IPKLogo({ size = 120 }: Props) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="ipkGradient" x1="8%" y1="0%" x2="92%" y2="100%">
          <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
          <Stop offset="100%" stopColor="#102DFF" stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Circle cx="60" cy="60" r="56" fill="url(#ipkGradient)" />
      <Circle cx="60" cy="60" r="48" fill="rgba(255, 255, 255, 0.08)" />
      <SvgText
        x="60"
        y="72"
        fill="#FFFFFF"
        fontSize="38"
        fontWeight="700"
        fontFamily="System"
        textAnchor="middle"
      >
        IPK
      </SvgText>
    </Svg>
  );
});
