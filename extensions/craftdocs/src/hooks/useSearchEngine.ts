import { useDeferredValue, useEffect, useRef, useState } from "react";
import type { UseDB } from "./useDB";
import type { SearchRequest, SearchState } from "../providers/types";

export type UseSearchEngineOptions = {
  parsedDate?: Date;
  enabled?: boolean;
  includeTaskExpansion?: boolean;
  includeDateFallback?: boolean;
  debounceMs?: number;
};

const DEFAULT_SEARCH_DEBOUNCE_MS = 80;

export default function useSearchEngine<T>(
  { databasesLoading, databases }: UseDB,
  text: string,
  executeSearch: (request: SearchRequest) => T[],
  {
    parsedDate,
    enabled = true,
    includeTaskExpansion = true,
    includeDateFallback = true,
    debounceMs = DEFAULT_SEARCH_DEBOUNCE_MS,
  }: UseSearchEngineOptions = {},
): SearchState<T> {
  const [state, setState] = useState<SearchState<T>>({ resultsLoading: true, results: [] });
  const deferredText = useDeferredValue(text);
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled) {
      requestId.current += 1;
      setState({ results: [], resultsLoading: false });

      return;
    }

    if (databasesLoading) {
      setState((previousState) => ({ ...previousState, resultsLoading: true }));

      return;
    }

    const currentRequestId = ++requestId.current;

    setState((previousState) => ({ ...previousState, resultsLoading: true }));

    const timeout = setTimeout(() => {
      const results = executeSearch({
        databases,
        query: deferredText,
        parsedDate,
        includeTaskExpansion,
        includeDateFallback,
      });

      if (currentRequestId === requestId.current) {
        setState({ results, resultsLoading: false });
      }
    }, debounceMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [
    databases,
    databasesLoading,
    debounceMs,
    deferredText,
    enabled,
    executeSearch,
    includeDateFallback,
    includeTaskExpansion,
    parsedDate,
  ]);

  return state;
}
