import type { Millis, MissionCategory, Timeframe } from "../domain/types";
import { addDays, dayStart, DAY, endOfDay, toDay } from "../domain/time";
import type { Archetype, ParsedGoal } from "./types";

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  couple: 2,
  few: 3,
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MONTH_ABBR = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec"];
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_ABBR = ["sun", "mon", "tue", "tues", "wed", "weds", "thu", "thur", "thurs", "fri", "sat"];

function monthIndex(word: string): number {
  const full = MONTHS.indexOf(word);
  if (full >= 0) return full;
  const abbr = MONTH_ABBR.indexOf(word);
  if (abbr < 0) return -1;
  // "sept" sits between "sep" and "oct" in the abbreviation list.
  return abbr <= 8 ? abbr : abbr - 1;
}

function weekdayIndex(word: string): number {
  const full = WEEKDAYS.indexOf(word);
  if (full >= 0) return full;
  const map: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    tues: 2,
    wed: 3,
    weds: 3,
    thu: 4,
    thur: 4,
    thurs: 4,
    fri: 5,
    sat: 6,
  };
  return map[word] ?? -1;
}

function toNumber(word: string): number | undefined {
  const n = Number(word);
  if (!Number.isNaN(n)) return n;
  return NUMBER_WORDS[word];
}

interface DeadlineMatch {
  deadline: Millis;
  phrase: string;
  /** Text with the time phrase removed. */
  rest: string;
  timeframe: Timeframe;
}

const PREP = "(?:by|before|until|till|for|on|due|in time for)";
const LEAD = `(?:\\s*,?\\s*(?:${PREP})\\s+)`;

function endOfLocalDay(y: number, m: number, d: number): Millis {
  return endOfDay(new Date(y, m, d, 12, 0, 0, 0).getTime());
}

function nextOccurrence(month: number, day: number, now: Millis): Millis {
  const n = new Date(now);
  let year = n.getFullYear();
  let candidate = endOfLocalDay(year, month, day);
  if (candidate < now) candidate = endOfLocalDay(year + 1, month, day);
  return candidate;
}

function endOfMonth(year: number, month: number): Millis {
  return endOfLocalDay(year, month + 1, 0);
}

function timeframeFor(deadline: Millis, now: Millis): Timeframe {
  const days = Math.round((dayStart(toDay(deadline)) - dayStart(toDay(now))) / DAY) + 1;
  if (days <= 1) return "today";
  if (days <= 8) return "week";
  if (days <= 35) return "month";
  return "custom";
}

function strip(text: string, match: RegExpMatchArray): string {
  const start = match.index ?? 0;
  const end = start + match[0].length;
  return (text.slice(0, start) + " " + text.slice(end)).replace(/\s+/g, " ").trim();
}

/** Understands deadline phrases in a goal sentence. Local time, end of day. */
export function parseDeadline(text: string, now: Millis): DeadlineMatch | undefined {
  const t = text.toLowerCase();
  const today = toDay(now);
  const n = new Date(now);
  const year = n.getFullYear();

  const make = (deadline: Millis, m: RegExpMatchArray, phrase?: string): DeadlineMatch => ({
    deadline,
    phrase: phrase ?? m[0].trim(),
    rest: strip(text, m),
    timeframe: timeframeFor(deadline, now),
  });

  let m: RegExpMatchArray | null;

  // "by christmas", "before new year", "for easter"
  const holidays: Array<[RegExp, () => Millis, string]> = [
    [/(christmas|xmas)/, () => nextOccurrence(11, 25, now), "Christmas"],
    [/new year'?s? ?(?:eve|day)?/, () => endOfLocalDay(year + (now > endOfLocalDay(year, 0, 1) ? 1 : 0), 0, 1), "New Year"],
    [/halloween/, () => nextOccurrence(9, 31, now), "Halloween"],
    [/valentine'?s?(?: day)?/, () => nextOccurrence(1, 14, now), "Valentine's Day"],
    [/thanksgiving/, () => nextOccurrence(10, 26, now), "Thanksgiving"],
    [/(?:the )?summer/, () => nextOccurrence(5, 21, now), "summer"],
    [/(?:the )?(?:autumn|fall)/, () => nextOccurrence(8, 22, now), "autumn"],
    [/(?:the )?winter/, () => nextOccurrence(11, 21, now), "winter"],
    [/(?:the )?spring/, () => nextOccurrence(2, 20, now), "spring"],
  ];
  for (const [re, fn, label] of holidays) {
    m = t.match(new RegExp(`${LEAD}${re.source}\\b`));
    if (m) return make(fn(), m, label);
  }

  // "by the end of the month / week / year / today / day"
  m = t.match(new RegExp(`${LEAD}(?:the )?end of (?:the |this )?(day|today|week|month|year)\\b`));
  if (m) {
    const unit = m[1] ?? "";
    if (unit === "day" || unit === "today") return make(endOfDay(now), m, "end of today");
    if (unit === "week") {
      const dow = n.getDay();
      const toSunday = dow === 0 ? 0 : 7 - dow;
      return make(endOfDay(dayStart(addDays(today, toSunday))), m, "end of the week");
    }
    if (unit === "month") return make(endOfMonth(year, n.getMonth()), m, "end of the month");
    return make(endOfLocalDay(year, 11, 31), m, "end of the year");
  }

  // "by the end of january", "by end of jan"
  m = t.match(new RegExp(`${LEAD}(?:the )?end of (${MONTHS.join("|")}|${MONTH_ABBR.join("|")})\\b`));
  if (m) {
    const mi = monthIndex(m[1] ?? "");
    const y = mi < n.getMonth() ? year + 1 : year;
    return make(endOfMonth(y, mi), m, `end of ${MONTHS[mi]}`);
  }

  // "by tomorrow", "by tonight", "today"
  m = t.match(new RegExp(`${LEAD}(tomorrow|tonight|today)\\b`));
  if (m) {
    const w = m[1];
    if (w === "tomorrow") return make(endOfDay(dayStart(addDays(today, 1))), m, "tomorrow");
    return make(endOfDay(now), m, w === "tonight" ? "tonight" : "today");
  }
  m = t.match(/\b(tomorrow|tonight|today)\b/);
  if (m) {
    const w = m[1];
    if (w === "tomorrow") return make(endOfDay(dayStart(addDays(today, 1))), m, "tomorrow");
    return make(endOfDay(now), m, w === "tonight" ? "tonight" : "today");
  }

  // "by friday", "for next monday", "this thursday"
  m = t.match(new RegExp(`${LEAD}?(?:(next|this)\\s+)?(${WEEKDAYS.join("|")}|${WEEKDAY_ABBR.join("|")})\\b`));
  if (m && (m[0].match(new RegExp(PREP)) || m[1])) {
    const target = weekdayIndex(m[2] ?? "");
    const dow = n.getDay();
    let delta: number;
    if (m[1] === "next") {
      // "next Friday" = the Friday of next week (Monday–Sunday).
      const toNextMonday = dow === 0 ? 1 : 8 - dow;
      delta = toNextMonday + ((target + 6) % 7);
    } else {
      delta = (target - dow + 7) % 7;
    }
    const day = addDays(today, delta);
    const label = WEEKDAYS[target] ?? "";
    return make(endOfDay(dayStart(day)), m, label.charAt(0).toUpperCase() + label.slice(1));
  }

  // "by 15 december", "by december 15th", "by dec 3 2027"
  const monthRe = `(${MONTHS.join("|")}|${MONTH_ABBR.join("|")})`;
  m = t.match(new RegExp(`${LEAD}(?:the )?(\\d{1,2})(?:st|nd|rd|th)?(?: of)? ${monthRe}(?: (\\d{4}))?\\b`));
  if (m) {
    const d = Number(m[1]);
    const mi = monthIndex(m[2] ?? "");
    const y = m[3] ? Number(m[3]) : undefined;
    const deadline = y !== undefined ? endOfLocalDay(y, mi, d) : nextOccurrence(mi, d, now);
    return make(deadline, m, `${d} ${MONTHS[mi]}`);
  }
  m = t.match(new RegExp(`${LEAD}${monthRe} (?:the )?(\\d{1,2})(?:st|nd|rd|th)?(?:,? (\\d{4}))?\\b`));
  if (m) {
    const mi = monthIndex(m[1] ?? "");
    const d = Number(m[2]);
    const y = m[3] ? Number(m[3]) : undefined;
    const deadline = y !== undefined ? endOfLocalDay(y, mi, d) : nextOccurrence(mi, d, now);
    return make(deadline, m, `${d} ${MONTHS[mi]}`);
  }

  // "by december" / "before march" => start of that month; "in december" => end of it
  m = t.match(new RegExp(`\\s*,?\\s*(by|before|until|till|in|during)\\s+(?:early |mid |late )?${monthRe}\\b`));
  if (m) {
    const prep = m[1];
    const mi = monthIndex(m[2] ?? "");
    const y = mi < n.getMonth() || (mi === n.getMonth() && prep !== "in" && prep !== "during") ? year + 1 : year;
    const deadline = prep === "in" || prep === "during" ? endOfMonth(y, mi) : endOfLocalDay(y, mi, 1);
    const label = MONTHS[mi] ?? "";
    return make(deadline, m, label.charAt(0).toUpperCase() + label.slice(1));
  }

  // "in three weeks", "within 2 months", "over the next 10 days", "in a month"
  m = t.match(
    /\s*,?\s*(?:in|within|over|during|for)(?: the)?(?: next)?\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|couple of|few)\s+(day|days|week|weeks|month|months|year|years)\b/,
  );
  if (m) {
    const count = toNumber((m[1] ?? "").replace(" of", "")) ?? 1;
    const unit = m[2] ?? "";
    let deadline: Millis;
    if (unit.startsWith("day")) deadline = endOfDay(dayStart(addDays(today, count)));
    else if (unit.startsWith("week")) deadline = endOfDay(dayStart(addDays(today, count * 7)));
    else if (unit.startsWith("month")) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + count);
      deadline = endOfDay(d.getTime());
    } else {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() + count);
      deadline = endOfDay(d.getTime());
    }
    const unitLabel = count === 1 ? unit.replace(/s$/, "") : unit.endsWith("s") ? unit : `${unit}s`;
    return make(deadline, m, `${count} ${unitLabel}`);
  }

  // "in the next month", "over the next week", "within the next year"
  m = t.match(/\s*,?\s*(?:in|within|over|during)\s+the\s+next\s+(day|week|month|year)\b/);
  if (m) {
    const unit = m[1] ?? "";
    let deadline: Millis;
    if (unit === "day") deadline = endOfDay(dayStart(addDays(today, 1)));
    else if (unit === "week") deadline = endOfDay(dayStart(addDays(today, 7)));
    else {
      const d = new Date(now);
      if (unit === "month") d.setMonth(d.getMonth() + 1);
      else d.setFullYear(d.getFullYear() + 1);
      deadline = endOfDay(d.getTime());
    }
    return make(deadline, m, `1 ${unit}`);
  }

  // "this week", "next month", "this weekend", "next year"
  m = t.match(/\s*,?\s*(?:by |before |until |over )?(this|next)\s+(week|weekend|month|year)\b/);
  if (m) {
    const which = m[1];
    const unit = m[2];
    const dow = n.getDay();
    if (unit === "week" || unit === "weekend") {
      const toSunday = dow === 0 ? 0 : 7 - dow;
      const extra = which === "next" ? 7 : 0;
      return make(endOfDay(dayStart(addDays(today, toSunday + extra))), m, `${which} ${unit}`);
    }
    if (unit === "month") {
      const mi = n.getMonth() + (which === "next" ? 1 : 0);
      return make(endOfMonth(year, mi), m, `${which} month`);
    }
    return make(endOfLocalDay(year + (which === "next" ? 1 : 0), 11, 31), m, `${which} year`);
  }

  return undefined;
}

interface ArchetypeRule {
  archetype: Archetype;
  category: MissionCategory;
  patterns: RegExp[];
}

const RULES: ArchetypeRule[] = [
  { archetype: "dissertation", category: "learning", patterns: [/\b(dissertation|thesis)\b/] },
  { archetype: "exam", category: "learning", patterns: [/\b(exam|exams|test|certification|certificate|revise|revision|study for|driving theory|bar exam)\b/] },
  { archetype: "presentation", category: "work", patterns: [/\b(presentation|pitch deck|pitch|talk|speech|keynote|slides|deck|webinar|lecture)\b/] },
  { archetype: "website", category: "work", patterns: [/\b(website|web site|landing page|homepage|portfolio site|webpage|blog)\b/] },
  { archetype: "app", category: "work", patterns: [/\b(app|application|software|saas|mvp|prototype|product|plugin|extension|game)\b/] },
  { archetype: "book", category: "creative", patterns: [/\b(book|novel|memoir|manuscript|ebook|e-book|short story collection)\b/] },
  { archetype: "writing", category: "creative", patterns: [/\b(article|essay|blog post|newsletter|screenplay|script|short story|poem|report|white ?paper|proposal)\b/] },
  { archetype: "running", category: "health", patterns: [/\b(run|running|runner|5k|10k|marathon|half marathon|jog|jogging|couch to 5k|park ?run)\b/] },
  { archetype: "strength", category: "health", patterns: [/\b(strength|muscle|lift|lifting|weights|gym|bulk|push ?ups?|pull ?ups?)\b/] },
  { archetype: "fitness", category: "health", patterns: [/\b(fit|fitter|fitness|healthy|healthier|exercise|workout|lose weight|weight loss|in shape|shape|yoga|swim|swimming|cycle|cycling|bike)\b/] },
  { archetype: "language", category: "learning", patterns: [/\b(spanish|french|german|italian|japanese|chinese|mandarin|portuguese|korean|arabic|russian|dutch|hindi|greek|language)\b/] },
  {
    archetype: "skill",
    category: "learning",
    patterns: [/\b(learn|learning|course|guitar|piano|coding|code|programming|python|javascript|photography|drawing|paint|painting|chess|cook|cooking|dance|sing|singing|knit|woodwork)\b/],
  },
  { archetype: "finance", category: "finance", patterns: [/\b(finances?|budget|budgeting|money|savings?|save|debt|tax|taxes|invest|investing|pension|retirement|mortgage)\b/] },
  {
    archetype: "home",
    category: "home",
    patterns: [/\b(organise|organize|organised|organized|declutter|tidy|clean|house|home|flat|apartment|garage|kitchen|bedroom|wardrobe|closet|garden|move house|moving|renovate|decorate|room)\b/],
  },
  { archetype: "business", category: "work", patterns: [/\b(business|company|startup|start-up|side hustle|freelance|freelancing|shop|store|brand|etsy|agency|consultancy|clients?)\b/] },
  { archetype: "job", category: "work", patterns: [/\b(job|cv|resume|résumé|career|interview|promotion|linkedin|hired)\b/] },
  { archetype: "event", category: "personal", patterns: [/\b(wedding|party|birthday|event|trip|holiday|vacation|travel|christmas dinner|conference|festival)\b/] },
];

const LEADERS = [
  /^(i'?d (really )?like to|i would (really )?like to|i (really )?want to|i (really )?need to|i'?ve got to|i have to|i'?m going to|i gotta|i must|i should|i want|i need|help me(?: to)?|let'?s|i'?m trying to|i am trying to|my goal is to|goal:|i plan to|i'?d love to|i hope to|i aim to|i intend to|i wanna)\s+/i,
  /^(to|please)\s+/i,
];

function cleanObjective(text: string): string {
  let s = text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .trim();
  for (let i = 0; i < 2; i++) {
    for (const re of LEADERS) s = s.replace(re, "");
  }
  s = s.replace(/^(i'?ve got|i have|i'?ve)\s+(an?|the|my)\s+/i, "prepare for my ");
  s = s.replace(/\s+(and|but|so)$/, "").trim();
  s = s.replace(/\s*,\s*$/, "");
  if (!s) s = text.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function detectArchetype(text: string): { archetype: Archetype; category: MissionCategory; strength: number } {
  const t = text.toLowerCase();
  let best: { archetype: Archetype; category: MissionCategory; strength: number } = {
    archetype: "generic",
    category: "personal",
    strength: 0,
  };
  for (const rule of RULES) {
    for (const re of rule.patterns) {
      if (re.test(t)) {
        const strength = 1;
        if (strength > best.strength) best = { archetype: rule.archetype, category: rule.category, strength };
        break;
      }
    }
    if (best.strength > 0) break;
  }
  return best;
}

export function parseGoal(text: string, now: Millis): ParsedGoal {
  const raw = text.trim().replace(/\s+/g, " ");
  const deadline = parseDeadline(raw, now);
  const withoutTime = deadline ? deadline.rest : raw;
  const objective = cleanObjective(withoutTime);
  const { archetype, category, strength } = detectArchetype(withoutTime);
  const words = objective.split(" ").filter(Boolean).length;
  let confidence = strength > 0 ? 0.8 : 0.45;
  if (words <= 1) confidence -= 0.25;
  if (words >= 4) confidence += 0.1;
  confidence = Math.max(0.1, Math.min(1, confidence));

  const parsed: ParsedGoal = {
    raw,
    objective,
    archetype,
    category,
    confidence,
  };
  if (deadline) {
    parsed.deadline = deadline.deadline;
    parsed.deadlinePhrase = deadline.phrase;
    parsed.timeframeHint = deadline.timeframe;
  }
  return parsed;
}
