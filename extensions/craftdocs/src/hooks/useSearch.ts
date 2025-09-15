import { useEffect, useState } from "react";
import { UseDB } from "./useDB";
import {
  backfillBlocksWithDocumentNames,
  buildMatchQuery,
  limit,
  searchBlocks,
  searchQuery,
  searchQueryOnEmptyParams,
} from "./common";
import { prioritizeDailyNotes, combineBlockResults } from "../utils/searchHelpers";
import { parseISODate, isISODatePattern } from "../utils/dateTimeFormatter";

export type Block = {
  id: string;
  spaceID: string;
  content: string;
  type: string;
  entityType: string;
  documentID: string;
  documentName: string;
};

export default function useSearch({ databasesLoading, databases }: UseDB, text: string) {
  const [state, setState] = useState({ resultsLoading: true, results: [] as Block[] });

  useEffect(() => {
    if (databasesLoading) return;

    setState((prev) => ({ ...prev, resultsLoading: true }));

    const matchQuery = buildMatchQuery(text);
    const [query, params] =
      matchQuery.length > 0 ? [searchQuery, [matchQuery, limit]] : [searchQueryOnEmptyParams, [limit]];

    const blocksOfSpaces = databases
      .map(({ database, spaceID }) => ({ database, blocks: searchBlocks(database, spaceID, query, params) }))
      .map(({ database, blocks }) => backfillBlocksWithDocumentNames(database, blocks));

    let results = blocksOfSpaces.flat();

    // Check for task-related queries and expand search
    const isTaskQuery = /\b(todo|task|tasks)\b/i.test(text.trim());
    let expandedResults: Block[] = [];

    if (isTaskQuery) {
      // Search for Task Inbox and Task Logbook entries
      const taskQueries = ["Task Inbox", "Task Logbook", "Tasks"];

      for (const taskQuery of taskQueries) {
        const taskMatchQuery = buildMatchQuery(taskQuery);
        const [taskSearchQuery, taskParams] =
          taskMatchQuery.length > 0 ? [query, [taskMatchQuery, limit]] : [searchQueryOnEmptyParams, [limit]];

        const taskBlocksOfSpaces = databases
          .map(({ database, spaceID }) => ({
            database,
            blocks: searchBlocks(database, spaceID, taskSearchQuery, taskParams),
          }))
          .map(({ database, blocks }) => backfillBlocksWithDocumentNames(database, blocks));

        expandedResults = combineBlockResults(expandedResults, taskBlocksOfSpaces.flat());
      }

      // Combine main results with expanded task results
      results = combineBlockResults(results, expandedResults);
    }

    // Check if query looks like a date and prioritize daily notes
    const isDateQuery = isISODatePattern(text.trim()) || /^\d{1,2}\.?\s*[a-zA-ZäöüÄÖÜß]+\s*\d{0,4}$/.test(text.trim());
    if (isDateQuery) {
      const parsedDate = parseISODate(text.trim());
      if (parsedDate) {
        results = prioritizeDailyNotes(results, parsedDate);
      }
    }

    setState({ results, resultsLoading: false });
    console.debug(
      `got ${results.length} results for query search '${text}'${isTaskQuery ? " (task expanded)" : ""}${isDateQuery ? " (date prioritized)" : ""}`,
    );
  }, [databasesLoading, text]);

  return state;
}
