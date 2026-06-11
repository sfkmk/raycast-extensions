import { useCallback } from "react";
import { UseDB } from "./useDB";
import useSearchEngine, { UseSearchEngineOptions } from "./useSearchEngine";
import { Block } from "../lib/search";
import { sqliteSearchProvider } from "../providers/sqliteSearchProvider";
import type { SearchProvider, SearchRequest } from "../providers/types";

type UseSearchOptions = UseSearchEngineOptions & {
  provider?: Pick<SearchProvider, "searchBlocks">;
};

export default function useSearch(
  db: UseDB,
  text: string,
  { provider = sqliteSearchProvider, ...options }: UseSearchOptions = {},
) {
  const executeSearch = useCallback((request: SearchRequest): Block[] => provider.searchBlocks(request), [provider]);

  return useSearchEngine(db, text, executeSearch, options);
}
