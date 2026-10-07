import type { TextStyle } from "react-native";

/**
 * Sprint design tokens.
 *
 * One accent (ember) carries energy. Everything else is restrained: warm
 * paper in light mode, deep ink in dark mode, generous whitespace, rings.
 */

export const palette = {
  ember: "#FF6B3D",
  emberDeep: "#F05A28",
  emberLight: "#FFB36B",
  mint: "#3DDC97",
  mintDeep: "#1FA971",
  sky: "#5BA8FF",
  skyDeep: "#2F7FE0",
  gold: "#F2C14E",
  rose: "#F26D85",
  teal: "#4FD1C5",
  sand: "#C8A27A",
  stone: "#9AA3B2",
};

export interface ThemeColors {
  scheme: "light" | "dark";
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  line: string;
  lineStrong: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  info: string;
  warning: string;
  ringTrack: string;
  ringGlow: string;
  overlay: string;
  danger: string;
}

export const dark: ThemeColors = {
  scheme: "dark",
  bg: "#0B0C10",
  bgElevated: "#111318",
  surface: "#15181F",
  surfaceStrong: "#1D2129",
  text: "#F4F3EF",
  textMuted: "#A3A6B1",
  textFaint: "#6B6F7B",
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.14)",
  accent: palette.ember,
  accentText: "#120804",
  accentSoft: "rgba(255,107,61,0.14)",
  success: palette.mint,
  successSoft: "rgba(61,220,151,0.14)",
  info: palette.sky,
  warning: palette.gold,
  ringTrack: "rgba(255,255,255,0.07)",
  ringGlow: "rgba(255,107,61,0.28)",
  overlay: "rgba(5,6,9,0.72)",
  danger: "#FF6E6E",
};

export const light: ThemeColors = {
  scheme: "light",
  bg: "#F7F6F2",
  bgElevated: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceStrong: "#EFEDE7",
  text: "#15161A",
  textMuted: "#62656F",
  textFaint: "#9A9DA6",
  line: "rgba(20,22,26,0.08)",
  lineStrong: "rgba(20,22,26,0.14)",
  accent: palette.emberDeep,
  accentText: "#FFFFFF",
  accentSoft: "rgba(240,90,40,0.12)",
  success: palette.mintDeep,
  successSoft: "rgba(31,169,113,0.12)",
  info: palette.skyDeep,
  warning: "#C9961D",
  ringTrack: "rgba(20,22,26,0.07)",
  ringGlow: "rgba(240,90,40,0.22)",
  overlay: "rgba(20,22,26,0.5)",
  danger: "#D64545",
};

export const categoryColor: Record<string, string> = {
  work: palette.ember,
  health: palette.mint,
  personal: palette.sky,
  learning: palette.gold,
  creative: palette.rose,
  finance: palette.teal,
  home: palette.sand,
  other: palette.stone,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const fonts = {
  sans: "Manrope_500Medium",
  sansRegular: "Manrope_400Regular",
  sansSemibold: "Manrope_600SemiBold",
  sansBold: "Manrope_700Bold",
  sansExtrabold: "Manrope_800ExtraBold",
  sansLight: "Manrope_300Light",
  sansExtralight: "Manrope_200ExtraLight",
  serif: "InstrumentSerif_400Regular",
  serifItalic: "InstrumentSerif_400Regular_Italic",
} as const;

export const type = {
  display: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 44, letterSpacing: -0.5 },
  displayItalic: { fontFamily: fonts.serifItalic, fontSize: 40, lineHeight: 44, letterSpacing: -0.5 },
  title: { fontFamily: fonts.sansBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.sansBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  subheading: { fontFamily: fonts.sansSemibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.sansSemibold, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: fonts.sansSemibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 17 },
  label: { fontFamily: fonts.sansBold, fontSize: 11.5, lineHeight: 14, letterSpacing: 1.6, textTransform: "uppercase" },
  numeral: { fontFamily: fonts.sansExtralight, fontSize: 72, lineHeight: 80, letterSpacing: -2, fontVariant: ["tabular-nums"] },
} satisfies Record<string, TextStyle>;

export const breakpoints = { tablet: 720, desktop: 1040, wide: 1400 } as const;
