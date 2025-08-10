import parser from "any-date-parser";
import nlp from "compromise";
import datePlugin from "compromise-dates";
import * as chrono from "chrono-node";
import { de, fr, es } from "chrono-node";
import { ALL_MONTH_MAPPINGS, getLanguageConfig } from "./locales/languages";
import { LanguageConfig } from "./locales/types";
import { getPreferredLanguageFallbackChain, getSupportedLanguagesFromPreferences } from "../preferences";
import { PARSING_CONSTANTS, LOCALE_CONSTANTS } from "../constants";

// Initialize compromise with dates plugin
nlp.plugin(datePlugin);

// Performance cache for expensive operations
const parseCache = {
  supportedLanguages: null as string[] | null,
  languageConfigs: new Map<string, LanguageConfig | null>(),
  fallbackChains: new Map<string, string[]>(),
  lastCacheTime: 0,
  cacheTimeout: 30000, // Reduced from PARSING_CONSTANTS.CACHE_TIMEOUT_MS for faster preference updates
};

// Clear cache when it's stale
function clearCacheIfStale(): void {
  const now = Date.now();
  if (now - parseCache.lastCacheTime > parseCache.cacheTimeout) {
    forceClearCache();
  }
}

// Force clear all cached data (useful when preferences change)
function forceClearCache(): void {
  parseCache.supportedLanguages = null;
  parseCache.languageConfigs.clear();
  parseCache.fallbackChains.clear();
  parseCache.lastCacheTime = Date.now();
}

/**
 * Clear the multilingual date parser cache
 * Call this when language preferences change to ensure immediate effect
 */
export function clearMultilingualDateParserCache(): void {
  forceClearCache();
}

// Get cached supported languages
function getCachedSupportedLanguages(): string[] {
  clearCacheIfStale();
  if (!parseCache.supportedLanguages) {
    parseCache.supportedLanguages = getSupportedLanguagesFromPreferences();
  }
  return parseCache.supportedLanguages;
}

// Get cached language config
function getCachedLanguageConfig(language: string): LanguageConfig | null {
  clearCacheIfStale();
  if (!parseCache.languageConfigs.has(language)) {
    parseCache.languageConfigs.set(language, getLanguageConfig(language));
  }
  return parseCache.languageConfigs.get(language) || null;
}

// Get cached fallback chain
function getCachedFallbackChain(locale?: string): string[] {
  clearCacheIfStale();
  const key = locale || "default";
  if (!parseCache.fallbackChains.has(key)) {
    // Always use user preferences, not hardcoded fallbacks
    const chain = getPreferredLanguageFallbackChain();
    parseCache.fallbackChains.set(key, chain);
  }
  return parseCache.fallbackChains.get(key) || [];
}

/**
 * Multilingual Date Parser for Craft Extension
 *
 * Provides comprehensive date parsing by combining multiple strategies:
 * 1. Manual Patterns (highest confidence) - ISO, European formats
 * 2. any-date-parser (high confidence) - formatted dates, basic relative dates
 * 3. compromise-dates (medium confidence) - complex English natural language
 * 4. chrono-node (medium confidence) - multilingual natural language
 *
 * Supports 10+ languages including English, German, French, Spanish, Dutch, Russian, Japanese.
 * Context-aware parsing for search (current year bias) vs daily notes (natural parsing).
 */

export interface DateParsingOptions {
  referenceDate?: Date;
  forwardDate?: boolean;
  currentYearBias?: boolean;
  locale?: string; // Now accepts language code (e.g., 'en', 'de') instead of full locale
}

export interface DateParsingResult {
  date: Date;
  method: "any-date-parser" | "compromise-dates" | "chrono-node" | "manual-patterns";
  confidence: "high" | "medium" | "low";
}

/**
 * Comprehensive multilingual date parser that combines multiple parsing strategies
 * for maximum compatibility and user experience.
 */
export class MultilingualDateParser {
  /**
   * Parse a date string using multiple strategies for maximum compatibility
   */
  static parseDate(text: string, options: DateParsingOptions = {}): DateParsingResult | null {
    const { referenceDate = new Date(), forwardDate = false, currentYearBias = false, locale } = options;

    // Get language configuration for better parsing
    // Use preferences to determine supported languages
    const supportedLanguages = getCachedSupportedLanguages();
    const preferredLanguage = locale || supportedLanguages[0] || LOCALE_CONSTANTS.FALLBACK_LANGUAGE;
    const languageConfig = getCachedLanguageConfig(preferredLanguage);

    const trimmed = text.trim();
    const currentYear = referenceDate.getFullYear();

    // Strategy 1: Manual patterns for predictable formats
    const manualResult = this.tryManualPatterns(trimmed, referenceDate, currentYear, currentYearBias);
    if (manualResult) {
      return {
        date: manualResult,
        method: "manual-patterns",
        confidence: "high",
      };
    }

    // Strategy 2: any-date-parser for formatted dates and basic relative dates
    const anyDateResult = this.tryAnyDateParser(trimmed, preferredLanguage);
    if (anyDateResult) {
      const processedDate = this.applyDateBias(anyDateResult, trimmed, referenceDate, forwardDate, currentYearBias);
      return {
        date: processedDate,
        method: "any-date-parser",
        confidence: "high",
      };
    }

    // Strategy 3: compromise-dates for complex English natural language
    const compromiseResult = this.tryCompromiseDates(trimmed, referenceDate);
    if (compromiseResult) {
      return {
        date: compromiseResult,
        method: "compromise-dates",
        confidence: "medium",
      };
    }

    // Strategy 4: chrono-node for multilingual natural language
    const chronoResult = this.tryChronoNode(
      trimmed,
      referenceDate,
      forwardDate,
      preferredLanguage,
      languageConfig || undefined
    );
    if (chronoResult) {
      const processedDate = this.applyDateBias(chronoResult, trimmed, referenceDate, forwardDate, currentYearBias);
      return {
        date: processedDate,
        method: "chrono-node",
        confidence: "medium",
      };
    }

    return null;
  }

  /**
   * Try manual pattern matching for predictable formats
   */
  private static tryManualPatterns(
    text: string,
    referenceDate: Date,
    currentYear: number,
    currentYearBias: boolean
  ): Date | null {
    const patterns = [
      // ISO format: 2025.07.31
      {
        regex: /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/,
        parse: (m: RegExpMatchArray) => new Date(+m[1], +m[2] - 1, +m[3]),
      },
      // Short year format: 24.08.26 (YY.MM.DD)
      {
        regex: /^(\d{2})\.(\d{1,2})\.(\d{1,2})$/,
        parse: (m: RegExpMatchArray) => {
          let year = +m[1];
          // Convert 2-digit year to 4-digit year
          // Assume 20XX for years 00-99 (2000-2099)
          if (year < 100) {
            year += 2000;
          }
          return new Date(year, +m[2] - 1, +m[3]);
        },
      },
      // European format with year: "21. july 2025" or "21. Juli 2025"
      {
        regex: /^(\d{1,2})\.\s*([a-zA-ZäöüÄÖÜßàáâãèéêëîïôõùúûü]+)\s+(\d{4})$/i,
        parse: (m: RegExpMatchArray) => {
          const month = ALL_MONTH_MAPPINGS[m[2].toLowerCase()];
          return month !== undefined ? new Date(+m[3], month, +m[1]) : null;
        },
      },
      // Space separated with year: "21 july 2025"
      {
        regex: /^(\d{1,2})\s+([a-zA-ZäöüÄÖÜßàáâãèéêëîïôõùúûü]+)\s+(\d{4})$/i,
        parse: (m: RegExpMatchArray) => {
          const month = ALL_MONTH_MAPPINGS[m[2].toLowerCase()];
          return month !== undefined ? new Date(+m[3], month, +m[1]) : null;
        },
      },
      // Month name with year: "july 2025", "Juli 2025"
      {
        regex: /^([a-zA-ZäöüÄÖÜßàáâãèéêëîïôõùúûü]+)\s+(\d{4})$/i,
        parse: (m: RegExpMatchArray) => {
          const month = ALL_MONTH_MAPPINGS[m[1].toLowerCase()];
          return month !== undefined ? new Date(+m[2], month, 1) : null;
        },
      },
    ];

    // Add current year bias patterns if enabled
    if (currentYearBias && this.shouldBiasCurrentYear(text)) {
      patterns.push(
        // European format without year: "21. july" or "21. Juli"
        {
          regex: /^(\d{1,2})\.\s*([a-zA-ZäöüÄÖÜßàáâãèéêëîïôõùúûü]+)$/i,
          parse: (m: RegExpMatchArray) => {
            const month = ALL_MONTH_MAPPINGS[m[2].toLowerCase()];
            return month !== undefined ? new Date(currentYear, month, +m[1]) : null;
          },
        },
        // Space separated without year: "21 july"
        {
          regex: /^(\d{1,2})\s+([a-zA-ZäöüÄÖÜßàáâãèéêëîïôõùúûü]+)$/i,
          parse: (m: RegExpMatchArray) => {
            const month = ALL_MONTH_MAPPINGS[m[2].toLowerCase()];
            return month !== undefined ? new Date(currentYear, month, +m[1]) : null;
          },
        },
        // Month name only: "july", "Juli" - defaults to current year, 1st day
        {
          regex: /^([a-zA-ZäöüÄÖÜßàáâãèéêëîïôõùúûü]+)$/i,
          parse: (m: RegExpMatchArray) => {
            const month = ALL_MONTH_MAPPINGS[m[1].toLowerCase()];
            return month !== undefined ? new Date(currentYear, month, 1) : null;
          },
        },
        // Month and day reversed: "july 21"
        {
          regex: /^([a-zA-ZäöüÄÖÜßàáâãèéêëîïôõùúûü]+)\s+(\d{1,2})$/i,
          parse: (m: RegExpMatchArray) => {
            const month = ALL_MONTH_MAPPINGS[m[1].toLowerCase()];
            return month !== undefined ? new Date(currentYear, month, +m[2]) : null;
          },
        }
      );
    }

    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        try {
          const date = pattern.parse(match);
          if (
            date &&
            !isNaN(date.getTime()) &&
            date.getFullYear() >= PARSING_CONSTANTS.MIN_VALID_YEAR &&
            date.getFullYear() <= PARSING_CONSTANTS.MAX_VALID_YEAR
          ) {
            return date;
          }
        } catch (error) {
          // Skip invalid pattern, continue to next
        }
      }
    }

    return null;
  }

  /**
   * Try any-date-parser for formatted dates and basic relative dates
   */
  private static tryAnyDateParser(text: string, languageCode?: string): Date | null {
    try {
      // Convert language code to full locale for any-date-parser compatibility
      const locale = this.languageCodeToLocale(languageCode);
      const result = parser.fromString(text, locale);
      if (result && result.isValid && result.isValid()) {
        return result;
      }
    } catch (error) {
      // any-date-parser failed, continue to next strategy
    }
    return null;
  }

  /**
   * Convert language code to appropriate locale for any-date-parser
   */
  private static languageCodeToLocale(languageCode?: string): string {
    const localeMap: Record<string, string> = {
      en: "en-US",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      it: "it-IT",
      pt: "pt-PT",
      nl: "nl-NL",
      ru: "ru-RU",
      ja: "ja-JP",
      ko: "ko-KR",
      zh: "zh-CN",
    };

    return localeMap[languageCode || "en"] || LOCALE_CONSTANTS.DATE_FORMAT_LOCALE;
  }

  /**
   * Try compromise-dates for complex English natural language
   */
  private static tryCompromiseDates(text: string, referenceDate: Date): Date | null {
    try {
      const context = {
        today: referenceDate.toISOString().split("T")[0],
        timezone: "UTC",
      };

      const doc = nlp(text);
      const dates = (doc as any).dates(context).get();

      if (dates.length > 0 && dates[0].start) {
        const result = new Date(dates[0].start);
        if (!isNaN(result.getTime())) {
          return result;
        }
      }
    } catch (error) {
      // compromise-dates failed, continue to next strategy
    }
    return null;
  }

  /**
   * Try chrono-node for multilingual natural language
   */
  private static tryChronoNode(
    text: string,
    referenceDate: Date,
    forwardDate: boolean,
    languageCode?: string,
    languageConfig?: LanguageConfig
  ): Date | null {
    try {
      // Override forwardDate if text explicitly refers to the past
      const isExplicitlyPast = this.isExplicitlyPastReference(text, languageConfig);
      const effectiveForwardDate = isExplicitlyPast ? false : forwardDate;

      // Get language fallback chain from user preferences only
      const fallbackChain = getCachedFallbackChain();

      // Try languages in order of preference
      for (const langCode of fallbackChain) {
        const config = getLanguageConfig(langCode);
        if (!config?.chronoSupport) {
          continue;
        }

        const chronoLocale = config.chronoLocale || langCode;

        try {
          let result: Date | null = null;

          if (chronoLocale === "en" || !chronoLocale) {
            // Use default chrono for English
            result = chrono.parseDate(text, referenceDate, { forwardDate: effectiveForwardDate });
          } else if (chronoLocale === "de") {
            // Use German locale parser
            result = de.parseDate(text, referenceDate, { forwardDate: effectiveForwardDate });
          } else if (chronoLocale === "fr") {
            // Use French locale parser
            result = fr.parseDate(text, referenceDate, { forwardDate: effectiveForwardDate });
          } else if (chronoLocale === "es") {
            // Use Spanish locale parser
            result = es.parseDate(text, referenceDate, { forwardDate: effectiveForwardDate });
          } else if ((chrono as any)[chronoLocale]?.parseDate) {
            // Fallback for other locales
            result = (chrono as any)[chronoLocale].parseDate(text, referenceDate, {
              forwardDate: effectiveForwardDate,
            });
          }

          if (result && !isNaN(result.getTime())) {
            return result;
          }
        } catch (localeError) {
          // chrono-node locale failed, try next language
        }
      }
    } catch (error) {
      // chrono-node parsing failed, return null
    }
    return null;
  }

  /**
   * Apply date bias logic based on context
   */
  private static applyDateBias(
    date: Date,
    originalText: string,
    referenceDate: Date,
    forwardDate: boolean,
    currentYearBias: boolean
  ): Date {
    let finalDate = date;

    // Apply current year bias for search context
    if (currentYearBias && this.shouldBiasCurrentYear(originalText)) {
      const currentYear = referenceDate.getFullYear();
      const oneYearFromNow = new Date(currentYear + 1, referenceDate.getMonth(), referenceDate.getDate());

      if (date > oneYearFromNow) {
        // Try to create a date in the current year
        const currentYearDate = new Date(currentYear, date.getMonth(), date.getDate());
        if (currentYearDate.getFullYear() === currentYear) {
          finalDate = currentYearDate;
        }
      }
    }

    // Apply forward date logic only if explicitly requested and not a past reference
    if (forwardDate && finalDate < referenceDate && !this.isExplicitlyPastReference(originalText)) {
      const nextYear = finalDate.getFullYear() + 1;
      const nextYearDate = new Date(nextYear, finalDate.getMonth(), finalDate.getDate());
      if (nextYearDate.getFullYear() <= referenceDate.getFullYear() + 1) {
        finalDate = nextYearDate;
      }
    }

    return finalDate;
  }

  /**
   * Determine if we should bias toward current year
   */
  private static shouldBiasCurrentYear(input: string): boolean {
    const lowerInput = input.toLowerCase();
    // Don't bias if explicit year or explicit future/past references
    if (/\d{4}/.test(input)) return false;
    if (/\b(next year|last year|previous year)\b/.test(lowerInput)) return false;
    if (
      /\b(next|last|previous)\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/.test(
        lowerInput
      )
    )
      return false;
    return true;
  }

  /**
   * Detect if text explicitly refers to the past using language configurations
   */
  private static isExplicitlyPastReference(text: string, languageConfig?: LanguageConfig): boolean {
    const lowerText = text.toLowerCase();

    if (languageConfig) {
      // Use specific language configuration
      const { pastReferences } = languageConfig;

      // Check general past patterns
      for (const pattern of pastReferences.generalPastPatterns) {
        if (pattern.test(lowerText)) return true;
      }

      // Check specific past time patterns
      for (const pattern of pastReferences.pastTimePatterns) {
        if (pattern.test(lowerText)) return true;
      }
    } else {
      // Fallback to multi-language detection for backwards compatibility
      // English past references
      if (/\b(last|previous|past|ago|yesterday|earlier)\s/.test(lowerText)) return true;
      if (
        /\b(last|previous)\s+(week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(
          lowerText
        )
      )
        return true;

      // German past references
      if (/\b(letzten?|vorige[nrs]?|vergangene[nrs]?|gestern|früher)\s/.test(lowerText)) return true;
      if (
        /\b(letzten?|vorige[nrs]?)\s+(woche|monat|jahr|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/.test(
          lowerText
        )
      )
        return true;

      // French past references
      if (/\b(dernier|dernière|passé|passée|hier|précédent|précédente)\s/.test(lowerText)) return true;
      if (
        /\b(dernier|dernière)\s+(semaine|mois|année|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/.test(
          lowerText
        )
      )
        return true;

      // Spanish past references
      if (/\b(pasado|pasada|anterior|ayer|último|última)\s/.test(lowerText)) return true;
      if (
        /\b(pasado|pasada|último|última)\s+(semana|mes|año|lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/.test(
          lowerText
        )
      )
        return true;
    }

    return false;
  }
}

/**
 * Convenience function for parsing dates with default options
 */
export function parseMultilingualDate(text: string, options: DateParsingOptions = {}): Date | null {
  const result = MultilingualDateParser.parseDate(text, options);
  return result ? result.date : null;
}

/**
 * Convenience function for parsing dates with detailed result information
 */
export function parseMultilingualDateWithDetails(
  text: string,
  options: DateParsingOptions = {}
): DateParsingResult | null {
  return MultilingualDateParser.parseDate(text, options);
}
