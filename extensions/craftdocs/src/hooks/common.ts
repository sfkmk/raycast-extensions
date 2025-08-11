import { BindParams, Database, SqlValue } from "../../assets/sql-wasm-fts5";
import { Block } from "./useSearch";
import { DocBlock } from "./useDocumentSearch";
import { SEARCH_CONSTANTS } from "../constants";

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

export const limit = SEARCH_CONSTANTS.RESULTS_LIMIT;

export const buildMatchQuery = (str: string): string => {
  if (!str || str.length === 0) return "";

  // Check if this looks like a date query to be more precise
  const isDateLike = /^\d{1,2}\.?\s*[a-zA-ZäöüÄÖÜß]+\s*\d{0,4}$/.test(str.trim());

  const terms = termsForFTS5(str);
  const phrases = phrasesForFTS5(terms, isDateLike);

  return `{content exactMatchContent} : (${phrases.join(") OR (")})`;
};

export const searchBlocks = (database: Database, spaceID: string, query: string, params: BindParams): Block[] => {
  try {
    return database
      .exec(query, params)
      .map((res) => res.values)
      .flat()
      .map(sqlValueArr2Block(spaceID));
  } catch (e) {
    console.error(`db exec error: ${e}`);

    return [];
  }
};

export const prioritizeDailyNotes = (blocks: Block[], parsedDate?: Date): Block[] => {
  if (!parsedDate) return blocks;

  // Format the parsed date to match Craft's internal format (YYYY.MM.DD)
  const isoFormat = formatDateToISO(parsedDate);

  // Separate daily notes from other blocks
  const dailyNotes: Block[] = [];
  const otherBlocks: Block[] = [];

  blocks.forEach((block) => {
    // Check if this is a daily note by looking at document names and content
    if (
      block.entityType === "document" &&
      (block.documentName === isoFormat ||
        block.content === isoFormat ||
        block.documentName?.includes(isoFormat) ||
        block.content?.includes(isoFormat))
    ) {
      dailyNotes.push(block);
    } else {
      otherBlocks.push(block);
    }
  });

  // Return daily notes first, then other blocks
  return [...dailyNotes, ...otherBlocks];
};

const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
};

export const backfillBlocksWithDocumentNames = (database: Database, blocks: Block[]): Block[] => {
  if (blocks.length === 0) {
    return [];
  }

  const documentIDs = uniqueDocumentIDsFromBlocks(blocks);
  const placeholders = new Array(documentIDs.length).fill("?").join(", ");
  const sql = `select documentId, content from BlockSearch where entityType = 'document' and documentId in (${placeholders})`;

  try {
    database
      .exec(sql, documentIDs)
      .map((res) => res.values)
      .flat()
      .map(([documentID, content]) =>
        blocks
          .filter((block) => block.documentID === documentID)
          .forEach((block) => (block.documentName = content as string))
      );

    return blocks;
  } catch (e) {
    console.error(`db exec error: ${e}`);

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
    return database
      .exec(sql, documentIDs)
      .map((res) => res.values)
      .flat()
      .reduce(compactBlocksToDocBlocks(spaceID), [] as DocBlock[]);
  } catch (e) {
    console.error(`db exec error: ${e}`);

    return [];
  }
};

const compactBlocksToDocBlocks =
  (spaceID: string) =>
  (acc: DocBlock[], val: SqlValue[]): DocBlock[] => {
    const block = sqlValueArr2Block(spaceID)(val);

    const docBlock = acc.find((item) => item.block.documentID === block.documentID);

    if (!docBlock) {
      acc.push(createDocBlock(block));
    } else {
      applyBlockToDocBlock(docBlock, block);
    }

    return acc;
  };

const createDocBlock = (block: Block): DocBlock =>
  block.entityType === "document"
    ? ({ block, blocks: [] } as DocBlock)
    : ({ block: { documentID: block.documentID }, blocks: [block] } as DocBlock);

const applyBlockToDocBlock = (docBlock: DocBlock, block: Block) => {
  block.entityType === "document" ? (docBlock.block = block) : docBlock.blocks.push(block);
};

const uniqueDocumentIDsFromBlocks = (blocks: Block[]): string[] => [
  ...new Set(blocks.map((block) => block.documentID)),
];

const termsForFTS5 = (str: string): string[] =>
  str
    .split(/\s+/)
    .map((word) => word.trim())
    .map((word) => word.replace('"', " "))
    .map((word) => `"${word}"`);

const phrasesForFTS5 = (terms: string[], isDateLike = false): string[] => {
  if (isDateLike) {
    // For date-like queries, be more precise and avoid overly broad matches
    const phrases = [terms.join(" ")];

    // Only add exact phrase matching for dates
    if (terms.length > 1) {
      phrases.push(terms.join(" ") + "*");
    }

    return phrases;
  }

  // Original logic for non-date queries
  const phrases = [terms.join(" "), terms.join(" ") + "*"];

  if (terms.length > 1) {
    phrases.push(terms.join("* ") + "*");
  }

  return phrases;
};

const sqlValueArr2Block =
  (spaceID: string) =>
  ([id, content, type, entityType, documentID]: SqlValue[]): Block =>
    ({ id, content, type, entityType, documentID, spaceID } as Block);

/**
 * Combines multiple Block[] arrays while avoiding duplicates.
 * Used to merge results from main search, expanded searches, and ISO date searches.
 *
 * @param mainResults - Primary search results
 * @param expandedResults - Results from expanded task queries
 * @param isoResults - Optional results from ISO date search
 * @returns Combined and deduplicated Block array
 */
export function combineBlockResults(mainResults: Block[], expandedResults: Block[], isoResults?: Block[]): Block[] {
  const combined = mainResults ? [...mainResults] : [];
  const seenBlocks = new Set<string>();

  // Track main results
  combined.forEach((block) => {
    seenBlocks.add(`${block.spaceID}-${block.id}`);
  });

  // Add expanded results (deduplicated)
  if (expandedResults) {
    expandedResults.forEach((block) => {
      const blockKey = `${block.spaceID}-${block.id}`;
      if (!seenBlocks.has(blockKey)) {
        seenBlocks.add(blockKey);
        combined.push(block);
      }
    });
  }

  // Add ISO results (deduplicated)
  if (isoResults) {
    isoResults.forEach((block) => {
      const blockKey = `${block.spaceID}-${block.id}`;
      if (!seenBlocks.has(blockKey)) {
        seenBlocks.add(blockKey);
        combined.push(block);
      }
    });
  }

  return combined;
}

/**
 * Combines multiple DocBlock[] arrays while avoiding duplicates.
 * Used to merge results from main document search, expanded searches, and ISO date searches.
 *
 * @param mainResults - Primary document search results
 * @param expandedResults - Results from expanded task queries
 * @param isoResults - Optional results from ISO date search
 * @returns Combined and deduplicated DocBlock array
 */
export function combineDocBlockResults(
  mainResults: DocBlock[],
  expandedResults: DocBlock[],
  isoResults?: DocBlock[]
): DocBlock[] {
  const combined = mainResults ? [...mainResults] : [];
  const seenBlocks = new Set<string>();

  // Track main results
  combined.forEach((docBlock) => {
    seenBlocks.add(`${docBlock.block.spaceID}-${docBlock.block.id}`);
  });

  // Add expanded results (deduplicated)
  if (expandedResults) {
    expandedResults.forEach((docBlock) => {
      const blockKey = `${docBlock.block.spaceID}-${docBlock.block.id}`;
      if (!seenBlocks.has(blockKey)) {
        seenBlocks.add(blockKey);
        combined.push(docBlock);
      }
    });
  }

  // Add ISO results (deduplicated)
  if (isoResults) {
    isoResults.forEach((docBlock) => {
      const blockKey = `${docBlock.block.spaceID}-${docBlock.block.id}`;
      if (!seenBlocks.has(blockKey)) {
        seenBlocks.add(blockKey);
        combined.push(docBlock);
      }
    });
  }

  return combined;
}
