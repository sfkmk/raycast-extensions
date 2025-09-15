import { Icon } from "@raycast/api";
import { formatCraftInternalDate, isISODatePattern } from "../utils/dateTimeFormatter";
import { Block } from "../hooks/useSearch";
import Config from "../Config";

// Type for extended blocks that can include custom entries
export type ExtendedBlock = Block | (PopulatedCustomEntry & { isCustomEntry: true });

export interface CustomEntry {
  title: string;
  alternatives: string[];
  icon: Icon;
  urlTemplate: string;
  isSpecial?: boolean; // for entries like Task Inbox that don't use URL templates
}

export interface PopulatedCustomEntry {
  title: string;
  icon: Icon;
  url: string;
  spaceID: string;
  searchTerms: string[];
  isExactMatch: boolean;
}

// Define the custom entries
const CUSTOM_ENTRIES: CustomEntry[] = [
  {
    title: "Starred Documents",
    alternatives: ["Favorite", "Favorites", "Stars", "Star", "Pinned", "Pins"],
    icon: Icon.Star,
    urlTemplate: "craftdocs://openfolder?folderId=star&spaceId={spaceId}",
  },
  {
    title: "All Tags",
    alternatives: ["Tags", "Tags Overview", "Overview", "Hashtags", "#", "All #", "All"],
    icon: Icon.Hashtag,
    urlTemplate: "craftdocs://openfolder?folderId=all_tags&spaceId={spaceId}",
  },
  {
    title: "All Docs",
    alternatives: ["Docs Overview", "Docs", "Overview", "Documents", "All Documents", "All"],
    icon: Icon.Folder,
    urlTemplate: "craftdocs://openfolder?folderId=all&spaceId={spaceId}",
  },
  {
    title: "Organize",
    alternatives: [
      "All",
      "All Folders",
      "Folder",
      "Folders",
      "Organize",
      "Overview",
      "Folder Overview",
      "Folders Overview",
    ],
    icon: Icon.Folder,
    urlTemplate: "craftdocs://openfolder?folderId=organize&spaceId={spaceId}",
  },
  {
    title: "Unsorted",
    alternatives: ["Inbox", "Document Inbox", "Documents Inbox", "Documents", "Document"],
    icon: Icon.Tray,
    urlTemplate: "craftdocs://openfolder?folderId=folder_notes&spaceId={spaceId}&title=Unsorted",
  },
  {
    title: "Recently Deleted",
    alternatives: ["Trash", "Trash can", "Bin", "Deleted", "Removed"],
    icon: Icon.Trash,
    urlTemplate: "craftdocs://openfolder?folderId=folder_trash&spaceId={spaceId}",
  },
  {
    title: "Shared with Me",
    alternatives: ["Shared", "Shared with"],
    icon: Icon.Upload,
    urlTemplate: "craftdocs://openfolder?folderId=shared_with_me&spaceId={spaceId}",
  },
];

/**
 * Normalizes text for search comparison (lowercase, trimmed)
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Checks if query exactly matches a title or alternative
 */
function isExactMatch(query: string, searchTerms: string[]): boolean {
  const normalizedQuery = normalizeText(query);
  return searchTerms.some((term) => normalizeText(term) === normalizedQuery);
}

/**
 * Checks if query partially matches any search term (enhanced searchability)
 */
function isPartialMatch(query: string, searchTerms: string[]): boolean {
  const normalizedQuery = normalizeText(query);

  // Return false if query is too short to avoid noise
  if (normalizedQuery.length < 2) {
    return false;
  }

  return searchTerms.some((term) => {
    const normalizedTerm = normalizeText(term);
    // Check if term contains the query or query contains the term
    return normalizedTerm.includes(normalizedQuery) || normalizedQuery.includes(normalizedTerm);
  });
}

/**
 * Filters custom entries based on search query and returns populated entries for matching Spaces.
 *
 * This function searches through predefined custom navigation entries (like "Starred Documents",
 * "All Tags", etc.), dynamic Space entries, and emoji entries, returning those that match the query.
 * Each matching entry is populated with URLs for all provided Space IDs.
 *
 * @param query - The search query string to match against entry titles and alternatives
 * @param spaceIDs - Array of Space IDs to generate entries for
 * @param config - Optional Config instance to enable dynamic Space entries
 * @returns Array of populated custom entries that match the query
 *
 * @example
 * ```typescript
 * const entries = filterCustomEntries("starred", ["space1", "space2"]);
 * // Returns entries for "Starred Documents" in both Spaces
 *
 * const entriesWithSpaces = filterCustomEntries("My Space", ["space1"], config);
 * // Returns Space entries if "My Space" matches a Space name
 * ```
 */
export function filterCustomEntries(query: string, spaceIDs: string[], config?: Config): PopulatedCustomEntry[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const results: PopulatedCustomEntry[] = [];

    // Process entries for each Space
    for (const spaceID of spaceIDs) {
      // First, handle static custom entries
      for (const entry of CUSTOM_ENTRIES) {
        try {
          const searchTerms = [entry.title, ...entry.alternatives];

          // Check if this entry matches the query (exact or partial)
          const exactMatch = isExactMatch(query, searchTerms);
          const partialMatch = !exactMatch && isPartialMatch(query, searchTerms);

          if (exactMatch || partialMatch) {
            try {
              let url = "";
              if (!entry.isSpecial) {
                url = entry.urlTemplate.replace("{spaceId}", spaceID);
              }

              results.push({
                title: entry.title,
                icon: entry.icon,
                url,
                spaceID,
                searchTerms,
                isExactMatch: exactMatch,
              });
            } catch (_urlError) {
              // Skip this Space if URL generation fails
              continue;
            }
          }
        } catch (_entryError) {
          // Skip this entry if processing fails
          continue;
        }
      }

      // Then, handle dynamic Space entry for this specific Space
      if (config) {
        const space = config.getEnabledSpaces().find((s) => s.spaceID === spaceID);
        if (space) {
          const spaceName = config.getSpaceDisplayName(space.spaceID);
          const spaceEntry = {
            title: spaceName,
            alternatives: ["Spaces", "Space"],
            icon: Icon.House,
            urlTemplate: "craftdocs://openfolder?folderId=all&spaceId={spaceId}",
          };

          const searchTerms = [spaceEntry.title, ...spaceEntry.alternatives];
          const exactMatch = isExactMatch(query, searchTerms);
          const partialMatch = !exactMatch && isPartialMatch(query, searchTerms);

          if (exactMatch || partialMatch) {
            try {
              const url = spaceEntry.urlTemplate.replace("{spaceId}", spaceID);
              results.push({
                title: spaceEntry.title,
                icon: spaceEntry.icon,
                url,
                spaceID,
                searchTerms,
                isExactMatch: exactMatch,
              });
            } catch (_urlError) {
              // Skip this Space if URL generation fails
              continue;
            }
          }
        }
      }
    }

    return results;
  } catch (_error) {
    // Return empty array if entire function fails
    return [];
  }
}

/**
 * Determines if a search result item should be biased (prioritized) based on the query.
 *
 * This function implements the centralized bias system that prioritizes certain types
 * of entries in search results:
 * - Custom entries are always biased (they are all exact matches)
 * - Task-related entries when query contains task terms
 *
 * @param item - The search result item (either a Block or CustomEntry)
 * @param query - The original search query
 * @returns True if the item should be prioritized, false otherwise
 *
 * @example
 * ```typescript
 * const shouldPrioritize = shouldBiasEntry(block, "task inbox");
 * // Returns true for Task Inbox Documents when searching for "task inbox"
 * ```
 */
export function shouldBiasEntry(item: ExtendedBlock, query: string): boolean {
  try {
    const isCustom = "isCustomEntry" in item;

    // Always bias custom entries (they are all exact matches now)
    if (isCustom) {
      return true;
    }

    // Bias task entries when query matches task terms
    const taskTerms = ["task", "tasks", "task inbox", "task logbook", "logbook", "inbox"];
    const queryMatchesTaskTerms = taskTerms.some((term) => query.toLowerCase().trim().includes(term.toLowerCase()));

    if (queryMatchesTaskTerms && !isCustom && item.entityType === "document") {
      return (
        isTaskInboxDocument(item.content, item.entityType) || isTaskInboxDocument(item.documentName, item.entityType)
      );
    }

    return false;
  } catch (_error) {
    // If bias determination fails, default to no bias
    return false;
  }
}

/**
 * Applies centralized bias sorting to search results, prioritizing certain items.
 *
 * This function separates search results into biased (high priority) and normal entries,
 * then returns them with biased entries first. Custom entries are placed first among
 * biased entries.
 *
 * @template T - Type extending ExtendedBlock (Block or CustomEntry)
 * @param allResults - All search results to be sorted
 * @param query - The original search query for context
 * @param getBias - Function that determines if an item should be biased
 * @returns Sorted array with biased entries first, then normal entries
 *
 * @example
 * ```typescript
 * const sorted = applyCentralizedBias(
 *   allResults,
 *   "starred",
 *   (item) => shouldBiasEntry(item, "starred")
 * );
 * ```
 */
export function applyCentralizedBias<T extends ExtendedBlock>(allResults: T[], getBias: (item: T) => boolean): T[] {
  try {
    // Separate into bias groups
    const biasedEntries: T[] = [];
    const normalEntries: T[] = [];

    allResults.forEach((item) => {
      try {
        if (getBias(item)) {
          biasedEntries.push(item);
        } else {
          normalEntries.push(item);
        }
      } catch (_itemError) {
        // If bias check fails for an item, treat it as normal entry
        normalEntries.push(item);
      }
    });

    // Sort biased entries - custom entries first, then other biased entries
    biasedEntries.sort((a: T, b: T) => {
      try {
        const aIsCustom = "isCustomEntry" in a;
        const bIsCustom = "isCustomEntry" in b;

        if (aIsCustom && !bIsCustom) return -1;
        if (!aIsCustom && bIsCustom) return 1;
        return 0;
      } catch (_sortError) {
        // If sorting fails, maintain original order
        return 0;
      }
    });

    // Return biased entries first (Group A), then normal entries (Group B)
    return [...biasedEntries, ...normalEntries];
  } catch (_error) {
    // If entire bias operation fails, return original results
    return allResults;
  }
}

/**
 * Checks if a Block represents a Task Inbox or Task Logbook Document.
 *
 * This function identifies Documents that are part of Craft's task management system
 * by checking if their title matches known task-related Document names.
 *
 * @param title - The Document title or content to check
 * @param entityType - The type of entity ("document" expected for positive matches)
 * @returns True if this is a task-related Document, false otherwise
 *
 * @example
 * ```typescript
 * const isTaskDoc = isTaskInboxDocument("Task Inbox", "document");
 * // Returns true
 * ```
 */
export function isTaskInboxDocument(title: string | undefined, entityType: string): boolean {
  if (!title) return false;
  const normalizedTitle = normalizeText(title);
  return (
    entityType === "document" &&
    (normalizedTitle === "task inbox" || normalizedTitle === "task logbook" || normalizedTitle === "tasks")
  );
}

/**
 * Checks if a Block is from the Task Inbox or Task Logbook (based on parent Document name).
 *
 * This function identifies Blocks that belong to task-related Documents by examining
 * their parent Document name for task-related keywords.
 *
 * @param documentName - The name of the parent Document
 * @returns True if the Block belongs to a task-related Document, false otherwise
 *
 * @example
 * ```typescript
 * const isFromTaskInbox = isTaskInboxBlock("Task Inbox - Work");
 * // Returns true
 * ```
 */
export function isTaskInboxBlock(documentName: string | undefined): boolean {
  return (
    (documentName?.includes("Task Inbox") ||
      documentName?.includes("Task Logbook") ||
      documentName?.includes("Tasks")) ??
    false
  );
}

/**
 * Checks if a Block represents a Daily Note based on its content and Document name.
 *
 * This function identifies Daily Notes by checking if the Block's content or Document name
 * matches Craft's internal ISO date format (YYYY.MM.DD) or matches a specific parsed date.
 *
 * @param block - The Block to check (must have entityType, content, and optional documentName)
 * @param parsedDate - Optional specific date to match against
 * @returns True if this Block represents a Daily Note, false otherwise
 *
 * @example
 * ```typescript
 * const block = { entityType: "document", content: "2024.01.15", documentName: "2024.01.15" };
 * const isDailyNote = isDailyNoteBlock(block);
 * // Returns true
 * ```
 */
export function isDailyNoteBlock(
  block: { entityType: string; documentName?: string; content: string },
  parsedDate?: Date
): boolean {
  if (block.entityType !== "document") {
    return false;
  }

  // Check if content or documentName matches ISO date pattern
  const isContentISODate = isISODatePattern(block.content);
  const isDocumentNameISODate = block.documentName ? isISODatePattern(block.documentName) : false;

  // If we have a specific parsed date, check for exact match
  if (parsedDate) {
    const isoFormat = formatCraftInternalDate(parsedDate);
    return (
      block.documentName === isoFormat ||
      block.content === isoFormat ||
      (block.documentName?.includes(isoFormat) ?? false) ||
      (block.content?.includes(isoFormat) ?? false)
    );
  }

  // Otherwise, check if it matches general ISO date pattern
  return isContentISODate || isDocumentNameISODate;
}
