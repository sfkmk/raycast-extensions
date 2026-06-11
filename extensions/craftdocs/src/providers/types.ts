import type { SpaceSQLite } from "../lib/craftSpaces";
import type { DatabaseWrap } from "../lib/databaseLoader";
import type { Block, DocBlock } from "../lib/search";

export type SearchRequest = {
  databases: DatabaseWrap[];
  query: string;
  parsedDate?: Date;
  includeTaskExpansion?: boolean;
  includeDateFallback?: boolean;
};

export type SearchQueryPlan = {
  queries: string[];
  includesEmptyQuery: boolean;
};

export type SearchState<T> = {
  resultsLoading: boolean;
  results: T[];
};

export interface SearchProvider {
  searchBlocks(request: SearchRequest): Block[];
  searchDocuments(request: SearchRequest): DocBlock[];
}

export type NavigationTarget =
  | { kind: "block"; blockId: string; spaceId: string }
  | { kind: "block-in-parent"; parentBlockId: string; spaceId: string; content: string; index: number | string }
  | { kind: "document"; spaceId: string; title: string; content: string; folderId?: string }
  | { kind: "folder"; spaceId: string; folderId: string; title?: string }
  | { kind: "query"; query: string; spaceId: string };

export interface NavigationProvider {
  createUrl(target: NavigationTarget): string;
}

export interface SpaceProvider {
  getEnabledSpaces(): SpaceSQLite[];
  getPrimarySpace(): SpaceSQLite | null;
}

export interface DailyNoteProvider {
  findDailyNoteBlockId(spaceId: string, date: Date): string | null;
  createDailyNoteTarget(spaceId: string, date: Date): NavigationTarget;
}
