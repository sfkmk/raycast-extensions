/**
 * Locale utilities for multilingual date parsing
 *
 * This module provides comprehensive language and locale support for date parsing,
 * including language configurations, locale mappings, and utility functions.
 */

// Export types
export type {
  PastReferencePatterns,
  FutureReferencePatterns,
  MonthMappings,
  LanguageConfig,
  LocaleMapping,
  TimeUnits,
  ExtendedLanguageConfig,
  ParserLanguageOptions,
} from "./types";

// Export language configurations
export {
  LANGUAGE_CONFIGS,
  ALL_MONTH_MAPPINGS,
  getLanguageConfig,
  getSupportedLanguages,
  hasChronoSupport,
} from "./languages";

// Export locale mappings and utilities
export {
  LOCALE_MAPPINGS,
  getLanguageCodeFromLocale,
  isSupportedLocale,
  getPreferredLanguageConfig,
  getLanguageFallbackChain,
} from "./localeMapping";
