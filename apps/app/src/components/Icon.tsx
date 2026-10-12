import React from "react";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";

export type IconName =
  | "play"
  | "pause"
  | "check"
  | "close"
  | "plus"
  | "mic"
  | "arrow-right"
  | "arrow-left"
  | "chevron-right"
  | "chevron-down"
  | "settings"
  | "home"
  | "missions"
  | "progress"
  | "sparkle"
  | "clock"
  | "calendar"
  | "more"
  | "skip"
  | "split"
  | "bolt"
  | "ring"
  | "edit"
  | "trash"
  | "archive"
  | "pause-circle"
  | "bell"
  | "moon"
  | "sun"
  | "shield";

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** A small, consistent line icon set drawn for Sprint. No emoji, no clutter. */
export function Icon({ name, size = 20, color, strokeWidth = 1.8 }: IconProps) {
  const { colors } = useTheme();
  const c = color ?? colors.text;
  const p = { stroke: c, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const box = "0 0 24 24";
  switch (name) {
    case "play":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Path d="M8 5.5v13l10-6.5z" fill={c} stroke={c} strokeWidth={1.2} strokeLinejoin="round" />
        </Svg>
      );
    case "pause":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Rect x={6.5} y={5} width={3.5} height={14} rx={1.2} fill={c} />
          <Rect x={14} y={5} width={3.5} height={14} rx={1.2} fill={c} />
        </Svg>
      );
    case "check":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Polyline points="5 12.5 10 17.5 19 7" {...p} strokeWidth={strokeWidth + 0.4} />
        </Svg>
      );
    case "close":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Line x1={6} y1={6} x2={18} y2={18} {...p} />
          <Line x1={18} y1={6} x2={6} y2={18} {...p} />
        </Svg>
      );
    case "plus":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Line x1={12} y1={5} x2={12} y2={19} {...p} />
          <Line x1={5} y1={12} x2={19} y2={12} {...p} />
        </Svg>
      );
    case "mic":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Rect x={9} y={3} width={6} height={11} rx={3} {...p} />
          <Path d="M5.5 11a6.5 6.5 0 0 0 13 0" {...p} />
          <Line x1={12} y1={17.5} x2={12} y2={21} {...p} />
        </Svg>
      );
    case "arrow-right":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Line x1={5} y1={12} x2={19} y2={12} {...p} />
          <Polyline points="13 6 19 12 13 18" {...p} />
        </Svg>
      );
    case "arrow-left":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Line x1={19} y1={12} x2={5} y2={12} {...p} />
          <Polyline points="11 6 5 12 11 18" {...p} />
        </Svg>
      );
    case "chevron-right":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Polyline points="9 6 15 12 9 18" {...p} />
        </Svg>
      );
    case "chevron-down":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Polyline points="6 9 12 15 18 9" {...p} />
        </Svg>
      );
    case "settings":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Circle cx={12} cy={12} r={3} {...p} />
          <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" {...p} />
        </Svg>
      );
    case "home":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Circle cx={12} cy={12} r={3} fill={c} />
        </Svg>
      );
    case "missions":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Circle cx={8} cy={8} r={4.5} {...p} />
          <Circle cx={16.5} cy={15.5} r={4.5} {...p} />
        </Svg>
      );
    case "progress":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Path d="M4 17c3-6 6-8 8-8s5 3 8-6" {...p} />
          <Line x1={4} y1={20.5} x2={20} y2={20.5} {...p} strokeOpacity={0.4} />
        </Svg>
      );
    case "sparkle":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Path d="M12 3c.6 4.5 3.5 7.4 8 8-4.5.6-7.4 3.5-8 8-.6-4.5-3.5-7.4-8-8 4.5-.6 7.4-3.5 8-8z" fill={c} />
        </Svg>
      );
    case "clock":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Polyline points="12 7.5 12 12.5 15.5 14.5" {...p} />
        </Svg>
      );
    case "calendar":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={3} {...p} />
          <Line x1={3.5} y1={9.5} x2={20.5} y2={9.5} {...p} />
          <Line x1={8} y1={3} x2={8} y2={6.5} {...p} />
          <Line x1={16} y1={3} x2={16} y2={6.5} {...p} />
        </Svg>
      );
    case "more":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Circle cx={6} cy={12} r={1.6} fill={c} />
          <Circle cx={12} cy={12} r={1.6} fill={c} />
          <Circle cx={18} cy={12} r={1.6} fill={c} />
        </Svg>
      );
    case "skip":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Path d="M6 6l8 6-8 6z" fill={c} />
          <Line x1={17.5} y1={6} x2={17.5} y2={18} {...p} />
        </Svg>
      );
    case "split":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Path d="M5 12h4l3-5h7M9 12l3 5h7" {...p} />
          <Polyline points="16 4 19 7 16 10" {...p} />
          <Polyline points="16 14 19 17 16 20" {...p} />
        </Svg>
      );
    case "bolt":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" fill={c} />
        </Svg>
      );
    case "ring":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Circle cx={12} cy={12} r={8} {...p} strokeWidth={2.6} />
        </Svg>
      );
    case "edit":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z" {...p} />
          <Line x1={13.5} y1={8.5} x2={16.5} y2={11.5} {...p} />
        </Svg>
      );
    case "trash":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Path d="M5 7h14M9.5 7V4.5h5V7M7 7l.8 13h8.4L17 7" {...p} />
        </Svg>
      );
    case "archive":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Rect x={3.5} y={4} width={17} height={5} rx={1.5} {...p} />
          <Path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4" {...p} />
        </Svg>
      );
    case "pause-circle":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Line x1={10} y1={9} x2={10} y2={15} {...p} strokeWidth={2.2} />
          <Line x1={14} y1={9} x2={14} y2={15} {...p} strokeWidth={2.2} />
        </Svg>
      );
    case "bell":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" {...p} />
          <Path d="M10 20a2 2 0 0 0 4 0" {...p} />
        </Svg>
      );
    case "moon":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" {...p} />
        </Svg>
      );
    case "sun":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Circle cx={12} cy={12} r={4} {...p} />
          <Path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" {...p} />
        </Svg>
      );
    case "shield":
      return (
        <Svg width={size} height={size} viewBox={box}>
          <Path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z" {...p} />
        </Svg>
      );
    default:
      return null;
  }
}
