import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { toDay, dayStart, addDays, endOfDay } from "@sprint/core";
import { Pressable } from "./Pressable";
import { Text } from "./Text";
import { Icon } from "./Icon";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["M", "T", "W", "T", "F", "S", "S"];

/** A compact month grid. No native pickers, consistent everywhere. */
export function CalendarPicker({ value, onChange, min }: { value?: number; onChange: (deadline: number) => void; min?: number }) {
  const { colors } = useTheme();
  const base = value ?? min ?? Date.now();
  const [cursor, setCursor] = useState(() => new Date(new Date(base).getFullYear(), new Date(base).getMonth(), 1));
  const minDay = toDay(min ?? Date.now());
  const selected = value !== undefined ? toDay(value) : undefined;

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out: Array<{ day?: string; n?: number }> = [];
    for (let i = 0; i < offset; i++) out.push({});
    for (let n = 1; n <= daysInMonth; n++) out.push({ day: toDay(new Date(cursor.getFullYear(), cursor.getMonth(), n, 12).getTime()), n });
    while (out.length % 7 !== 0) out.push({});
    return out;
  }, [cursor]);

  return (
    <View style={[styles.wrap, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} style={styles.nav} accessibilityRole="button" accessibilityLabel="Previous month">
          <Icon name="arrow-left" size={18} />
        </Pressable>
        <Text variant="bodyStrong">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </Text>
        <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} style={styles.nav} accessibilityRole="button" accessibilityLabel="Next month">
          <Icon name="arrow-right" size={18} />
        </Pressable>
      </View>
      <View style={styles.row}>
        {DOW.map((d, i) => (
          <Text key={i} variant="caption" tone="faint" align="center" style={styles.cell}>
            {d}
          </Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={styles.row}>
          {cells.slice(r * 7, r * 7 + 7).map((c, i) => {
            const disabled = !c.day || c.day < minDay;
            const isSel = c.day !== undefined && c.day === selected;
            const isToday = c.day === toDay(Date.now());
            return (
              <Pressable
                key={i}
                disabled={disabled}
                onPress={() => c.day && onChange(endOfDay(dayStart(c.day)))}
                style={[styles.cell, styles.dayCell, isSel ? { backgroundColor: colors.text } : null]}
                accessibilityRole="button"
                accessibilityLabel={c.day ? `${c.n} ${MONTHS[cursor.getMonth()]}` : undefined}
                accessibilityState={{ selected: isSel, disabled }}
              >
                {c.n ? (
                  <Text variant={isSel || isToday ? "smallStrong" : "small"} style={{ color: isSel ? colors.bg : disabled ? colors.textFaint : isToday ? colors.accent : colors.text }}>
                    {c.n}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.quick}>
        {[
          { label: "In 2 weeks", days: 14 },
          { label: "In a month", days: 30 },
          { label: "In 3 months", days: 90 },
        ].map((q) => (
          <Pressable key={q.label} onPress={() => onChange(endOfDay(dayStart(addDays(toDay(Date.now()), q.days))))} style={[styles.quickChip, { borderColor: colors.line }]} accessibilityRole="button">
            <Text variant="caption" tone="muted">
              {q.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: radius.lg, padding: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  nav: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row" },
  cell: { flex: 1, textAlign: "center", paddingVertical: 6 },
  dayCell: { alignItems: "center", justifyContent: "center", height: 40, borderRadius: radius.pill, marginVertical: 1 },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  quickChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
});
