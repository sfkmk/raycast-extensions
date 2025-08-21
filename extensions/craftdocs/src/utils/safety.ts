import path from "path";

/**
 * Safely joins path segments, handling undefined/null values gracefully.
 * Returns empty string if no valid segments are provided.
 *
 * @param segments - Path segments, some of which may be undefined/null
 * @returns Joined path or empty string if no valid segments
 *
 * @example
 * ensureSafePath("/home", undefined, "user") // "/home/user"
 * ensureSafePath(undefined, null) // ""
 */
export const ensureSafePath = (...segments: (string | undefined | null)[]): string => {
  const validSegments = segments.filter(
    (segment): segment is string => segment !== undefined && segment !== null && segment.trim().length > 0
  );

  return validSegments.length > 0 ? path.join(...validSegments) : "";
};

/**
 * Ensures a title is never empty or undefined by trying fallbacks in order.
 *
 * @param primary - Primary title to use
 * @param fallbacks - Array of fallback titles to try in order
 * @param defaultTitle - Final fallback if all else fails
 * @returns A guaranteed non-empty string
 *
 * @example
 * ensureSafeTitle("", ["doc.txt", "content"], "Untitled") // "doc.txt"
 * ensureSafeTitle(undefined, [], "Fallback") // "Fallback"
 */
export const ensureSafeTitle = (
  primary: string | undefined | null,
  fallbacks: (string | undefined | null)[] = [],
  defaultTitle = "Untitled"
): string => {
  // Try primary first
  if (primary && primary.trim().length > 0) {
    return primary.trim();
  }

  // Try fallbacks in order
  for (const fallback of fallbacks) {
    if (fallback && fallback.trim().length > 0) {
      return fallback.trim();
    }
  }

  // Return default
  return defaultTitle;
};

/**
 * Validates if an application object has the required properties for List.Item usage.
 *
 * @param app - Application object to validate
 * @returns True if application has valid name and bundleId
 */
export const isValidApplication = (app: any): app is { name: string; bundleId: string } => {
  return (
    app &&
    typeof app === "object" &&
    typeof app.name === "string" &&
    app.name.trim().length > 0 &&
    typeof app.bundleId === "string" &&
    app.bundleId.trim().length > 0
  );
};

/**
 * Generic utility for providing fallback values with validation.
 *
 * @param value - Primary value to check
 * @param validator - Function to validate if value is acceptable
 * @param fallback - Fallback value to use if primary fails validation
 * @returns Primary value if valid, otherwise fallback
 *
 * @example
 * withFallback("", (v) => v.length > 0, "default") // "default"
 * withFallback("valid", (v) => v.length > 0, "default") // "valid"
 */
export const withFallback = <T>(value: T, validator: (val: T) => boolean, fallback: T): T => {
  return validator(value) ? value : fallback;
};

/**
 * Safely creates directory paths for Craft configuration.
 * Returns null if the root directory doesn't exist (Craft not installed).
 *
 * @param rootDir - Root Craft directory (may be undefined)
 * @param subPath - Subdirectory to append
 * @returns Full path or null if root doesn't exist
 *
 * @example
 * ensureCraftPath("/craft/root", "Search") // "/craft/root/Search"
 * ensureCraftPath(undefined, "Search") // null
 */
export const ensureCraftPath = (rootDir: string | undefined, subPath: string): string | null => {
  if (!rootDir || rootDir.trim().length === 0) {
    return null;
  }

  return path.join(rootDir, subPath);
};

/**
 * Creates a safe regex that matches nothing when input is invalid.
 * Useful for filtering operations when source data might be unavailable.
 *
 * @param pattern - Regex pattern string
 * @returns Regex object, or regex that matches nothing if pattern is invalid
 */
export const ensureSafeRegex = (pattern: string | undefined): RegExp => {
  if (!pattern || pattern.trim().length === 0) {
    return /(?!.*)/; // Negative lookahead that never matches
  }

  try {
    return new RegExp(pattern);
  } catch {
    return /(?!.*)/; // Return non-matching regex if pattern is invalid
  }
};

/**
 * Validates space dropdown data to ensure title and id are present.
 *
 * @param space - Space object to validate
 * @returns True if space has valid title and id
 */
export const isValidSpaceOption = (space: any): space is { id: string; title: string } => {
  return (
    space &&
    typeof space === "object" &&
    typeof space.id === "string" &&
    space.id.trim().length > 0 &&
    typeof space.title === "string" &&
    space.title.trim().length > 0
  );
};
