/**
 * Utility functions for consistent formatting of search results
 * Used by both UI components and markdown generation to ensure
 * the same visual transformations are applied everywhere
 */

import { ExtendedBlock } from "./customEntries";
import { Block } from "../hooks/useSearch";
// Removed emoji converter import - using pass-through instead
import { formatDailyNoteTitle } from "./dateTimeFormatter";
import { isTaskInboxDocument, isTaskInboxBlock, isDailyNoteBlock } from "./customEntries";
import Config from "../Config";
import { createBlockUrl } from "./craftUrls";

/**
 * Format a block or document title with all visual transformations
 * This ensures consistent rendering between UI and markdown output
 */
export function formatResultTitle(
  item: ExtendedBlock,
  dateDisplayFormat: string,
  hideCurrentYear: boolean,
  enableCustomEntries: boolean,
  _parsedDate?: Date,
): string {
  if ("isCustomEntry" in item) {
    // Custom entries already have their title set correctly
    return item.title;
  }

  const block = item as Block;

  if (block.entityType === "document") {
    // Check if this is a task entry and rename it to "Tasks" (only if custom entries enabled)
    if (
      enableCustomEntries &&
      (isTaskInboxDocument(block.content, block.entityType) ||
        isTaskInboxDocument(block.documentName || "", block.entityType))
    ) {
      return "Tasks";
    }

    // Format daily note titles (no emoji conversion)
    const rawTitle = formatDailyNoteTitle(block.documentName || block.content, dateDisplayFormat, hideCurrentYear);
    return rawTitle;
  } else {
    // For blocks, use the content as-is (no emoji conversion)
    return block.content;
  }
}

/**
 * Format the subtitle/document name for blocks
 * Returns undefined for documents, formatted name for blocks
 */
export function formatResultSubtitle(
  item: ExtendedBlock,
  dateDisplayFormat: string,
  hideCurrentYear: boolean,
): string | undefined {
  if ("isCustomEntry" in item) {
    // Custom entries don't have subtitles
    return undefined;
  }

  const block = item as Block;

  if (block.entityType === "document") {
    return undefined;
  } else {
    // For blocks, show the document name as subtitle
    const formattedDocumentName = block.documentName
      ? formatDailyNoteTitle(block.documentName, dateDisplayFormat, hideCurrentYear)
      : block.documentName;
    return formattedDocumentName ? formattedDocumentName : undefined;
  }
}

/**
 * Get the appropriate emoji icon for a search result
 * Used for consistent icon representation in markdown
 */
export function getResultEmoji(item: ExtendedBlock, enableCustomEntries: boolean, parsedDate?: Date): string {
  if ("isCustomEntry" in item) {
    // Custom entry - map to appropriate emoji
    switch (item.title) {
      case "Starred Documents":
        return "⭐";
      case "All Tags":
        return "🏷️";
      case "All Docs":
        return "📁";
      case "Organize":
        return "📂";
      case "Unsorted":
        return "📥";
      case "Recently Deleted":
        return "🗑️";
      case "Shared with Me":
        return "👥";
      default:
        return "🔗";
    }
  }

  const block = item as Block;

  if (block.entityType === "document") {
    // Check for special document types
    if (
      enableCustomEntries &&
      (isTaskInboxDocument(block.content, block.entityType) ||
        isTaskInboxDocument(block.documentName || "", block.entityType))
    ) {
      return "✅";
    } else if (isDailyNoteBlock(block, parsedDate)) {
      return "📅";
    } else {
      return "📄";
    }
  } else {
    // Block within a document
    if (enableCustomEntries && isTaskInboxBlock(block.documentName)) {
      return "☑️";
    } else if (
      block.documentName &&
      isDailyNoteBlock(
        {
          entityType: "document",
          content: block.documentName,
          documentName: block.documentName,
        },
        parsedDate,
      )
    ) {
      return "📝";
    } else {
      return "📝";
    }
  }
}

/**
 * Format a complete search result for display
 * Returns an object with all formatted fields
 */
export interface FormattedResult {
  title: string;
  subtitle?: string;
  emoji: string;
  url: string;
  spaceInfo?: string;
}

export function formatSearchResult(
  item: ExtendedBlock,
  config: Config | null,
  dateDisplayFormat: string,
  hideCurrentYear: boolean,
  enableCustomEntries: boolean,
  parsedDate?: Date,
): FormattedResult {
  const title = formatResultTitle(item, dateDisplayFormat, hideCurrentYear, enableCustomEntries, parsedDate);
  const subtitle = formatResultSubtitle(item, dateDisplayFormat, hideCurrentYear);
  const emoji = getResultEmoji(item, enableCustomEntries, parsedDate);

  let url = "";
  let spaceInfo = undefined;

  if ("isCustomEntry" in item) {
    url = item.url;
  } else {
    const block = item as Block;
    url = createBlockUrl(block.id, block.spaceID);

    // Add space info if multiple spaces exist
    if (config && config.getEnabledSpaces().length > 1) {
      spaceInfo = config.getSpaceDisplayName(block.spaceID);
    }
  }

  return {
    title,
    subtitle,
    emoji,
    url,
    spaceInfo,
  };
}

/**
 * Apply all visual transformations to a text string
 * This is the main function to ensure text is rendered consistently
 */
export function renderText(text: string): string {
  // Pass through text as-is (no emoji conversion)
  return text;
}
