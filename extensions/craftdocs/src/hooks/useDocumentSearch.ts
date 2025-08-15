import { useEffect, useState } from "react";
import { UseDB } from "./useDB";
import { Block } from "./useSearch";
import {
  buildMatchQuery,
  documentize,
  limit,
  prioritizeDailyNotes,
  searchBlocks,
  searchQuery,
  searchQueryDocumentsOnEmptyParams,
} from "./common";

type UseDocumentSearch = {
  resultsLoading: boolean;
  results: DocBlock[];
};

export type DocBlock = {
  block: Block;
  blocks: Block[];
};

export default function useDocumentSearch({ databasesLoading, databases }: UseDB, text: string, parsedDate?: Date) {
  const [state, setState] = useState<UseDocumentSearch>({ resultsLoading: true, results: [] });

  useEffect(() => {
    if (databasesLoading) return;

    setState((prev) => ({ ...prev, resultsLoading: true }));

    const matchQuery = buildMatchQuery(text);
    const [query, params] =
      matchQuery.length > 0 ? [searchQuery, [matchQuery, limit]] : [searchQueryDocumentsOnEmptyParams, [limit]];

    const results = databases
      .map(({ database, spaceID }) => ({ database, spaceID, blocks: searchBlocks(database, spaceID, query, params) }))
      .map(({ database, spaceID, blocks }) => documentize(database, spaceID, blocks));

    // Apply daily note prioritization to the flattened results
    const flatResults = results.flat();
    const prioritizedResults = flatResults.map((docBlock) => ({
      ...docBlock,
      blocks: prioritizeDailyNotes(docBlock.blocks, parsedDate),
    }));

    setState({ resultsLoading: false, results: prioritizedResults });
  }, [databasesLoading, text, parsedDate]);

  return state;
}
