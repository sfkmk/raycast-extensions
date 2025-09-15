/**
 * Date and time formatting utilities for Craft extension
 * Supports custom date and time format patterns with year-aware display
 */

import { LOCALE_CONSTANTS } from "../constants";

interface TimeTokens {
  [key: string]: (date: Date) => string;
}

interface DateTokens {
  [key: string]: (date: Date) => string;
}

// Time formatting tokens
const TIME_TOKENS: TimeTokens = {
  // Hour tokens (24-hour)
  HH: (date: Date) => date.getHours().toString().padStart(2, "0"),
  H: (date: Date) => date.getHours().toString(),

  // Hour tokens (12-hour)
  hh: (date: Date) => {
    const hours = date.getHours() % 12 || 12;
    return hours.toString().padStart(2, "0");
  },
  h: (date: Date) => {
    const hours = date.getHours() % 12 || 12;
    return hours.toString();
  },

  // Minute tokens
  mm: (date: Date) => date.getMinutes().toString().padStart(2, "0"),
  m: (date: Date) => date.getMinutes().toString(),

  // Second tokens
  ss: (date: Date) => date.getSeconds().toString().padStart(2, "0"),
  s: (date: Date) => date.getSeconds().toString(),

  // AM/PM tokens
  A: (date: Date) => (date.getHours() >= 12 ? "PM" : "AM"),
  a: (date: Date) => (date.getHours() >= 12 ? "pm" : "am"),
};

// Date formatting tokens
const DATE_TOKENS: DateTokens = {
  // Year tokens
  yyyy: (date: Date) => date.getFullYear().toString(),
  yy: (date: Date) => date.getFullYear().toString().slice(-2),

  // Month tokens
  MMMM: (date: Date) => date.toLocaleDateString(LOCALE_CONSTANTS.DATE_FORMAT_LOCALE, { month: "long" }),
  MMM: (date: Date) => date.toLocaleDateString(LOCALE_CONSTANTS.DATE_FORMAT_LOCALE, { month: "short" }),
  MM: (date: Date) => (date.getMonth() + 1).toString().padStart(2, "0"),
  M: (date: Date) => (date.getMonth() + 1).toString(),

  // Day tokens
  dd: (date: Date) => date.getDate().toString().padStart(2, "0"),
  d: (date: Date) => date.getDate().toString(),

  // Weekday tokens
  EEEE: (date: Date) => date.toLocaleDateString(LOCALE_CONSTANTS.DATE_FORMAT_LOCALE, { weekday: "long" }),
  EEE: (date: Date) => date.toLocaleDateString(LOCALE_CONSTANTS.DATE_FORMAT_LOCALE, { weekday: "short" }),
};

/**
 * Format a time using a custom pattern
 * @param date - The date to format time from
 * @param pattern - The format pattern (e.g., "HH:mm", "h:mm A", "HH:mm:ss")
 * @returns The formatted time string
 */
export function formatTime(date: Date, pattern: string): string {
  let result = pattern;

  // Sort tokens by length (longest first) to avoid partial replacements
  const sortedTokens = Object.keys(TIME_TOKENS).sort((a, b) => b.length - a.length);

  for (const token of sortedTokens) {
    const regex = new RegExp(token, "g");
    result = result.replace(regex, TIME_TOKENS[token](date));
  }

  return result;
}

/**
 * Check if a date is in the current year
 * @param date - The date to check
 * @returns True if the date is in the current year
 */
function isCurrentYear(date: Date): boolean {
  return date.getFullYear() === new Date().getFullYear();
}

/**
 * Format a date using a custom pattern with year-aware logic
 * @param date - The date to format
 * @param pattern - The format pattern (e.g., "EEEE, MMMM d, yyyy", "dd.MMM.yyyy")
 * @param hideCurrentYear - Whether to hide the year for current year dates (default: true)
 * @returns The formatted date string
 */
export function formatDate(date: Date, pattern: string, hideCurrentYear = true): string {
  // Add null/undefined check for pattern
  if (!pattern) {
    pattern = "EEEE, MMMM d, yyyy"; // Default fallback pattern
  }

  let result = pattern;

  // If hiding current year and date is in current year, remove year from pattern
  if (hideCurrentYear && isCurrentYear(date)) {
    // Remove year tokens and associated separators
    result = result
      .replace(/,?\s*yyyy/g, "")
      .replace(/\.yyyy/g, "")
      .replace(/\/yyyy/g, "")
      .replace(/\s+yyyy/g, "")
      .replace(/yyyy\s*,?\s*/g, "");
  }

  // Create a single regex that matches all tokens, sorted by length (longest first)
  const sortedTokens = Object.keys(DATE_TOKENS).sort((a, b) => b.length - a.length);
  const tokenRegex = new RegExp(sortedTokens.join("|"), "g");

  // Replace all tokens in a single pass
  result = result.replace(tokenRegex, (match) => {
    const tokenFunction = DATE_TOKENS[match];
    return tokenFunction ? tokenFunction(date) : match;
  });

  // Clean up any double Spaces or leading/trailing separators
  result = result
    .replace(/\s+/g, " ")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();

  return result;
}

/**
 * Check if a string matches the ISO daily note pattern (YYYY.MM.DD)
 * @param text - The text to check
 * @returns True if the text matches the ISO pattern
 */
export function isISODatePattern(text: string): boolean {
  const isoPattern = /^\d{4}\.\d{2}\.\d{2}$/;
  return isoPattern.test(text);
}

/**
 * Parse an ISO date string (YYYY.MM.DD) to a Date object
 * @param isoDateString - The ISO date string to parse
 * @returns Date object or null if invalid
 */
export function parseISODate(isoDateString: string): Date | null {
  if (!isISODatePattern(isoDateString)) {
    return null;
  }

  const [year, month, day] = isoDateString.split(".").map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed

  // Validate the date
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

/**
 * Format a daily note title if it matches ISO pattern, otherwise return original
 * @param title - The title to potentially format
 * @param pattern - The format pattern to use
 * @param hideCurrentYear - Whether to hide the year for current year dates (default: true)
 * @returns Formatted date string or original title
 */
export function formatDailyNoteTitle(title: string, pattern: string, hideCurrentYear = true): string {
  const date = parseISODate(title);
  if (!date) {
    return title;
  }
  return formatDate(date, pattern, hideCurrentYear);
}

/**
 * Generate Craft's internal date format for daily notes (YYYY.MM.DD)
 * This format is used for the day:// link and database queries
 * @param date - The date to format
 * @returns The Craft internal date format string
 */
export function formatCraftInternalDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}.${month}.${day}`;
}

/**
 * Parse natural language date strings to Date objects
 * Supports common patterns like "today", "yesterday", "tomorrow", etc.
 * Lightweight implementation without external dependencies
 *
 * @param input - The natural language date string
 * @returns Date object or null if not parseable
 */
export function parseNaturalLanguageDate(input: string): Date | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const normalizedInput = input.toLowerCase().trim();
  const now = new Date();

  // Remove articles and prepositions
  const cleanInput = normalizedInput.replace(/^(on|the|at|in)\s+/, "");

  // Handle relative date patterns
  switch (cleanInput) {
    case "today":
    case "now":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());

    case "yesterday":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    case "tomorrow":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    default:
      break;
  }

  // Handle "X days ago" pattern
  const daysAgoMatch = cleanInput.match(/^(\d+)\s+days?\s+ago$/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  }

  // Handle "in X days" pattern
  const inDaysMatch = cleanInput.match(/^in\s+(\d+)\s+days?$/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  }

  // Handle weekday names (finds next occurrence)
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  const weekdayIndex = weekdays.indexOf(cleanInput);
  if (weekdayIndex !== -1) {
    const today = now.getDay();
    let daysAhead = weekdayIndex - today;

    // If the weekday is today or has passed this week, get next week's
    if (daysAhead <= 0) {
      daysAhead += 7;
    }

    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead);
  }

  // Handle "next [weekday]" pattern
  const nextWeekdayMatch = cleanInput.match(/^next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (nextWeekdayMatch) {
    const weekdayIndex = weekdays.indexOf(nextWeekdayMatch[1]);
    const today = now.getDay();
    let daysAhead = weekdayIndex - today + 7; // Always next week

    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead);
  }

  // Handle "last [weekday]" pattern
  const lastWeekdayMatch = cleanInput.match(/^last\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (lastWeekdayMatch) {
    const weekdayIndex = weekdays.indexOf(lastWeekdayMatch[1]);
    const today = now.getDay();
    let daysBehind = today - weekdayIndex;

    // If the weekday hasn't occurred this week, get last week's
    if (daysBehind <= 0) {
      daysBehind += 7;
    }

    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBehind);
  }

  // Handle simple date formats (dd.mm, dd/mm, mm/dd)
  const simpleDateMatch = cleanInput.match(/^(\d{1,2})[\.\/](\d{1,2})$/);
  if (simpleDateMatch) {
    const first = parseInt(simpleDateMatch[1], 10);
    const second = parseInt(simpleDateMatch[2], 10);

    // Assume dd.mm format (European style) to match Craft's format
    if (first <= 31 && second <= 12) {
      const date = new Date(now.getFullYear(), second - 1, first);

      // If the date has already passed this year, assume next year
      if (date < now) {
        date.setFullYear(now.getFullYear() + 1);
      }

      return date;
    }
  }

  // Handle month names with day (e.g., "January 15", "15 January")
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const monthShort = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  // Match "Month Day" or "Day Month" patterns
  const monthDayMatch = cleanInput.match(
    /^(?:(\d{1,2})\s+)?(?:(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))(?:\s+(\d{1,2}))?$/,
  );

  if (monthDayMatch) {
    const dayBefore = monthDayMatch[1] ? parseInt(monthDayMatch[1], 10) : null;
    const monthName = monthDayMatch[2];
    const dayAfter = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : null;

    const day = dayBefore || dayAfter || 1;
    let monthIndex = months.indexOf(monthName);

    if (monthIndex === -1) {
      monthIndex = monthShort.indexOf(monthName);
    }

    if (monthIndex !== -1 && day >= 1 && day <= 31) {
      const date = new Date(now.getFullYear(), monthIndex, day);

      // If the date has already passed this year, assume next year
      if (date < now) {
        date.setFullYear(now.getFullYear() + 1);
      }

      return date;
    }
  }

  return null;
}

/**
 * Enhanced date parser that tries multiple parsing strategies
 * First attempts ISO format, then natural language
 *
 * @param input - The date string to parse
 * @returns Date object or null if not parseable
 */
export function parseFlexibleDate(input: string): Date | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  // First try ISO date parsing
  const isoDate = parseISODate(input);
  if (isoDate) {
    return isoDate;
  }

  // Then try natural language parsing
  return parseNaturalLanguageDate(input);
}

// Time format examples for user reference
export const TIME_FORMAT_EXAMPLES = {
  "HH:mm": "14:30",
  "HH:mm:ss": "14:30:45",
  "h:mm A": "2:30 PM",
  "h:mm a": "2:30 pm",
  "H:mm": "14:30",
} as const;

// Date format examples for user reference
export const DATE_FORMAT_EXAMPLES = {
  "EEEE, MMMM d, yyyy": "Thursday, July 31, 2025",
  "dd.MMM.yyyy": "31.Jul.2025",
  "MM/dd/yyyy": "07/31/2025",
  "MMMM d, yyyy": "July 31, 2025",
  "EEE, MMM d": "Thu, Jul 31",
  "yyyy-MM-dd": "2025-07-31",
} as const;

// Natural language date parsing examples
export const NATURAL_DATE_EXAMPLES = {
  today: "Today's date",
  tomorrow: "Tomorrow's date",
  yesterday: "Yesterday's date",
  monday: "Next Monday",
  "next friday": "Friday of next week",
  "last tuesday": "Tuesday of last week",
  "3 days ago": "Three days in the past",
  "in 5 days": "Five days in the future",
  "15.03": "March 15th (current or next year)",
  "january 20": "January 20th (current or next year)",
  "20 december": "December 20th (current or next year)",
} as const;
