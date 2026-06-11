import { searchBlocksAcrossDatabases, searchDocumentsAcrossDatabases } from "../lib/search";
import {
  buildDateSearchQueries,
  combineBlockResults,
  combineDocBlockResults,
  consolidateTaskBlocks,
  expandTaskQuery,
  normalizeSearchQuery,
  prioritizeDailyNotes,
} from "../utils/searchHelpers";
import type { SearchProvider, SearchQueryPlan, SearchRequest } from "./types";

export const MAX_SEARCH_QUERY_COUNT = 4;

export const buildSearchQueryPlan = ({
  query,
  parsedDate,
  includeTaskExpansion = true,
  includeDateFallback = true,
}: Omit<SearchRequest, "databases">): SearchQueryPlan => {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return { queries: [""], includesEmptyQuery: true };
  }

  const candidates = [
    normalizedQuery,
    ...(includeTaskExpansion ? expandTaskQuery(normalizedQuery) : []),
    ...(includeDateFallback ? buildDateSearchQueries(parsedDate, normalizedQuery) : []),
  ];
  const queries = [...new Set(candidates)].slice(0, MAX_SEARCH_QUERY_COUNT);

  return { queries, includesEmptyQuery: false };
};

export const sqliteSearchProvider: SearchProvider = {
  searchBlocks(request) {
    const queryPlan = buildSearchQueryPlan(request);
    const resultGroups = queryPlan.queries.map((query) =>
      searchBlocksAcrossDatabases(request.databases, query, {
        parsedDate: request.parsedDate,
        consolidateTasks: false,
      }),
    );
    const combinedResults = combineBlockResults(...resultGroups);

    return prioritizeDailyNotes(consolidateTaskBlocks(combinedResults), request.parsedDate);
  },

  searchDocuments(request) {
    const queryPlan = buildSearchQueryPlan(request);
    const resultGroups = queryPlan.queries.map((query) =>
      searchDocumentsAcrossDatabases(request.databases, query, { parsedDate: request.parsedDate }),
    );

    return combineDocBlockResults(...resultGroups);
  },
};
