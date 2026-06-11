import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { ComponentProps } from "react";
import { memo } from "react";
import { CraftConfig } from "../Config";
import { DocBlock } from "../lib/search";
import CreateDocumentItem from "./CreateDocumentItem";
import { SearchResultActionPanel } from "./ResultActions";
import { createBlockUrl } from "../utils/craftUrls";
import { formatResultTitle } from "../utils/resultFormatters";
import type { DailyNoteCreateAction } from "../hooks/useSearchViewModel";
import type { ExtendedResult } from "../utils/searchHelpers";

type SearchBarAccessory = ComponentProps<typeof List>["searchBarAccessory"];

type ListDocBlocksParams = {
  resultsLoading: boolean;
  setQuery: (query: string) => void;
  results: DocBlock[];
  query: string;
  config: CraftConfig | null;
  createDocumentSpaceId?: string;
  parsedDate?: Date;
  dateDisplayFormat?: string;
  showCurrentYear?: boolean;
  showSpaceInfo: boolean;
  allResults: ExtendedResult[];
  dailyNoteCreateAction: DailyNoteCreateAction | null;
  searchBarAccessory?: SearchBarAccessory;
};

function ListDocBlocks({
  resultsLoading,
  results,
  setQuery,
  query,
  config,
  createDocumentSpaceId = "",
  dateDisplayFormat = "EEE d. MMM yyyy",
  showCurrentYear = false,
  showSpaceInfo,
  allResults,
  dailyNoteCreateAction,
  searchBarAccessory,
}: ListDocBlocksParams) {
  return (
    <List
      isLoading={resultsLoading}
      isShowingDetail={true}
      onSearchTextChange={setQuery}
      searchBarAccessory={searchBarAccessory}
    >
      {results.map((doc) => (
        <DocumentBlockItem
          key={`${doc.block.spaceID}-${doc.block.id}`}
          doc={doc}
          config={config}
          showSpaceInfo={showSpaceInfo}
          createDocumentSpaceId={createDocumentSpaceId}
          dateDisplayFormat={dateDisplayFormat}
          allResults={allResults}
          query={query}
          showCurrentYear={showCurrentYear}
        />
      ))}
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
}

const DocumentBlockItem = memo(function DocumentBlockItem({
  doc,
  config,
  showSpaceInfo,
  createDocumentSpaceId,
  dateDisplayFormat,
  allResults,
  query,
  showCurrentYear,
}: {
  doc: DocBlock;
  config: CraftConfig | null;
  showSpaceInfo?: boolean;
  createDocumentSpaceId: string;
  dateDisplayFormat: string;
  allResults: ExtendedResult[];
  query: string;
  showCurrentYear: boolean;
}) {
  const craftUrl = createBlockUrl(doc.block.id, doc.block.spaceID);

  return (
    <List.Item
      title={formatResultTitle(doc.block, dateDisplayFormat, !showCurrentYear)}
      accessories={
        showSpaceInfo
          ? [
              {
                tag: {
                  value: config?.getSpaceDisplayName(doc.block.spaceID) || doc.block.spaceID,
                  color: Color.SecondaryText,
                },
              },
            ]
          : undefined
      }
      detail={
        <List.Item.Detail
          markdown={doc.blocks
            .map((block) => (block.type === "code" ? "```\n" + block.content + "\n```" : block.content))
            .join("\n\n")}
        />
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

export default memo(ListDocBlocks);
