import { useWindowDimensions } from "react-native";
import { breakpoints } from "@/theme/tokens";

export type Breakpoint = "phone" | "tablet" | "desktop" | "wide";

export function useBreakpoint(): { bp: Breakpoint; width: number; height: number; isDesktop: boolean; isPhone: boolean } {
  const { width, height } = useWindowDimensions();
  const bp: Breakpoint = width >= breakpoints.wide ? "wide" : width >= breakpoints.desktop ? "desktop" : width >= breakpoints.tablet ? "tablet" : "phone";
  return { bp, width, height, isDesktop: bp === "desktop" || bp === "wide", isPhone: bp === "phone" };
}
