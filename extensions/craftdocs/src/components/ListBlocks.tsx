import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { ComponentProps } from "react";
import { memo } from "react";
import { CraftConfig } from "../Config";
import CreateDocumentItem from "./CreateDocumentItem";
import { CreateSearchResultsDocumentAction, SearchResultActionPanel } from "./ResultActions";
import { createBlockUrl } from "../utils/craftUrls";
import type { ExtendedSearchItem } from "../utils/customEntries";
import { formatResultSubtitle, formatResultTitle, getResultIcon } from "../utils/resultFormatters";
import type { DailyNoteCreateAction } from "../hooks/useSearchViewModel";
import type { ExtendedResult } from "../utils/searchHelpers";
import type { Block } from "../lib/search";

type SearchBarAccessory = ComponentProps<typeof List>["searchBarAccessory"];

type ListBlocksParams = {
  isLoading: boolean;
  onSearchTextChange: (text: string) => void;
  results: ExtendedResult[];
  query: string;
  config: CraftConfig | null;
  createDocumentSpaceId?: string;
  parsedDate?: Date;
  dateDisplayFormat?: string;
  showCurrentYear?: boolean;
  enableCustomEntries?: boolean;
  showSpaceInfo: boolean;
  dailyNoteCreateAction: DailyNoteCreateAction | null;
  searchBarAccessory?: SearchBarAccessory;
};

const ListBlocks = ({
  isLoading,
  onSearchTextChange,
  results,
  query,
  config,
  createDocumentSpaceId = "",
  parsedDate,
  dateDisplayFormat = "EEE d. MMM yyyy",
  showCurrentYear = false,
  enableCustomEntries = true,
  showSpaceInfo,
  dailyNoteCreateAction,
  searchBarAccessory,
}: ListBlocksParams) => {
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchTextChange}
      searchBarAccessory={searchBarAccessory}
      actions={
        query.trim().length > 0 && results.length > 0 && createDocumentSpaceId ? (
          <ActionPanel>
            <CreateSearchResultsDocumentAction
              query={query}
              allResults={results}
              createDocumentSpaceId={createDocumentSpaceId}
              config={config}
              shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
            />
          </ActionPanel>
        ) : undefined
      }
    >
      {results.map((item) =>
        "isCustomEntry" in item ? (
          <CustomEntryItem
            key={`custom-${item.spaceID}-${item.title}`}
            entry={item}
            config={config}
            showSpaceInfo={showSpaceInfo}
            allResults={results}
            createDocumentSpaceId={createDocumentSpaceId}
            query={query}
          />
        ) : (
          <BlockItem
            key={`${item.spaceID}-${item.id}`}
            block={item}
            config={config}
            showSpaceInfo={showSpaceInfo}
            allResults={results}
            createDocumentSpaceId={createDocumentSpaceId}
            dateDisplayFormat={dateDisplayFormat}
            enableCustomEntries={enableCustomEntries}
            parsedDate={parsedDate}
            query={query}
            showCurrentYear={showCurrentYear}
          />
        ),
      )}
      {query.length > 0 && (
        <List.Section title="Create new Document">
          {dailyNoteCreateAction ? (
            <List.Item
              title={dailyNoteCreateAction.title}
              icon={Icon.Calendar}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Create the Daily Note" url={dailyNoteCreateAction.url} />
                </ActionPanel>
              }
            />
          ) : null}
          <CreateDocumentItem query={query} spaceID={createDocumentSpaceId} />
        </List.Section>
      )}
    </List>
  );
};

const CustomEntryItem = memo(function CustomEntryItem({
  entry,
  config,
  showSpaceInfo,
  allResults,
  createDocumentSpaceId,
  query,
}: {
  entry: ExtendedSearchItem;
  config: CraftConfig | null;
  showSpaceInfo?: boolean;
  allResults: ExtendedResult[];
  createDocumentSpaceId: string;
  query: string;
}) {
  const spaceDisplayName = config?.getSpaceDisplayName(entry.spaceID) || entry.spaceID;

  return (
    <List.Item
      icon={entry.icon}
      title={entry.title}
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
        <SearchResultActionPanel
          title={`Open ${entry.title}`}
          url={entry.url}
          query={query}
          allResults={allResults}
          createDocumentSpaceId={createDocumentSpaceId}
          config={config}
        />
      }
    />
  );
});

const BlockItem = memo(function BlockItem({
  block,
  config,
  showSpaceInfo,
  allResults,
  createDocumentSpaceId,
  dateDisplayFormat,
  enableCustomEntries,
  parsedDate,
  query,
  showCurrentYear,
}: {
  block: Block;
  config: CraftConfig | null;
  showSpaceInfo?: boolean;
  allResults: ExtendedResult[];
  createDocumentSpaceId: string;
  dateDisplayFormat: string;
  enableCustomEntries: boolean;
  parsedDate?: Date;
  query: string;
  showCurrentYear: boolean;
}) {
  const spaceDisplayName = config?.getSpaceDisplayName(block.spaceID) || block.spaceID;
  const title = formatResultTitle(block, dateDisplayFormat, !showCurrentYear, enableCustomEntries);
  const subtitle = formatResultSubtitle(block, dateDisplayFormat, !showCurrentYear);
  const craftUrl = createBlockUrl(block.id, block.spaceID);

  return (
    <List.Item
      icon={getResultIcon(block, enableCustomEntries, parsedDate)}
      subtitle={subtitle}
      title={title}
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
        <SearchResultActionPanel
          title="Open in Craft"
          url={craftUrl}
          query={query}
          allResults={allResults}
          createDocumentSpaceId={createDocumentSpaceId}
          config={config}
        />
      }
    />
  );
});

export default memo(ListBlocks);
