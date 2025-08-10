// Craft application bundle identifiers
export const BUNDLE_IDS = ["com.lukilabs.lukiapp", "com.lukilabs.lukiapp-setapp"] as const;

// Cache keys for persistent storage
export const CACHE_KEYS = {
  SEARCH_SPACE_ID: "searchSpaceId",
  DAILY_NOTES_SPACE_ID: "dailyNotesSpaceId",
} as const;

// General application constants
export const APP_CONSTANTS = {
  DEFAULT_SPACE_FILTER: "all",
} as const;

// Language and internationalization constants
export const LOCALE_CONSTANTS = {
  FALLBACK_LANGUAGE: "en", // Emergency fallback when preferences fail completely
  DATE_FORMAT_LOCALE: "en-US", // Keep full locale for JavaScript's toLocaleDateString
} as const;

// Date parsing configuration
export const PARSING_CONSTANTS = {
  MIN_VALID_YEAR: 1900,
  MAX_VALID_YEAR: 2100,
  CACHE_TIMEOUT_MS: 60000, // 1 minute
} as const;

// Search and database constants
export const SEARCH_CONSTANTS = {
  RESULTS_LIMIT: 40,
  WASM_FILENAME: "sql-wasm-fts5.wasm",
} as const;

// Craft URL scheme position constants
// Using 999999 for "end" position follows Craft's native URL scheme approach.
// This may change in the future if Craft adds an API for external developers.
export const APPEND_POSITIONS = {
  BEGINNING: "0",
  END: "999999",
} as const;
