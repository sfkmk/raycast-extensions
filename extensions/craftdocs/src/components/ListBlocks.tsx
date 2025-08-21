import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import React, { useMemo } from "react";
import { Block } from "../hooks/useSearch";
import Config from "../Config";
import CreateDocumentItem from "./CreateDocumentItem";
import { formatDailyNoteTitle, formatCraftInternalDate } from "../utils/dateTimeFormatter";
import { ensureSafeTitle } from "../utils/safety";
import {
  filterCustomEntries,
  isTaskInboxDocument,
  isTaskInboxBlock,
  isDailyNoteBlock,
  PopulatedCustomEntry,
  shouldBiasEntry,
  applyCentralizedBias,
  ExtendedBlock,
} from "../utils/customEntries";

type ListBlocksParams = {
  isLoading: boolean;
  onSearchTextChange: (text: string) => void;
  blocks: Block[];
  query: string;
  config: Config | null;
  parsedDate?: Date;
  dateDisplayFormat: string;
  showCurrentYear: boolean;
  enableCustomEntries: boolean;
  searchBarAccessory?: any; // Necessary due to Raycast API type conflicts. Keep it that way.
};

export default function ListBlocks(params: ListBlocksParams) {
  const {
    isLoading,
    onSearchTextChange,
    blocks,
    query,
    config,
    parsedDate,
    dateDisplayFormat,
    showCurrentYear,
    enableCustomEntries,
    searchBarAccessory,
  } = params;
  const spaceID = config?.primarySpace()?.spaceID || "";
  const showSpaceInfo = config ? config.getEnabledSpaces().length > 1 : false;

  // Conditionally get custom entries and apply features based on preference (memoized)
  const spaceIDs = useMemo(() => {
    return config ? config.getEnabledSpaces().map((space) => space.spaceID) : [];
  }, [config]);

  const customEntries = useMemo(() => {
    return enableCustomEntries ? filterCustomEntries(query, spaceIDs) : [];
  }, [enableCustomEntries, query, spaceIDs]);

  // Conditionally consolidate Task Inbox/Logbook entries per space (memoized)
  const processedBlocks = useMemo(() => {
    return enableCustomEntries ? consolidateTaskEntries(blocks) : blocks;
  }, [enableCustomEntries, blocks]);

  // Combine results (memoized)
  const allResults: ExtendedBlock[] = useMemo(
    () => [
      ...customEntries
        .filter((entry) => entry.url !== "") // Only include entries with valid URLs
        .map((entry) => ({ ...entry, isCustomEntry: true as const })),
      ...processedBlocks,
    ],
    [customEntries, processedBlocks]
  );

  // Conditionally apply centralized bias sorting (memoized for performance)
  const sortedResults = useMemo(() => {
    return enableCustomEntries
      ? applyCentralizedBias(allResults, query, (item) => shouldBiasEntry(item, query))
      : allResults;
  }, [allResults, query, enableCustomEntries]);

  return (
    <List isLoading={isLoading} onSearchTextChange={onSearchTextChange} searchBarAccessory={searchBarAccessory}>
      {sortedResults.map((item) => {
        if ("isCustomEntry" in item) {
          return (
            <CustomEntryItem
              key={`custom-${item.spaceID}-${item.title}`}
              entry={item}
              config={config}
              showSpaceInfo={showSpaceInfo}
            />
          );
        } else {
          return (
            <BlockItem
              key={`${item.spaceID}-${item.id}`}
              block={item}
              config={config}
              showSpaceInfo={showSpaceInfo}
              dateDisplayFormat={dateDisplayFormat}
              showCurrentYear={showCurrentYear}
              parsedDate={parsedDate}
              enableCustomEntries={enableCustomEntries}
            />
          );
        }
      })}
      {query.length > 0 && (
        <List.Section title="Create new Document">
          {parsedDate
            ? (() => {
                const isoDateString = formatCraftInternalDate(parsedDate);
                const dailyNoteExists = blocks.some(
                  (block) =>
                    block.entityType === "document" &&
                    (block.documentName === isoDateString || block.content === isoDateString)
                );

                return dailyNoteExists ? null : (
                  <List.Item
                    title={`Create the Daily Note for '${formatDailyNoteTitle(
                      isoDateString,
                      dateDisplayFormat,
                      !showCurrentYear
                    )}'`}
                    icon={Icon.Calendar}
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser
                          title={`Create the Daily Note`}
                          url={`craftdocs://openByQuery?query=${isoDateString}&spaceId=${spaceID}`}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })()
            : null}
          <CreateDocumentItem query={query} spaceID={spaceID} />
        </List.Section>
      )}
    </List>
  );
}

const CustomEntryItem = ({
  entry,
  config,
  showSpaceInfo,
}: {
  entry: PopulatedCustomEntry & { isCustomEntry: true };
  config: Config | null;
  showSpaceInfo?: boolean;
}) => {
  const spaceDisplayName = config?.getSpaceDisplayName(entry.spaceID) || entry.spaceID;

  return (
    <List.Item
      icon={entry.icon}
      title={ensureSafeTitle(entry.title, [`Entry title unknown`])}
      accessories={
        showSpaceInfo
          ? [
              {
                tag: {
                  value: spaceDisplayName,
                  color: Color.SecondaryText,
                },
              },
            ]
          : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={`Open ${entry.title}`} url={entry.url} />
        </ActionPanel>
      }
    />
  );
};

const BlockItem = ({
  block,
  config,
  showSpaceInfo,
  dateDisplayFormat,
  showCurrentYear,
  parsedDate,
  enableCustomEntries,
}: {
  block: Block;
  config: Config | null;
  showSpaceInfo?: boolean;
  dateDisplayFormat: string;
  showCurrentYear: boolean;
  parsedDate?: Date;
  enableCustomEntries: boolean;
}) => {
  const spaceDisplayName = config?.getSpaceDisplayName(block.spaceID) || block.spaceID;

  // Format document titles if they match ISO date pattern
  const formattedDocumentName = block.documentName
    ? formatDailyNoteTitle(block.documentName, dateDisplayFormat, !showCurrentYear)
    : block.documentName;

  const formattedTitle = (() => {
    if (block.entityType === "document") {
      // Check if this is a task entry and rename it to "Tasks" (only if custom entries enabled)
      if (
        enableCustomEntries &&
        (isTaskInboxDocument(block.content, block.entityType) ||
          isTaskInboxDocument(block.documentName || "", block.entityType))
      ) {
        return "Tasks";
      }
      return formatDailyNoteTitle(block.documentName || block.content, dateDisplayFormat, !showCurrentYear);
    } else {
      return block.content;
    }
  })();

  // Determine the appropriate icon
  const getIcon = () => {
    if (block.entityType === "document") {
      // Check for Task Inbox document (exact match) - only if custom entries enabled
      if (enableCustomEntries && isTaskInboxDocument(block.content, block.entityType)) {
        return Icon.List;
      }
      // Check for daily note
      if (isDailyNoteBlock(block, parsedDate)) {
        return Icon.Calendar;
      }
      return Icon.Document;
    } else {
      // For blocks, check if from Task Inbox - only if custom entries enabled
      if (enableCustomEntries && isTaskInboxBlock(block.documentName)) {
        return Icon.CheckCircle;
      }
      return Icon.Text;
    }
  };

  return (
    <List.Item
      icon={getIcon()}
      subtitle={block.entityType === "document" ? undefined : formattedDocumentName}
      title={ensureSafeTitle(formattedTitle, [block.documentName, block.content, `Document ${block.id}`])}
      accessories={
        showSpaceInfo
          ? [
              {
                tag: {
                  value: spaceDisplayName,
                  color: Color.SecondaryText,
                },
              },
            ]
          : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Craft"
            url={`craftdocs://open?blockId=${block.id}&spaceId=${block.spaceID}`}
          />
        </ActionPanel>
      }
    />
  );
};

/**
 * Checks if a block is a task-related entry (Task Inbox or Task Logbook).
 *
 * @param block - The block to check
 * @returns Object with task type information
 */
function analyzeTaskEntry(block: Block): { isTaskInbox: boolean; isTaskLogbook: boolean; isTaskEntry: boolean } {
  if (block.entityType !== "document") {
    return { isTaskInbox: false, isTaskLogbook: false, isTaskEntry: false };
  }

  const normalizedContent = block.content.toLowerCase().trim();
  const normalizedDocName = (block.documentName || "").toLowerCase().trim();

  const isTaskInbox = normalizedContent === "task inbox" || normalizedDocName === "task inbox";
  const isTaskLogbook = normalizedContent === "task logbook" || normalizedDocName === "task logbook";
  const isTaskEntry = isTaskInbox || isTaskLogbook;

  return { isTaskInbox, isTaskLogbook, isTaskEntry };
}

/**
 * Collects all task entries grouped by space ID.
 *
 * @param blocks - Array of blocks to process
 * @returns Map of spaceID to task entries in that space
 */
function collectTaskEntriesBySpace(blocks: Block[]): Map<string, Block[]> {
  const taskEntriesBySpace = new Map<string, Block[]>();

  blocks.forEach((block) => {
    const { isTaskEntry } = analyzeTaskEntry(block);

    if (isTaskEntry) {
      if (!taskEntriesBySpace.has(block.spaceID)) {
        taskEntriesBySpace.set(block.spaceID, []);
      }
      const spaceEntries = taskEntriesBySpace.get(block.spaceID);
      if (spaceEntries) {
        spaceEntries.push(block);
      }
    }
  });

  return taskEntriesBySpace;
}

/**
 * Determines if a Task Inbox entry should be skipped due to Task Logbook presence.
 *
 * @param block - The block to check
 * @param taskEntriesBySpace - Map of task entries by space
 * @returns True if this Task Inbox entry should be skipped
 */
function shouldSkipTaskEntry(block: Block, taskEntriesBySpace: Map<string, Block[]>): boolean {
  const { isTaskInbox } = analyzeTaskEntry(block);

  if (!isTaskInbox) {
    return false;
  }

  const taskEntries = taskEntriesBySpace.get(block.spaceID) || [];
  const hasTaskLogbook = taskEntries.some((entry) => {
    const { isTaskLogbook } = analyzeTaskEntry(entry);
    return isTaskLogbook;
  });

  // Skip Task Inbox if Task Logbook exists in same space
  return hasTaskLogbook;
}

/**
 * Consolidates Task Inbox/Logbook entries per space to avoid duplicates.
 * When both Task Inbox and Task Logbook exist in the same space, only Task Logbook is kept.
 *
 * @param blocks - Array of blocks to consolidate
 * @returns Consolidated array with duplicate task entries removed
 */
function consolidateTaskEntries(blocks: Block[]): Block[] {
  const result: Block[] = [];
  const taskEntriesBySpace = collectTaskEntriesBySpace(blocks);

  blocks.forEach((block) => {
    const { isTaskEntry } = analyzeTaskEntry(block);

    if (isTaskEntry) {
      // Apply consolidation logic for task entries
      if (!shouldSkipTaskEntry(block, taskEntriesBySpace)) {
        result.push(block);
      }
    } else {
      // Add all non-task entries
      result.push(block);
    }
  });

  return result;
}
