import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { dark, light, type ThemeColors } from "./tokens";
import { useStore } from "@/store/store";

interface Theme {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<Theme>({ colors: dark, isDark: true });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useStore((s) => s.state.preferences.theme);
  const value = useMemo(() => {
    const scheme = pref === "system" ? (system ?? "dark") : pref;
    const colors = scheme === "dark" ? dark : light;
    return { colors, isDark: scheme === "dark" };
  }, [pref, system]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
