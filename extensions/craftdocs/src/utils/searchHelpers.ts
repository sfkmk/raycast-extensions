import { CraftConfig } from "../Config";
import type { Block, DocBlock } from "../lib/search";
import { createBlockUrl } from "./craftUrls";
import type { ExtendedSearchItem } from "./customEntries";
import { formatCraftInternalDate, formatDailyNoteTitle } from "./dateTimeFormatter";

export type ExtendedResult = Block | ExtendedSearchItem;

export const normalizeSearchQuery = (query: string): string => query.trim().replace(/\s+/g, " ");

export const isDateLikeSearchQuery = (query: string): boolean => {
  const normalized = normalizeSearchQuery(query);

  return (
    /^\d{4}[.-]\d{2}[.-]\d{2}$/.test(normalized) ||
    /^\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?$/.test(normalized) ||
    /^\d{1,2}\.?\s*[a-zA-Z]+\s*\d{0,4}$/.test(normalized)
  );
};

export const expandTaskQuery = (query: string): string[] => {
  const normalized = normalizeSearchQuery(query);
  const lowerQuery = normalized.toLowerCase();

  if (!/\b(task|tasks|todo|todos|to-do|logbook|inbox)\b/.test(lowerQuery)) {
    return [];
  }

  const remainder = normalized
    .replace(/\b(task|tasks|todo|todos|to-do|logbook|inbox)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!remainder) {
    return ["Task Inbox", "Task Logbook", "Tasks"].filter((entry) => entry.toLowerCase() !== lowerQuery).slice(0, 3);
  }

  const expansions = new Set<string>();

  if (remainder) {
    expansions.add(`Task Inbox ${remainder}`);
    expansions.add(`Task Logbook ${remainder}`);
    expansions.add(`Tasks ${remainder}`);
  }

  return [...expansions].filter((entry) => entry.toLowerCase() !== lowerQuery).slice(0, 3);
};

export const buildDateSearchQueries = (parsedDate: Date | undefined, originalQuery: string): string[] => {
  if (!parsedDate) {
    return [];
  }

  const normalizedOriginal = normalizeSearchQuery(originalQuery);
  const craftDate = formatCraftInternalDate(parsedDate);
  const isoDate = [
    parsedDate.getFullYear(),
    String(parsedDate.getMonth() + 1).padStart(2, "0"),
    String(parsedDate.getDate()).padStart(2, "0"),
  ].join("-");

  return [craftDate, isoDate].filter((entry, index, entries) => {
    return entry !== normalizedOriginal && entries.indexOf(entry) === index;
  });
};

export const combineBlockResults = (...resultGroups: Array<Block[] | undefined>): Block[] => {
  const seenBlocks = new Set<string>();
  const combined: Block[] = [];

  for (const results of resultGroups) {
    for (const block of results || []) {
      const key = `${block.spaceID}-${block.id}`;

      if (!seenBlocks.has(key)) {
        seenBlocks.add(key);
        combined.push(block);
      }
    }
  }

  return combined;
};

export const combineDocBlockResults = (...resultGroups: Array<DocBlock[] | undefined>): DocBlock[] => {
  const seenBlocks = new Set<string>();
  const combined: DocBlock[] = [];

  for (const results of resultGroups) {
    for (const docBlock of results || []) {
      const key = `${docBlock.block.spaceID}-${docBlock.block.id}`;

      if (!seenBlocks.has(key)) {
        seenBlocks.add(key);
        combined.push(docBlock);
      }
    }
  }

  return combined;
};

export const prioritizeDailyNotes = (blocks: Block[], parsedDate?: Date): Block[] => {
  if (!parsedDate) {
    return blocks;
  }

  const craftDate = formatCraftInternalDate(parsedDate);
  const dailyNotes: Block[] = [];
  const otherBlocks: Block[] = [];

  blocks.forEach((block) => {
    const isMatchingDailyNote =
      block.entityType === "document" &&
      (block.documentName === craftDate ||
        block.content === craftDate ||
        block.documentName?.includes(craftDate) ||
        block.content?.includes(craftDate));

    if (isMatchingDailyNote) {
      dailyNotes.push(block);
    } else {
      otherBlocks.push(block);
    }
  });

  return [...dailyNotes, ...otherBlocks];
};

export const consolidateTaskBlocks = (blocks: Block[]): Block[] => {
  const taskEntriesBySpace = new Map<string, Block[]>();

  blocks.forEach((block) => {
    if (isTaskDocument(block)) {
      taskEntriesBySpace.set(block.spaceID, [...(taskEntriesBySpace.get(block.spaceID) || []), block]);
    }
  });

  return blocks.filter((block) => {
    if (!isTaskInboxDocument(block)) {
      return true;
    }

    return !(taskEntriesBySpace.get(block.spaceID) || []).some(isTaskLogbookDocument);
  });
};

export const generateSearchResultsMarkdown = (
  results: ExtendedResult[],
  query: string,
  config: CraftConfig | null,
): string => {
  if (results.length === 0) {
    return `No results found for "${query}".`;
  }

  const generatedDate = new Date().toISOString().split("T")[0];
  const showSpaceInfo = (config?.enabledSpaces.length || 0) > 1;
  const lines = [`# Search Results for "${query}"`, "", `Generated on ${generatedDate}`, ""];

  results.forEach((item, index) => {
    const isCustomEntry = "isCustomEntry" in item;
    const title = isCustomEntry ? item.title : formatMarkdownBlockTitle(item);
    const subtitle = isCustomEntry ? undefined : formatMarkdownBlockSubtitle(item);
    const url = isCustomEntry ? item.url : createBlockUrl(item.id, item.spaceID);
    const spaceInfo = showSpaceInfo ? config?.getSpaceDisplayName(item.spaceID) : undefined;
    const displayTitle = [title || `Result ${index + 1}`, subtitle ? `from: ${subtitle}` : "", spaceInfo || ""]
      .filter(Boolean)
      .join(" ");

    lines.push(`- [${escapeMarkdownLinkTitle(displayTitle)}](${url})`);
  });

  return lines.join("\n");
};

const isTaskDocument = (block: Block): boolean => isTaskInboxDocument(block) || isTaskLogbookDocument(block);

const isTaskInboxDocument = (block: Block): boolean =>
  block.entityType === "document" &&
  [block.content, block.documentName].some((title) => title.trim().toLowerCase() === "task inbox");

const isTaskLogbookDocument = (block: Block): boolean =>
  block.entityType === "document" &&
  [block.content, block.documentName].some((title) => title.trim().toLowerCase() === "task logbook");

const escapeMarkdownLinkTitle = (title: string): string => title.replace(/[[\]]/g, "\\$&");

const formatMarkdownBlockTitle = (block: Block): string => {
  if (block.entityType !== "document") {
    return block.content;
  }

  return [block.content, block.documentName].some(isTaskTitle)
    ? "Tasks"
    : formatDailyNoteTitle(block.documentName || block.content, "EEE d. MMM yyyy", true);
};

const formatMarkdownBlockSubtitle = (block: Block): string | undefined =>
  block.entityType === "document"
    ? undefined
    : block.documentName
      ? formatDailyNoteTitle(block.documentName, "EEE d. MMM yyyy", true)
      : undefined;

const isTaskTitle = (title: string): boolean => {
  const normalized = title.trim().toLowerCase();

  return normalized === "task inbox" || normalized === "task logbook" || normalized === "tasks";
};
