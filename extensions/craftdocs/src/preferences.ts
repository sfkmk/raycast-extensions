import { getPreferenceValues } from "@raycast/api";

export const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};

export const getSearchPreferences = (): Preferences.Search => {
  return getPreferenceValues<Preferences.Search>();
};

export const getDailyNotePreferences = (): Preferences.AddToDailyNote => {
  return getPreferenceValues<Preferences.AddToDailyNote>();
};

export const getSupportedDateLanguages = (): string[] => {
  const preferences = getPreferenceValues<Preferences & { supportedLanguages?: string }>();

  return (preferences.supportedLanguages || "en")
    .split(",")
    .map((language) => language.trim().toLowerCase())
    .filter(Boolean);
};
