import React from "react";
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { type as typeScale } from "@/theme/tokens";

type Variant = keyof typeof typeScale;
type Tone = "default" | "muted" | "faint" | "accent" | "success" | "inverse" | "danger";

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  align?: TextStyle["textAlign"];
  children?: React.ReactNode;
}

export function Text({ variant = "body", tone = "default", align, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const color =
    tone === "muted"
      ? colors.textMuted
      : tone === "faint"
        ? colors.textFaint
        : tone === "accent"
          ? colors.accentStrong
          : tone === "success"
            ? colors.successText
            : tone === "inverse"
              ? colors.bg
              : tone === "danger"
                ? colors.danger
                : colors.text;
  const base = typeScale[variant];
  return <RNText {...rest} style={[base, { color }, align ? { textAlign: align } : null, style]} maxFontSizeMultiplier={variant === "numeral" ? 1.2 : 1.6} />;
}
