import { Database, BindParams } from "../../assets/sql-wasm-fts5";
import { Block } from "../hooks/useSearch";
import { DocBlock } from "../hooks/useDocumentSearch";
import Config from "../Config";
import { ExtendedBlock } from "./customEntries";
import { createBlockUrl } from "./craftUrls";
import { formatResultTitle, formatResultSubtitle } from "./resultFormatters";
import { ensureSafeTitle } from "./safety";

/**
 * Combines multiple Block[] arrays while avoiding duplicates.
 * Used to merge results from main search, expanded searches, and ISO date searches.
 *
 * @param mainResults - Primary search results
 * @param expandedResults - Results from expanded task queries
 * @param isoResults - Optional results from ISO date search
 * @returns Combined and deduplicated Block array
 */
export function combineBlockResults(mainResults: Block[], expandedResults: Block[], isoResults?: Block[]): Block[] {
  const combined = mainResults ? [...mainResults] : [];
  const seenBlocks = new Set<string>();

  // Track main results
  combined.forEach((block) => {
    seenBlocks.add(`${block.spaceID}-${block.id}`);
  });

  // Add expanded results (deduplicated)
  if (expandedResults) {
    expandedResults.forEach((block) => {
      const blockKey = `${block.spaceID}-${block.id}`;
      if (!seenBlocks.has(blockKey)) {
        seenBlocks.add(blockKey);
        combined.push(block);
      }
    });
  }

  // Add ISO results (deduplicated)
  if (isoResults) {
    isoResults.forEach((block) => {
      const blockKey = `${block.spaceID}-${block.id}`;
      if (!seenBlocks.has(blockKey)) {
        seenBlocks.add(blockKey);
        combined.push(block);
      }
    });
  }

  return combined;
}

/**
 * Combines multiple DocBlock[] arrays while avoiding duplicates.
 * Used to merge results from main document search, expanded searches, and ISO date searches.
 *
 * @param mainResults - Primary document search results
 * @param expandedResults - Results from expanded task queries
 * @param isoResults - Optional results from ISO date search
 * @returns Combined and deduplicated DocBlock array
 */
export function combineDocBlockResults(
  mainResults: DocBlock[],
  expandedResults: DocBlock[],
  isoResults?: DocBlock[]
): DocBlock[] {
  const combined = mainResults ? [...mainResults] : [];
  const seenBlocks = new Set<string>();

  // Track main results
  combined.forEach((docBlock) => {
    seenBlocks.add(`${docBlock.block.spaceID}-${docBlock.block.id}`);
  });

  // Add expanded results (deduplicated)
  if (expandedResults) {
    expandedResults.forEach((docBlock) => {
      const blockKey = `${docBlock.block.spaceID}-${docBlock.block.id}`;
      if (!seenBlocks.has(blockKey)) {
        seenBlocks.add(blockKey);
        combined.push(docBlock);
      }
    });
  }

  // Add ISO results (deduplicated)
  if (isoResults) {
    isoResults.forEach((docBlock) => {
      const blockKey = `${docBlock.block.spaceID}-${docBlock.block.id}`;
      if (!seenBlocks.has(blockKey)) {
        seenBlocks.add(blockKey);
        combined.push(docBlock);
      }
    });
  }

  return combined;
}

/**
 * Prioritize Daily Notes for date-like queries
 * @param blocks - Array of blocks to sort
 * @param parsedDate - Optional parsed date to match against
 * @returns Sorted array with Daily Notes first
 */
export const prioritizeDailyNotes = (blocks: Block[], parsedDate?: Date): Block[] => {
  if (!parsedDate) return blocks;

  // Format the parsed date to match Craft's internal format (YYYY.MM.DD)
  const isoFormat = formatDateToISO(parsedDate);

  // Separate daily notes from other blocks
  const dailyNotes: Block[] = [];
  const otherBlocks: Block[] = [];

  blocks.forEach((block) => {
    // Check if this is a daily note by looking at document names and content
    if (
      block.entityType === "document" &&
      (block.documentName === isoFormat ||
        block.content === isoFormat ||
        block.documentName?.includes(isoFormat) ||
        block.content?.includes(isoFormat))
    ) {
      dailyNotes.push(block);
    } else {
      otherBlocks.push(block);
    }
  });

  // Return daily notes first, then other blocks
  return [...dailyNotes, ...otherBlocks];
};

/**
 * Format date to ISO format used by Craft (YYYY.MM.DD)
 */
const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
};

/**
 * Generates markdown content for search results document
 * This is specific to search functionality and not intended for reuse
 *
 * @param results - Array of search results (blocks and custom entries)
 * @param query - The search query used
 * @param config - Configuration object for space names
 * @returns Markdown string with all results as links
 */
export function generateSearchResultsMarkdown(results: ExtendedBlock[], query: string, config: Config | null): string {
  if (results.length === 0) {
    return `No results found for "${query}".`;
  }

  const today = new Date();
  const dateString = today.toISOString().split("T")[0];
  let markdown = `# Search Results for "${query}"\n\nGenerated on ${dateString}\n\n`;

  // Get preferences for formatting (using defaults similar to UI)
  const dateDisplayFormat = "EEE d. MMM yyyy"; // Default format
  const hideCurrentYear = true; // Default behavior
  const enableCustomEntries = true; // Default to enabled for consistency

  results.forEach((item, index) => {
    let title: string;
    let subtitle: string | undefined;
    let url: string;
    let spaceInfo: string | undefined;

    if ("isCustomEntry" in item) {
      // Custom entry
      title = item.title;
      subtitle = undefined;
      url = item.url;
      spaceInfo = config?.getSpaceDisplayName(item.spaceID);
    } else {
      // Regular block
      title = formatResultTitle(item, dateDisplayFormat, hideCurrentYear, enableCustomEntries);
      subtitle = formatResultSubtitle(item, dateDisplayFormat, hideCurrentYear);
      url = createBlockUrl(item.id, item.spaceID);
      spaceInfo = config?.getSpaceDisplayName(item.spaceID);
    }

    // Combine title and subtitle if present (for blocks)
    let displayTitle = ensureSafeTitle(title, [`Result ${index + 1}`]);
    if (subtitle) {
      // For blocks, include the document name as part of the title
      displayTitle = `${displayTitle} (from: ${ensureSafeTitle(subtitle, ["Unknown Document"])})`;
    }

    // Truncate title if too long and escape markdown characters
    const truncatedTitle = displayTitle.length > 150 ? displayTitle.substring(0, 147) + "..." : displayTitle;
    const escapedTitle = truncatedTitle.replace(/[[\]]/g, "\\$&");

    // Add space info if present and more than one space is enabled
    const spaceInfoText = spaceInfo && config && config.getEnabledSpaces().length > 1 ? ` (${spaceInfo})` : "";

    // Use simple bullet format without emoji
    markdown += `- [${escapedTitle}${spaceInfoText}](${url})\n`;
  });

  return markdown;
}
