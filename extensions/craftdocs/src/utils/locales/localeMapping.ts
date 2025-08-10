import { LocaleMapping } from "./types";
import { getLanguageConfig } from "./languages";

/**
 * Comprehensive locale to language mapping for all supported regions
 *
 * This maps specific locale codes (e.g., 'en-US', 'de-DE') to their corresponding
 * language configurations, enabling region-specific parsing while maintaining
 * consistent language rules.
 */

export const LOCALE_MAPPINGS: Record<string, LocaleMapping> = {
  // Bengali locales
  "bn-BD": { locale: "bn-BD", languageCode: "bn", countryCode: "BD" },
  "bn-IN": { locale: "bn-IN", languageCode: "bn", countryCode: "IN" },

  // Czech locales
  "cs-CZ": { locale: "cs-CZ", languageCode: "cs", countryCode: "CZ" },

  // Danish locales
  "da-DK": { locale: "da-DK", languageCode: "da", countryCode: "DK" },

  // German locales
  "de-AT": { locale: "de-AT", languageCode: "de", countryCode: "AT" },
  "de-CH": { locale: "de-CH", languageCode: "de", countryCode: "CH" },
  "de-DE": { locale: "de-DE", languageCode: "de", countryCode: "DE" },

  // Greek locales
  "el-GR": { locale: "el-GR", languageCode: "el", countryCode: "GR" },

  // English locales
  "en-AU": { locale: "en-AU", languageCode: "en", countryCode: "AU" },
  "en-CA": { locale: "en-CA", languageCode: "en", countryCode: "CA" },
  "en-GB": { locale: "en-GB", languageCode: "en", countryCode: "GB" },
  "en-IE": { locale: "en-IE", languageCode: "en", countryCode: "IE" },
  "en-IN": { locale: "en-IN", languageCode: "en", countryCode: "IN" },
  "en-NZ": { locale: "en-NZ", languageCode: "en", countryCode: "NZ" },
  "en-US": { locale: "en-US", languageCode: "en", countryCode: "US" },
  "en-ZA": { locale: "en-ZA", languageCode: "en", countryCode: "ZA" },

  // Spanish locales
  "es-AR": { locale: "es-AR", languageCode: "es", countryCode: "AR" },
  "es-CL": { locale: "es-CL", languageCode: "es", countryCode: "CL" },
  "es-CO": { locale: "es-CO", languageCode: "es", countryCode: "CO" },
  "es-ES": { locale: "es-ES", languageCode: "es", countryCode: "ES" },
  "es-MX": { locale: "es-MX", languageCode: "es", countryCode: "MX" },
  "es-US": { locale: "es-US", languageCode: "es", countryCode: "US" },

  // Finnish locales
  "fi-FI": { locale: "fi-FI", languageCode: "fi", countryCode: "FI" },

  // French locales
  "fr-BE": { locale: "fr-BE", languageCode: "fr", countryCode: "BE" },
  "fr-CA": { locale: "fr-CA", languageCode: "fr", countryCode: "CA" },
  "fr-CH": { locale: "fr-CH", languageCode: "fr", countryCode: "CH" },
  "fr-FR": { locale: "fr-FR", languageCode: "fr", countryCode: "FR" },

  // Hindi locales
  "hi-IN": { locale: "hi-IN", languageCode: "hi", countryCode: "IN" },

  // Hungarian locales
  "hu-HU": { locale: "hu-HU", languageCode: "hu", countryCode: "HU" },

  // Indonesian locales
  "id-ID": { locale: "id-ID", languageCode: "id", countryCode: "ID" },

  // Italian locales
  "it-CH": { locale: "it-CH", languageCode: "it", countryCode: "CH" },
  "it-IT": { locale: "it-IT", languageCode: "it", countryCode: "IT" },

  // Japanese locales
  "jp-JP": { locale: "jp-JP", languageCode: "ja", countryCode: "JP" },

  // Korean locales
  "ko-KR": { locale: "ko-KR", languageCode: "ko", countryCode: "KR" },

  // Dutch locales
  "nl-BE": { locale: "nl-BE", languageCode: "nl", countryCode: "BE" },
  "nl-NL": { locale: "nl-NL", languageCode: "nl", countryCode: "NL" },

  // Norwegian locales
  "no-NO": { locale: "no-NO", languageCode: "no", countryCode: "NO" },

  // Polish locales
  "pl-PL": { locale: "pl-PL", languageCode: "pl", countryCode: "PL" },

  // Portuguese locales
  "pt-BR": { locale: "pt-BR", languageCode: "pt", countryCode: "BR" },
  "pt-PT": { locale: "pt-PT", languageCode: "pt", countryCode: "PT" },

  // Romanian locales
  "ro-RO": { locale: "ro-RO", languageCode: "ro", countryCode: "RO" },

  // Russian locales
  "ru-RU": { locale: "ru-RU", languageCode: "ru", countryCode: "RU" },

  // Slovak locales
  "sk-SK": { locale: "sk-SK", languageCode: "sk", countryCode: "SK" },

  // Swedish locales
  "sv-SE": { locale: "sv-SE", languageCode: "sv", countryCode: "SE" },

  // Tamil locales
  "ta-IN": { locale: "ta-IN", languageCode: "ta", countryCode: "IN" },
  "ta-LK": { locale: "ta-LK", languageCode: "ta", countryCode: "LK" },

  // Thai locales
  "th-TH": { locale: "th-TH", languageCode: "th", countryCode: "TH" },

  // Turkish locales
  "tr-TR": { locale: "tr-TR", languageCode: "tr", countryCode: "TR" },

  // Chinese locales
  "zh-CN": { locale: "zh-CN", languageCode: "zh", countryCode: "CN" },
  "zh-HK": { locale: "zh-HK", languageCode: "zh", countryCode: "HK" },
  "zh-TW": { locale: "zh-TW", languageCode: "zh", countryCode: "TW" },
};

/**
 * Get language code from locale string
 */
export function getLanguageCodeFromLocale(locale: string): string {
  // First try exact match
  const mapping = LOCALE_MAPPINGS[locale];
  if (mapping) {
    return mapping.languageCode;
  }

  // Fallback to extracting language code from locale string
  const languageCode = locale.split("-")[0];
  return languageCode;
}

/**
 * Check if a locale is supported
 */
export function isSupportedLocale(locale: string): boolean {
  return locale in LOCALE_MAPPINGS;
}

/**
 * Get user's preferred language configuration based on locale or language code
 */
export function getPreferredLanguageConfig(localeOrLanguage?: string) {
  if (!localeOrLanguage) {
    return getLanguageConfig("en"); // Default to English
  }

  // Try exact locale match first
  const languageCode = getLanguageCodeFromLocale(localeOrLanguage);
  const config = getLanguageConfig(languageCode);

  if (config) {
    return config;
  }

  // Fallback to English if language not supported
  return getLanguageConfig("en");
}

/**
 * Get all language codes that should be tried for parsing
 */
export function getLanguageFallbackChain(preferredLocale?: string): string[] {
  const chain: string[] = [];

  if (preferredLocale) {
    const languageCode = getLanguageCodeFromLocale(preferredLocale);
    if (languageCode) {
      chain.push(languageCode);
    }
  }

  // Add common fallback languages if not already included
  const fallbacks = ["en", "de", "fr", "es", "it", "pt", "nl", "ru"];
  for (const fallback of fallbacks) {
    if (!chain.includes(fallback)) {
      chain.push(fallback);
    }
  }

  return chain;
}
