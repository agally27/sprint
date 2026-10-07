import type { Day, Millis } from "./types";

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar day for a timestamp. */
export function toDay(at: Millis): Day {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight at the start of the given day. */
export function dayStart(day: Day): Millis {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0).getTime();
}

export function startOfDay(at: Millis): Millis {
  return dayStart(toDay(at));
}

export function endOfDay(at: Millis): Millis {
  return startOfDay(at) + DAY - 1;
}

export function addDays(day: Day, n: number): Day {
  const d = new Date(dayStart(day));
  d.setDate(d.getDate() + n);
  return toDay(d.getTime());
}

/** Whole calendar days from a to b (b − a). Negative when b is earlier. */
export function daysBetween(a: Day, b: Day): number {
  return Math.round((dayStart(b) - dayStart(a)) / DAY);
}

/** Days remaining until a deadline, counting today as 1 when the deadline is today. */
export function daysUntil(deadline: Millis, now: Millis): number {
  return daysBetween(toDay(now), toDay(deadline)) + 1;
}

export function isSameDay(a: Millis, b: Millis): boolean {
  return toDay(a) === toDay(b);
}

export function minutesBetween(a: Millis, b: Millis): number {
  return (b - a) / MINUTE;
}

/** "mm:ss" or "h:mm:ss" for the dial. */
export function formatClock(ms: Millis): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Human duration: "20 min", "1 h 30 min", "2 h". */
export function formatMinutes(min: number): string {
  const whole = Math.round(min);
  if (whole < 60) return `${whole} min`;
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatDeadline(deadline: Millis, now: Millis): string {
  const days = daysUntil(deadline, now);
  if (days < 0) return `${Math.abs(days) + 1} days past`;
  if (days === 1) return "Today";
  if (days === 2) return "Tomorrow";
  if (days <= 14) return `${days - 1} days left`;
  const d = new Date(deadline);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

/** Keeps time moving forward even if the device clock jumps backwards. */
export function monotonic(previous: Millis, now: Millis): Millis {
  return now < previous ? previous : now;
}

/** Hour-of-day check for quiet hours like 22:00–08:00. */
export function isWithinQuietHours(at: Millis, start: string, end: string): boolean {
  const d = new Date(at);
  const minutes = d.getHours() * 60 + d.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = (sh ?? 0) * 60 + (sm ?? 0);
  const e = (eh ?? 0) * 60 + (em ?? 0);
  if (s === e) return false;
  if (s < e) return minutes >= s && minutes < e;
  return minutes >= s || minutes < e;
}
