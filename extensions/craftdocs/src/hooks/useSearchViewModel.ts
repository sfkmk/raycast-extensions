import { useMemo } from "react";
import type { CraftConfig } from "../Config";
import type { Block, DocBlock } from "../lib/search";
import { createQueryUrl } from "../utils/craftUrls";
import { applyCentralizedBias, filterCustomEntries, shouldBiasEntry } from "../utils/customEntries";
import { formatCraftInternalDate, formatDailyNoteTitle } from "../utils/dateTimeFormatter";
import type { ExtendedResult } from "../utils/searchHelpers";

export type DailyNoteCreateAction = {
  title: string;
  url: string;
};

type SharedViewModelParams = {
  query: string;
  config: CraftConfig | null;
  createDocumentSpaceId: string;
  parsedDate?: Date;
  dateDisplayFormat: string;
  showCurrentYear: boolean;
};

type BlockSearchViewModelParams = SharedViewModelParams & {
  blocks: Block[];
  enableCustomEntries: boolean;
};

type DocumentSearchViewModelParams = SharedViewModelParams & {
  results: DocBlock[];
};

export const useBlockSearchViewModel = ({
  blocks,
  query,
  config,
  createDocumentSpaceId,
  parsedDate,
  dateDisplayFormat,
  showCurrentYear,
  enableCustomEntries,
}: BlockSearchViewModelParams) => {
  const showSpaceInfo = config ? config.enabledSpaces.length > 1 : false;
  const spaceIds = useMemo(() => config?.enabledSpaces.map((space) => space.spaceID) || [], [config]);
  const customEntries = useMemo(
    () =>
      enableCustomEntries
        ? filterCustomEntries(query, spaceIds, config).map((entry) => ({ ...entry, isCustomEntry: true as const }))
        : [],
    [config, enableCustomEntries, query, spaceIds],
  );
  const results = useMemo<ExtendedResult[]>(
    () => applyCentralizedBias([...customEntries, ...blocks], (item) => shouldBiasEntry(item, query)),
    [blocks, customEntries, query],
  );
  const dailyNoteCreateAction = useMemo(
    () => buildDailyNoteCreateAction(blocks, { createDocumentSpaceId, dateDisplayFormat, parsedDate, showCurrentYear }),
    [blocks, createDocumentSpaceId, dateDisplayFormat, parsedDate, showCurrentYear],
  );

  return { dailyNoteCreateAction, results, showSpaceInfo };
};

export const useDocumentSearchViewModel = ({
  results,
  config,
  createDocumentSpaceId,
  parsedDate,
  dateDisplayFormat,
  showCurrentYear,
}: DocumentSearchViewModelParams) => {
  const showSpaceInfo = config ? config.enabledSpaces.length > 1 : false;
  const allResults = useMemo(() => results.map((doc) => doc.block), [results]);
  const dailyNoteCreateAction = useMemo(
    () =>
      buildDailyNoteCreateAction(allResults, { createDocumentSpaceId, dateDisplayFormat, parsedDate, showCurrentYear }),
    [allResults, createDocumentSpaceId, dateDisplayFormat, parsedDate, showCurrentYear],
  );

  return { allResults, dailyNoteCreateAction, showSpaceInfo };
};

const buildDailyNoteCreateAction = (
  blocks: Block[],
  {
    createDocumentSpaceId,
    dateDisplayFormat,
    parsedDate,
    showCurrentYear,
  }: Pick<SharedViewModelParams, "createDocumentSpaceId" | "dateDisplayFormat" | "parsedDate" | "showCurrentYear">,
): DailyNoteCreateAction | null => {
  if (!parsedDate || !createDocumentSpaceId) {
    return null;
  }

  const craftDate = formatCraftInternalDate(parsedDate);
  const dailyNoteExists = blocks.some(
    (block) => block.entityType === "document" && (block.content === craftDate || block.documentName === craftDate),
  );

  if (dailyNoteExists) {
    return null;
  }

  return {
    title: `Create the Daily Note for '${formatDailyNoteTitle(craftDate, dateDisplayFormat, !showCurrentYear)}'`,
    url: createQueryUrl(craftDate, createDocumentSpaceId),
  };
};
