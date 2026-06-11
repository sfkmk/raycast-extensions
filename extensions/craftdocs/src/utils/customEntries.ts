import { CraftConfig } from "../Config";
import { Icon } from "@raycast/api";
import type { Block } from "../lib/search";
import { createFolderUrl } from "./craftUrls";
import { formatCraftInternalDate, isISODatePattern } from "./dateTimeFormatter";

export type SearchResultEntry = {
  title: string;
  icon: Icon;
  url: string;
  spaceID: string;
  isExactMatch: boolean;
};

export type ExtendedSearchItem = SearchResultEntry & { isCustomEntry: true };

type CustomEntryDefinition = {
  title: string;
  alternatives: string[];
  icon: Icon;
  folderId: string;
  titleParam?: string;
};

const CUSTOM_ENTRIES: CustomEntryDefinition[] = [
  {
    title: "Starred Documents",
    alternatives: ["Favorite", "Favorites", "Stars", "Star", "Pinned", "Pins", "Starred"],
    icon: Icon.Star,
    folderId: "star",
  },
  {
    title: "All Tags",
    alternatives: ["Tags", "Tags Overview", "Overview", "Hashtags", "#", "All #", "All Tags"],
    icon: Icon.Hashtag,
    folderId: "all_tags",
  },
  {
    title: "All Docs",
    alternatives: ["Docs Overview", "Docs", "Documents", "All Documents", "All"],
    icon: Icon.Folder,
    folderId: "all",
  },
  {
    title: "Organize",
    alternatives: ["Organizer", "Folding", "Folder", "Folders", "Organize", "Navigation"],
    icon: Icon.Sidebar,
    folderId: "organize",
  },
  {
    title: "Unsorted",
    alternatives: ["Inbox", "Document Inbox", "Documents Inbox", "Documents", "Document"],
    icon: Icon.Tray,
    folderId: "folder_notes",
    titleParam: "Unsorted",
  },
  {
    title: "Recently Deleted",
    alternatives: ["Trash", "Trash can", "Bin", "Deleted", "Removed"],
    icon: Icon.Trash,
    folderId: "folder_trash",
  },
  {
    title: "Shared with Me",
    alternatives: ["Shared", "Shared with"],
    icon: Icon.Upload,
    folderId: "shared_with_me",
  },
  {
    title: "Tasks",
    alternatives: ["Task", "Tasks", "Todo", "Todos", "Task Inbox", "Task Logbook", "Logbook"],
    icon: Icon.List,
    folderId: "all",
  },
];

const createEntryUrl = (spaceID: string, folderId: string, titleParam?: string): string =>
  createFolderUrl(spaceID, folderId, titleParam);

const normalizeTerm = (value: string) => value.trim().toLowerCase();

const hasQueryMatch = (query: string, terms: string[]) => {
  const normalizedQuery = normalizeTerm(query);

  if (!normalizedQuery) {
    return false;
  }

  if (normalizedQuery.length < 2) {
    return terms.some((term) => normalizeTerm(term) === normalizedQuery);
  }

  return terms.some((term) => {
    const normalizedTerm = normalizeTerm(term);
    return (
      normalizedTerm === normalizedQuery ||
      normalizedTerm.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedTerm)
    );
  });
};

export const filterCustomEntries = (
  query: string,
  enabledSpaceIds: string[],
  config?: CraftConfig | null,
): SearchResultEntry[] => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const querySpaceSafe = enabledSpaceIds.filter(Boolean);
  if (querySpaceSafe.length === 0) {
    return [];
  }

  const results: SearchResultEntry[] = [];

  for (const spaceID of querySpaceSafe) {
    for (const entry of CUSTOM_ENTRIES) {
      const terms = [entry.title, ...entry.alternatives];
      if (!hasQueryMatch(trimmedQuery, terms)) {
        continue;
      }

      results.push({
        title: entry.title,
        icon: entry.icon,
        url: createEntryUrl(spaceID, entry.folderId, entry.titleParam),
        spaceID,
        isExactMatch: terms.map(normalizeTerm).includes(normalizeTerm(trimmedQuery)),
      });
    }

    if (!config) {
      continue;
    }

    const configuredSpace = config.spaces.find((candidate) => candidate.spaceID === spaceID);
    if (!configuredSpace) {
      continue;
    }

    const spaceTitle = config.getSpaceDisplayName(configuredSpace.spaceID);
    if (hasQueryMatch(trimmedQuery, [spaceTitle, "space", "spaces"])) {
      results.push({
        title: spaceTitle,
        icon: Icon.House,
        url: createEntryUrl(spaceID, "all"),
        spaceID,
        isExactMatch: normalizeTerm(spaceTitle) === normalizeTerm(trimmedQuery),
      });
    }
  }

  return results;
};

export const isTaskQuery = (query: string): boolean => {
  return /\b(task|tasks|todo|todos|to-do|logbook)\b/i.test(query.trim());
};

export const isTaskBlockDocument = (title: string): boolean => {
  const normalized = normalizeTerm(title);
  return normalized === "task inbox" || normalized === "task logbook" || normalized === "tasks";
};

export const shouldBiasEntry = (item: Block | ExtendedSearchItem, query: string): boolean => {
  if ("isCustomEntry" in item) {
    return true;
  }

  if (!isTaskQuery(query)) {
    return false;
  }

  return (
    item.entityType === "document" && (isTaskBlockDocument(item.content) || isTaskBlockDocument(item.documentName))
  );
};

export const applyCentralizedBias = <T extends Block | ExtendedSearchItem>(
  results: T[],
  getBias: (item: T) => boolean,
): T[] => {
  const biased: T[] = [];
  const normal: T[] = [];

  results.forEach((item) => {
    if (getBias(item)) {
      biased.push(item);
    } else {
      normal.push(item);
    }
  });

  biased.sort((a, b) => {
    const aIsCustom = "isCustomEntry" in a;
    const bIsCustom = "isCustomEntry" in b;

    if (aIsCustom && !bIsCustom) {
      return -1;
    }

    if (!aIsCustom && bIsCustom) {
      return 1;
    }

    return 0;
  });

  return [...biased, ...normal];
};

export const isDailyNoteBlock = (
  block: Pick<Block, "entityType" | "content" | "documentName">,
  parsedDate?: Date,
): boolean => {
  if (block.entityType !== "document") {
    return false;
  }

  if (parsedDate) {
    const craftDate = formatCraftInternalDate(parsedDate);

    return (
      block.content === craftDate ||
      block.documentName === craftDate ||
      block.content.includes(craftDate) ||
      block.documentName.includes(craftDate)
    );
  }

  return isISODatePattern(block.content) || isISODatePattern(block.documentName);
};
