import { Icon } from "@raycast/api";
import { formatCraftInternalDate, isISODatePattern } from "../utils/dateTimeFormatter";
import { Block } from "./useSearch";

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
    urlTemplate: "craftdocs://openfolder?folderId=star&spaceId={spaceId}&title=Starred",
  },
  {
    title: "All Tags",
    alternatives: ["Tags", "Tags Overview", "Overview", "Hashtags", "#", "All #", "All"],
    icon: Icon.Hashtag,
    urlTemplate: "craftdocs://openfolder?folderId=all_tags&spaceId={spaceId}&title=All%20Tags",
  },
  {
    title: "All Docs",
    alternatives: ["Docs Overview", "Docs", "Overview", "Documents", "All Documents", "All"],
    icon: Icon.Folder,
    urlTemplate: "craftdocs://openfolder?folderId=all&spaceId={spaceId}&title=All%20Docs",
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
    urlTemplate: "craftdocs://openfolder?folderId=organize&spaceId={spaceId}&title=Organize",
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
    urlTemplate: "craftdocs://openfolder?folderId=folder_trash&spaceId={spaceId}&title=Trash",
  },
  {
    title: "Shared with Me",
    alternatives: ["Shared", "Shared with"],
    icon: Icon.Upload,
    urlTemplate: "craftdocs://openfolder?folderId=shared_with_me&spaceId={spaceId}&title=Shared%20with%20Me",
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
 * Checks if query partially matches any search term
 */
function isPartialMatch(query: string, searchTerms: string[]): boolean {
  const normalizedQuery = normalizeText(query);
  return searchTerms.some((term) => normalizeText(term).includes(normalizedQuery));
}

/**
 * Filters custom entries based on search query and returns populated entries for matching spaces.
 *
 * This function searches through predefined custom navigation entries (like "Starred Documents",
 * "All Tags", etc.) and returns those that match the query either exactly or partially.
 * Each matching entry is populated with URLs for all provided space IDs.
 *
 * @param query - The search query string to match against entry titles and alternatives
 * @param spaceIDs - Array of space IDs to generate entries for
 * @returns Array of populated custom entries that match the query
 *
 * @example
 * ```typescript
 * const entries = filterCustomEntries("starred", ["space1", "space2"]);
 * // Returns entries for "Starred Documents" in both spaces
 * ```
 */
export function filterCustomEntries(query: string, spaceIDs: string[]): PopulatedCustomEntry[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const results: PopulatedCustomEntry[] = [];

    for (const entry of CUSTOM_ENTRIES) {
      try {
        const searchTerms = [entry.title, ...entry.alternatives];

        // Check if this entry matches the query
        const exactMatch = isExactMatch(query, searchTerms);
        const partialMatch = isPartialMatch(query, searchTerms);

        if (exactMatch || partialMatch) {
          // Create entries for each space
          for (const spaceID of spaceIDs) {
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
            } catch (urlError) {
              // Skip this space if URL generation fails
              continue;
            }
          }
        }
      } catch (entryError) {
        // Skip this entry if processing fails
        continue;
      }
    }

    return results;
  } catch (error) {
    // Return empty array if entire function fails
    return [];
  }
}

/**
 * Gets the priority score for sorting custom entries (lower = higher priority).
 *
 * Exact matches get priority 0, partial matches get priority 1.
 * This is used internally by the bias sorting system.
 *
 * @param entry - The populated custom entry to get priority for
 * @returns Priority score (0 for exact matches, 1 for partial matches)
 * @internal
 */
function getCustomEntryPriority(entry: PopulatedCustomEntry): number {
  return entry.isExactMatch ? 0 : 1;
}

/**
 * Determines if a search result item should be biased (prioritized) based on the query.
 *
 * This function implements the centralized bias system that prioritizes certain types
 * of entries in search results:
 * - Custom entries with exact matches are always biased
 * - Task-related entries when query contains task terms
 *
 * @param item - The search result item (either a Block or CustomEntry)
 * @param query - The original search query
 * @returns True if the item should be prioritized, false otherwise
 *
 * @example
 * ```typescript
 * const shouldPrioritize = shouldBiasEntry(block, "task inbox");
 * // Returns true for Task Inbox documents when searching for "task inbox"
 * ```
 */
export function shouldBiasEntry(item: ExtendedBlock, query: string): boolean {
  try {
    const isCustom = "isCustomEntry" in item;

    // Always bias exact-match custom entries
    if (isCustom && item.isExactMatch) {
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
  } catch (error) {
    // If bias determination fails, default to no bias
    return false;
  }
}

/**
 * Applies centralized bias sorting to search results, prioritizing certain items.
 *
 * This function separates search results into biased (high priority) and normal entries,
 * then returns them with biased entries first. Within biased entries, custom entries
 * are further sorted by their priority scores.
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
export function applyCentralizedBias<T extends ExtendedBlock>(
  allResults: T[],
  query: string,
  getBias: (item: T) => boolean
): T[] {
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
      } catch (itemError) {
        // If bias check fails for an item, treat it as normal entry
        normalEntries.push(item);
      }
    });

    // Sort biased entries maintaining their internal order but prioritizing by type
    biasedEntries.sort((a: T, b: T) => {
      try {
        const aIsCustom = "isCustomEntry" in a;
        const bIsCustom = "isCustomEntry" in b;

        if (aIsCustom && bIsCustom) {
          return getCustomEntryPriority(a) - getCustomEntryPriority(b);
        }
        if (aIsCustom && !bIsCustom) return -1;
        if (!aIsCustom && bIsCustom) return 1;
        return 0;
      } catch (sortError) {
        // If sorting fails, maintain original order
        return 0;
      }
    });

    // Return biased entries first (Group A), then normal entries (Group B)
    return [...biasedEntries, ...normalEntries];
  } catch (error) {
    // If entire bias operation fails, return original results
    return allResults;
  }
}

/**
 * Checks if a block represents a Task Inbox or Task Logbook document.
 *
 * This function identifies documents that are part of Craft's task management system
 * by checking if their title matches known task-related document names.
 *
 * @param title - The document title or content to check
 * @param entityType - The type of entity ("document" expected for positive matches)
 * @returns True if this is a task-related document, false otherwise
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
 * Checks if a block is from the Task Inbox or Task Logbook (based on parent document name).
 *
 * This function identifies blocks that belong to task-related documents by examining
 * their parent document name for task-related keywords.
 *
 * @param documentName - The name of the parent document
 * @returns True if the block belongs to a task-related document, false otherwise
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
 * Checks if a block represents a daily note based on its content and document name.
 *
 * This function identifies daily notes by checking if the block's content or document name
 * matches Craft's internal ISO date format (YYYY.MM.DD) or matches a specific parsed date.
 *
 * @param block - The block to check (must have entityType, content, and optional documentName)
 * @param parsedDate - Optional specific date to match against
 * @returns True if this block represents a daily note, false otherwise
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
      block.documentName?.includes(isoFormat) ||
      block.content?.includes(isoFormat)
    );
  }

  // Otherwise, check if it matches general ISO date pattern
  return isContentISODate || isDocumentNameISODate;
}
