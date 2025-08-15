/**
 * Language configuration types for multilingual date parsing
 */

export interface PastReferencePatterns {
  /** Words that indicate past time (last, previous, etc.) */
  pastWords: string[];
  /** Patterns for past + time unit (last week, previous month, etc.) */
  pastTimePatterns: RegExp[];
  /** General past reference patterns */
  generalPastPatterns: RegExp[];
}

export interface FutureReferencePatterns {
  /** Words that indicate future time (next, coming, etc.) */
  futureWords: string[];
  /** Patterns for future + time unit (next week, coming month, etc.) */
  futureTimePatterns: RegExp[];
  /** General future reference patterns */
  generalFuturePatterns: RegExp[];
}

export interface MonthMappings {
  /** Full month names mapped to 0-based month index */
  fullNames: Record<string, number>;
  /** Abbreviated month names mapped to 0-based month index */
  abbreviations: Record<string, number>;
}

export interface LanguageConfig {
  /** Language code (ISO 639-1) */
  code: string;
  /** Human readable name */
  name: string;
  /** Past reference detection patterns */
  pastReferences: PastReferencePatterns;
  /** Future reference detection patterns */
  futureReferences: FutureReferencePatterns;
  /** Month name mappings */
  months: MonthMappings;
  /** Whether this language is supported by chrono-node */
  chronoSupport: boolean;
  /** Chrono locale identifier if different from language code */
  chronoLocale?: string;
}

export interface LocaleMapping {
  /** Full locale code (e.g., 'en-US', 'de-DE') */
  locale: string;
  /** Mapped language code */
  languageCode: string;
  /** Country/region code */
  countryCode: string;
}

/**
 * Time units in different languages for pattern matching
 */
export interface TimeUnits {
  day: string[];
  week: string[];
  month: string[];
  year: string[];
  /** Days of the week */
  weekdays: string[];
}

/**
 * Extended language configuration with time units
 */
export interface ExtendedLanguageConfig extends LanguageConfig {
  timeUnits: TimeUnits;
}

/**
 * Parser configuration options
 */
export interface ParserLanguageOptions {
  /** Preferred language for parsing */
  language?: string;
  /** Locale for formatting and region-specific parsing */
  locale?: string;
  /** Whether to try all supported languages if preferred fails */
  fallbackToAll?: boolean;
}
