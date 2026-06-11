import { useCallback } from "react";
import { UseDB } from "./useDB";
import useSearchEngine, { UseSearchEngineOptions } from "./useSearchEngine";
import { DocBlock } from "../lib/search";
import { sqliteSearchProvider } from "../providers/sqliteSearchProvider";
import type { SearchProvider, SearchRequest } from "../providers/types";

type UseDocumentSearchOptions = UseSearchEngineOptions & {
  provider?: Pick<SearchProvider, "searchDocuments">;
};

export default function useDocumentSearch(
  db: UseDB,
  text: string,
  { provider = sqliteSearchProvider, ...options }: UseDocumentSearchOptions = {},
) {
  const executeSearch = useCallback(
    (request: SearchRequest): DocBlock[] => provider.searchDocuments(request),
    [provider],
  );

  return useSearchEngine(db, text, executeSearch, options);
}

export type { DocBlock };
