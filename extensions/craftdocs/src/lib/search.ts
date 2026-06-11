import { BindParams, Database, SqlValue } from "../../assets/sql-wasm-fts5";
import { DatabaseWrap } from "./databaseLoader";
import {
  consolidateTaskBlocks,
  isDateLikeSearchQuery,
  normalizeSearchQuery,
  prioritizeDailyNotes,
} from "../utils/searchHelpers";

export type Block = {
  id: string;
  spaceID: string;
  content: string;
  type: string;
  entityType: string;
  documentID: string;
  documentName: string;
};

export type DocBlock = {
  block: Block;
  blocks: Block[];
};

export const searchQuery = `
SELECT id, content, type, entityType, documentId
FROM BlockSearch(?)
ORDER BY rank + customRank
LIMIT ?
`;

export const searchQueryOnEmptyParams = `
SELECT id, content, type, entityType, documentId
FROM BlockSearch
ORDER BY customRank
LIMIT ?
`;

export const searchQueryDocumentsOnEmptyParams = `
SELECT id, content, type, entityType, documentId
FROM BlockSearch
WHERE entityType = 'document'
ORDER BY customRank
LIMIT ?
`;

export const limit = 40;

export const buildMatchQuery = (str: string): string => {
  const normalized = normalizeSearchQuery(str);

  if (!normalized) {
    return "";
  }

  const terms = termsForFTS5(normalized);
  const phrases = phrasesForFTS5(terms, isDateLikeSearchQuery(normalized));

  return `{content exactMatchContent} : (${phrases.join(") OR (")})`;
};

export const filterDatabasesBySpaceId = (databases: DatabaseWrap[], selectedSpaceId: string | null | undefined) => {
  if (!selectedSpaceId || selectedSpaceId === "all") {
    return databases;
  }

  return databases.filter((database) => database.spaceID === selectedSpaceId);
};

export const resolveCreateDocumentSpaceId = ({
  selectedSpaceId,
  primarySpaceId,
}: {
  selectedSpaceId: string | null | undefined;
  primarySpaceId: string | null | undefined;
}) => {
  if (selectedSpaceId && selectedSpaceId !== "all") {
    return selectedSpaceId;
  }

  return primarySpaceId || "";
};

type SearchOptions = {
  parsedDate?: Date;
  consolidateTasks?: boolean;
};

export const searchBlocksAcrossDatabases = (
  databases: DatabaseWrap[],
  text: string,
  options: SearchOptions = {},
): Block[] => {
  const matchQuery = buildMatchQuery(text);
  const [query, params] =
    matchQuery.length > 0 ? [searchQuery, [matchQuery, limit]] : [searchQueryOnEmptyParams, [limit]];

  const results = databases
    .map(({ database, spaceID }) => ({ database, blocks: searchBlocks(database, spaceID, query, params) }))
    .map(({ database, blocks }) => backfillBlocksWithDocumentNames(database, blocks))
    .flat();

  const consolidatedResults = options.consolidateTasks === false ? results : consolidateTaskBlocks(results);

  return prioritizeDailyNotes(consolidatedResults, options.parsedDate);
};

export const searchDocumentsAcrossDatabases = (
  databases: DatabaseWrap[],
  text: string,
  options: SearchOptions = {},
): DocBlock[] => {
  const matchQuery = buildMatchQuery(text);
  const [query, params] =
    matchQuery.length > 0 ? [searchQuery, [matchQuery, limit]] : [searchQueryDocumentsOnEmptyParams, [limit]];

  const results = databases
    .map(({ database, spaceID }) => ({ database, spaceID, blocks: searchBlocks(database, spaceID, query, params) }))
    .map(({ database, spaceID, blocks }) => documentize(database, spaceID, blocks))
    .flat();

  return results.map((docBlock) => ({
    ...docBlock,
    blocks: prioritizeDailyNotes(docBlock.blocks, options.parsedDate),
  }));
};

export const searchBlocks = (database: Database, spaceID: string, query: string, params: BindParams): Block[] => {
  try {
    return database
      .exec(query, params)
      .map((result) => result.values)
      .flat()
      .map(sqlValueArrToBlock(spaceID));
  } catch (error) {
    console.error(`db exec error: ${error}`);

    return [];
  }
};

export const backfillBlocksWithDocumentNames = (database: Database, blocks: Block[]): Block[] => {
  if (blocks.length === 0) {
    return [];
  }

  const documentIDs = uniqueDocumentIDsFromBlocks(blocks);
  const placeholders = new Array(documentIDs.length).fill("?").join(", ");
  const sql = `select documentId, content from BlockSearch where entityType = 'document' and documentId in (${placeholders})`;
  const documentNames = new Map<string, string>();

  try {
    database
      .exec(sql, documentIDs)
      .map((result) => result.values)
      .flat()
      .forEach(([documentID, content]) => {
        documentNames.set(documentID as string, content as string);
      });

    return blocks.map((block) => ({
      ...block,
      documentName: documentNames.get(block.documentID) || block.documentName,
    }));
  } catch (error) {
    console.error(`db exec error: ${error}`);

    return [];
  }
};

export const documentize = (database: Database, spaceID: string, blocks: Block[]): DocBlock[] => {
  if (blocks.length === 0) {
    return [];
  }

  const documentIDs = uniqueDocumentIDsFromBlocks(blocks);
  const placeholders = new Array(documentIDs.length).fill("?").join(", ");
  const sql = `SELECT id, content, type, entityType, documentId FROM BlockSearch WHERE documentId in (${placeholders})`;

  try {
    const documentsById = database
      .exec(sql, documentIDs)
      .map((result) => result.values)
      .flat()
      .reduce(compactBlocksToDocBlocks(spaceID), new Map<string, DocBlock>());

    return [...documentsById.values()];
  } catch (error) {
    console.error(`db exec error: ${error}`);

    return [];
  }
};

const compactBlocksToDocBlocks =
  (spaceID: string) =>
  (accumulator: Map<string, DocBlock>, value: SqlValue[]): Map<string, DocBlock> => {
    const block = sqlValueArrToBlock(spaceID)(value);
    const key = block.documentID || block.id;
    const existing = accumulator.get(key);

    if (!existing) {
      accumulator.set(key, createDocBlock(block));
      return accumulator;
    }

    if (block.entityType === "document") {
      existing.block = block;
    } else {
      existing.blocks.push(block);
    }

    return accumulator;
  };

const createDocBlock = (block: Block): DocBlock =>
  block.entityType === "document"
    ? { block, blocks: [] }
    : {
        block: {
          id: block.documentID,
          spaceID: block.spaceID,
          content: block.documentName,
          type: "document",
          entityType: "document",
          documentID: block.documentID,
          documentName: block.documentName,
        },
        blocks: [block],
      };

const uniqueDocumentIDsFromBlocks = (blocks: Block[]): string[] => {
  return [...new Set(blocks.map((block) => block.documentID))];
};

const termsForFTS5 = (str: string): string[] => {
  const normalized = normalizeSearchQuery(str);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\s+/)
    .map((word) => word.trim())
    .map((word) => word.replace(/"/g, " "))
    .map((word) => `"${word}"`);
};

const phrasesForFTS5 = (terms: string[], isDateLike = false): string[] => {
  if (isDateLike) {
    return terms.length > 1 ? [terms.join(" "), `${terms.join(" ")}*`] : [terms.join(" ")];
  }

  const phrases = [terms.join(" "), `${terms.join(" ")}*`];

  if (terms.length > 1) {
    phrases.push(`${terms.join("* ")}*`);
  }

  return phrases;
};

const sqlValueArrToBlock =
  (spaceID: string) =>
  ([id, content, type, entityType, documentID]: SqlValue[]): Block =>
    ({ id, content, type, entityType, documentID, documentName: "", spaceID }) as Block;
