import { Application, getPreferenceValues } from "@raycast/api";
import { getLanguageConfig } from "./utils/locales";
import { BUNDLE_IDS, LOCALE_CONSTANTS } from "./constants";

export const bundleIds = BUNDLE_IDS;

export interface GlobalPreferences {
  application: Application;
  supportedLanguages: string;
  dateDisplayFormat: string;
  showCurrentYear: boolean;
}

export interface SearchPreferences {
  useDetailedView: boolean;
}

export interface DailyNotePreferences {
  appendPosition: "end" | "beginning";
  addTimestamp: boolean;
  timeFormat: string;
  contentPrefix: string;
  contentSuffix: string;
}

export const getPreferences = (): GlobalPreferences => {
  return getPreferenceValues<GlobalPreferences>();
};

export const getSearchPreferences = (): SearchPreferences => {
  return getPreferenceValues<SearchPreferences>();
};

export const getDateFormatPreferences = () => {
  const globalPreferences = getPreferences();
  return {
    dateDisplayFormat: globalPreferences.dateDisplayFormat,
    showCurrentYear: globalPreferences.showCurrentYear,
  };
};

export const getDailyNotePreferences = (): DailyNotePreferences => {
  return getPreferenceValues<DailyNotePreferences>();
};

/**
 * Get the list of supported languages from user preferences
 * Parses the comma-separated string and validates each language code
 */
export function getSupportedLanguagesFromPreferences(): string[] {
  try {
    const preferences = getPreferences();
    const languagesString = preferences.supportedLanguages;

    // Parse comma-separated language codes
    const languages = (languagesString || "en") // Minimal fallback if preferences system fails
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    // Validate and filter supported languages
    const validLanguages = languages.filter((lang) => {
      const isValid = !!getLanguageConfig(lang);
      if (!isValid) {
        console.warn(`Unsupported language in preferences: ${lang}`);
      }
      return isValid;
    });

    // Always ensure English is included as fallback
    if (!validLanguages.includes("en")) {
      validLanguages.unshift(LOCALE_CONSTANTS.FALLBACK_LANGUAGE);
    }

    return validLanguages;
  } catch (error) {
    console.error("Error reading language preferences:", error);
    // Emergency fallback when preferences completely fail
    return ["en"];
  }
}

/**
 * Get the primary language for date parsing
 * Returns the first language from user preferences or system default
 */
export function getPrimaryLanguage(): string {
  const supportedLanguages = getSupportedLanguagesFromPreferences();
  return supportedLanguages[0] || LOCALE_CONSTANTS.FALLBACK_LANGUAGE;
}

// Get user's preferred language fallback chain based on user preferences
export function getPreferredLanguageFallbackChain(): string[] {
  const supportedLanguages = getSupportedLanguagesFromPreferences();

  // Create a copy to avoid modifying the original array
  const fallbackChain = [...supportedLanguages];

  // Always ensure English is in the fallback chain as a safety net
  if (!fallbackChain.includes("en")) {
    fallbackChain.push("en");
  }

  return fallbackChain;
}
