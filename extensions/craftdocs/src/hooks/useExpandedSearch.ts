import { useMemo } from "react";
import useSearch, { Block } from "./useSearch";
import useDocumentSearch, { DocBlock } from "./useDocumentSearch";
import { UseDB } from "./useDB";

/**
 * Expands task-related queries to improve search results for task-related content.
 * This function takes a query and returns additional search queries that might
 * help find task-related blocks that don't directly contain the search terms.
 *
 * @param query - The original search query
 * @returns Array of expanded search queries (max 3)
 */
function expandTaskQuery(query: string): string[] {
  const expandedQueries: string[] = [];
  const lowerQuery = query.toLowerCase().trim();
  const taskTerms = ["task", "tasks", "todo", "do"];

  // Check if query contains any task-related terms
  const containsTaskTerm = taskTerms.some((term) => lowerQuery.includes(term));

  if (!containsTaskTerm) {
    return expandedQueries;
  }

  // 1. Basic task/tasks expansion
  if (lowerQuery.includes("tasks")) {
    expandedQueries.push(query.replace(/tasks/gi, "Task"));
  }
  if (lowerQuery.includes("task") && !lowerQuery.includes("tasks")) {
    expandedQueries.push(query.replace(/task/gi, "Tasks"));
  }

  // 2. Enhanced search for task blocks with parent document matching
  // Extract non-task terms from the query for parent document search
  let remainingTerms = query;
  taskTerms.forEach((term) => {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    remainingTerms = remainingTerms.replace(regex, "").trim();
  });

  // If there are remaining terms, create searches that target parent document names
  // This helps find task blocks whose content doesn't include the search terms,
  // but whose parent Task Inbox/Logbook documents help identify them as task-related
  if (remainingTerms.length > 0) {
    expandedQueries.push(`Task Inbox ${remainingTerms}`);
    expandedQueries.push(`Task Logbook ${remainingTerms}`);

    // Also try variations for better matching
    if (lowerQuery.includes("todo") || lowerQuery.includes("do")) {
      expandedQueries.push(`Task ${remainingTerms}`);
    }
  }

  return expandedQueries.slice(0, 3); // Limit to max 3 queries
}

/**
 * Custom hook that safely handles expanded search queries without violating Rules of Hooks.
 * Always calls exactly 3 useSearch hooks regardless of the number of expanded queries.
 *
 * @param db - Database hook result
 * @param query - Original search query
 * @param parsedDate - Optional parsed date for search context
 * @param enableCustomEntries - Whether to enable custom entry expansion
 * @returns Combined search results from all expanded queries
 */
export function useExpandedSearch(
  db: UseDB,
  query: string,
  parsedDate?: Date,
  enableCustomEntries = true
): { resultsLoading: boolean; results: Block[] } {
  // Generate expanded queries (memoized for performance)
  const expandedQueries = useMemo(() => {
    if (!enableCustomEntries || !query.trim()) {
      return ["", "", ""];
    }
    const expanded = expandTaskQuery(query);
    // Pad to ensure we always have exactly 3 queries
    const padded = [...expanded];
    while (padded.length < 3) {
      padded.push("");
    }
    return padded.slice(0, 3);
  }, [query, enableCustomEntries]);

  // Always call exactly 3 hooks to satisfy Rules of Hooks
  const search1 = useSearch(db, expandedQueries[0], parsedDate);
  const search2 = useSearch(db, expandedQueries[1], parsedDate);
  const search3 = useSearch(db, expandedQueries[2], parsedDate);

  // Combine and deduplicate results
  const combinedResults = useMemo(() => {
    const results: Block[] = [];
    const seenBlocks = new Set<string>();

    [search1.results, search2.results, search3.results].forEach((searchResults, index) => {
      // Only process if we have a non-empty query for this search
      if (expandedQueries[index] && searchResults) {
        searchResults.forEach((block) => {
          const blockKey = `${block.spaceID}-${block.id}`;
          if (!seenBlocks.has(blockKey)) {
            seenBlocks.add(blockKey);
            results.push(block);
          }
        });
      }
    });

    return results;
  }, [search1.results, search2.results, search3.results, expandedQueries]);

  // Combine loading states - loading if any search is loading AND has a query
  const isLoading = useMemo(() => {
    return [
      { loading: search1.resultsLoading, hasQuery: !!expandedQueries[0] },
      { loading: search2.resultsLoading, hasQuery: !!expandedQueries[1] },
      { loading: search3.resultsLoading, hasQuery: !!expandedQueries[2] },
    ].some(({ loading, hasQuery }) => loading && hasQuery);
  }, [search1.resultsLoading, search2.resultsLoading, search3.resultsLoading, expandedQueries]);

  return {
    resultsLoading: isLoading,
    results: combinedResults,
  };
}

/**
 * Custom hook that safely handles expanded document search queries without violating Rules of Hooks.
 * Similar to useExpandedSearch but for document-specific searches.
 *
 * @param db - Database hook result
 * @param query - Original search query
 * @param parsedDate - Optional parsed date for search context
 * @param enableCustomEntries - Whether to enable custom entry expansion
 * @returns Combined document search results from all expanded queries
 */
export function useExpandedDocumentSearch(
  db: UseDB,
  query: string,
  parsedDate?: Date,
  enableCustomEntries = true
): { resultsLoading: boolean; results: DocBlock[] } {
  // Generate expanded queries (memoized for performance)
  const expandedQueries = useMemo(() => {
    if (!enableCustomEntries || !query.trim()) {
      return ["", "", ""];
    }
    const expanded = expandTaskQuery(query);
    // Pad to ensure we always have exactly 3 queries
    const padded = [...expanded];
    while (padded.length < 3) {
      padded.push("");
    }
    return padded.slice(0, 3);
  }, [query, enableCustomEntries]);

  // Always call exactly 3 hooks to satisfy Rules of Hooks
  const search1 = useDocumentSearch(db, expandedQueries[0], parsedDate);
  const search2 = useDocumentSearch(db, expandedQueries[1], parsedDate);
  const search3 = useDocumentSearch(db, expandedQueries[2], parsedDate);

  // Combine and deduplicate results
  const combinedResults = useMemo(() => {
    const results: DocBlock[] = [];
    const seenBlocks = new Set<string>();

    [search1.results, search2.results, search3.results].forEach((searchResults, index) => {
      // Only process if we have a non-empty query for this search
      if (expandedQueries[index] && searchResults) {
        searchResults.forEach((docBlock) => {
          const blockKey = `${docBlock.block.spaceID}-${docBlock.block.id}`;
          if (!seenBlocks.has(blockKey)) {
            seenBlocks.add(blockKey);
            results.push(docBlock);
          }
        });
      }
    });

    return results;
  }, [search1.results, search2.results, search3.results, expandedQueries]);

  // Combine loading states - loading if any search is loading AND has a query
  const isLoading = useMemo(() => {
    return [
      { loading: search1.resultsLoading, hasQuery: !!expandedQueries[0] },
      { loading: search2.resultsLoading, hasQuery: !!expandedQueries[1] },
      { loading: search3.resultsLoading, hasQuery: !!expandedQueries[2] },
    ].some(({ loading, hasQuery }) => loading && hasQuery);
  }, [search1.resultsLoading, search2.resultsLoading, search3.resultsLoading, expandedQueries]);

  return {
    resultsLoading: isLoading,
    results: combinedResults,
  };
}
