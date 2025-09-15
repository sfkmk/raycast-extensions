import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { Block } from "../hooks/useSearch";
import Config from "../Config";
import CreateDocumentItem from "./CreateDocumentItem";
import { generateSearchResultsMarkdown } from "../utils/searchHelpers";
import { createDocumentUrl, createBlockUrl } from "../utils/craftUrls";
import { ensureSafeTitle } from "../utils/safety";
import { formatDailyNoteTitle, formatCraftInternalDate } from "../utils/dateTimeFormatter";
import { filterCustomEntries, PopulatedCustomEntry, ExtendedBlock } from "../utils/customEntries";
import { createQueryUrl } from "../utils/craftUrls";
import { formatResultTitle, formatResultSubtitle } from "../utils/resultFormatters";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const spaceID = config?.primarySpace()?.spaceID || config?.getEnabledSpaces()[0]?.spaceID || "";
  const showSpaceInfo = config ? config.getEnabledSpaces().length > 1 : false;

  // Conditionally get custom entries based on preference (memoized)
  const spaceIDs = useMemo(() => {
    return config ? config.getEnabledSpaces().map((space) => space.spaceID) : [];
  }, [config]);

  const customEntries = useMemo(() => {
    return enableCustomEntries ? filterCustomEntries(query, spaceIDs, config || undefined) : [];
  }, [enableCustomEntries, query, spaceIDs, config]);

  // Combine results (memoized)
  const allResults: ExtendedBlock[] = useMemo(
    () => [
      ...customEntries
        .filter((entry) => entry.url !== "") // Only include entries with valid URLs
        .map((entry) => ({ ...entry, isCustomEntry: true as const })),
      ...blocks,
    ],
    [customEntries, blocks],
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchTextChange}
      searchBarAccessory={searchBarAccessory}
      actions={
        query.length > 0 && blocks.length > 0 && spaceID ? (
          <ActionPanel>
            <Action.OpenInBrowser
              title="Create Doc from Results"
              icon={Icon.NewDocument}
              url={createDocumentUrl(
                spaceID,
                `Search results for "${query}"`,
                generateSearchResultsMarkdown(blocks, query, config),
              )}
              shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
            />
          </ActionPanel>
        ) : undefined
      }
    >
      {allResults.map((item) => {
        if ("isCustomEntry" in item) {
          return (
            <CustomEntryItem
              key={`custom-${item.spaceID}-${item.title}`}
              entry={item}
              config={config}
              showSpaceInfo={showSpaceInfo}
              allResults={allResults}
              query={query}
              spaceID={spaceID}
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
              allResults={allResults}
              query={query}
              spaceID={spaceID}
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
                    (block.documentName === isoDateString || block.content === isoDateString),
                );

                return dailyNoteExists ? null : (
                  <List.Item
                    title={`Create the Daily Note for '${formatDailyNoteTitle(
                      isoDateString,
                      dateDisplayFormat,
                      !showCurrentYear,
                    )}'`}
                    icon={Icon.Calendar}
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser
                          title={`Create the Daily Note`}
                          url={createQueryUrl(isoDateString, spaceID)}
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
  allResults,
  query,
  spaceID,
}: {
  entry: PopulatedCustomEntry & { isCustomEntry: true };
  config: Config | null;
  showSpaceInfo?: boolean;
  allResults: ExtendedBlock[];
  query: string;
  spaceID: string;
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
          <Action.CopyToClipboard
            title="Copy Deeplink to Clipboard"
            content={entry.url}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          {spaceID && (
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Create Doc from Results"
                icon={Icon.NewDocument}
                url={createDocumentUrl(
                  spaceID,
                  `Search results for "${query}"`,
                  generateSearchResultsMarkdown(allResults, query, config),
                )}
                shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
              />
            </ActionPanel.Section>
          )}
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
  allResults,
  query,
  spaceID,
}: {
  block: Block;
  config: Config | null;
  showSpaceInfo: boolean;
  dateDisplayFormat: string;
  showCurrentYear: boolean;
  parsedDate?: Date;
  enableCustomEntries: boolean;
  allResults: ExtendedBlock[];
  query: string;
  spaceID: string;
}) => {
  const spaceDisplayName = config?.getSpaceDisplayName(block.spaceID) || block.spaceID;

  // Format document titles if they match ISO date pattern
  // Use consistent formatting utilities
  const formattedTitle = formatResultTitle(block, dateDisplayFormat, !showCurrentYear, enableCustomEntries, parsedDate);
  const formattedDocumentName = formatResultSubtitle(block, dateDisplayFormat, !showCurrentYear);

  // Determine the appropriate icon
  const getIcon = () => {
    if (block.entityType === "document") {
      // Check if this is a task entry
      if (enableCustomEntries && analyzeTaskEntry(block).isTaskEntry) {
        return Icon.List;
      }
      // Check if this is a daily note
      const isContentISODate = /^\d{4}\.\d{2}\.\d{2}$/.test(block.content);
      const isDocumentNameISODate = block.documentName ? /^\d{4}\.\d{2}\.\d{2}$/.test(block.documentName) : false;
      if (isContentISODate || isDocumentNameISODate) {
        return Icon.Calendar;
      }
      return Icon.Document;
    } else {
      // Block within a document
      if (enableCustomEntries && analyzeTaskEntry(block).isTaskEntry) {
        return Icon.CheckCircle;
      }
      return Icon.Text;
    }
  };

  return (
    <List.Item
      icon={getIcon()}
      subtitle={formattedDocumentName}
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
          <Action.OpenInBrowser title="Open in Craft" url={createBlockUrl(block.id, block.spaceID)} />
          <Action.CopyToClipboard
            title="Copy Deeplink to Clipboard"
            content={createBlockUrl(block.id, block.spaceID)}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          {spaceID && (
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Create Doc from Results"
                icon={Icon.NewDocument}
                url={createDocumentUrl(
                  spaceID,
                  `Search results for "${query}"`,
                  generateSearchResultsMarkdown(allResults, query, config),
                )}
                shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
              />
            </ActionPanel.Section>
          )}
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
  const isTasksDoc = normalizedContent === "tasks" || normalizedDocName === "tasks";
  const isTaskEntry = isTaskInbox || isTaskLogbook || isTasksDoc;

  return { isTaskInbox, isTaskLogbook, isTaskEntry };
}
