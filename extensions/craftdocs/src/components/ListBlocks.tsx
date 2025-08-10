import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import React from "react";
import { Block } from "../hooks/useSearch";
import Config from "../Config";
import CreateDocumentItem from "./CreateDocumentItem";
import { formatDailyNoteTitle, formatCraftInternalDate } from "../utils/dateTimeFormatter";

type ListBlocksParams = {
  isLoading: boolean;
  onSearchTextChange: (text: string) => void;
  blocks: Block[];
  query: string;
  config: Config | null;
  parsedDate?: Date;
  dateDisplayFormat: string;
  showCurrentYear: boolean;
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
    searchBarAccessory,
  } = params;
  const spaceID = config?.primarySpace()?.spaceID || "";
  const showSpaceInfo = config ? config.getEnabledSpaces().length > 1 : false;

  return (
    <List isLoading={isLoading} onSearchTextChange={onSearchTextChange} searchBarAccessory={searchBarAccessory}>
      {blocks.map((block) => (
        <BlockItem
          key={`${block.spaceID}-${block.id}`}
          block={block}
          config={config}
          showSpaceInfo={showSpaceInfo}
          dateDisplayFormat={dateDisplayFormat}
          showCurrentYear={showCurrentYear}
        />
      ))}
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

const BlockItem = ({
  block,
  config,
  showSpaceInfo,
  dateDisplayFormat,
  showCurrentYear,
}: {
  block: Block;
  config: Config | null;
  showSpaceInfo?: boolean;
  dateDisplayFormat: string;
  showCurrentYear: boolean;
}) => {
  const spaceDisplayName = config?.getSpaceDisplayName(block.spaceID) || block.spaceID;

  // Format document titles if they match ISO date pattern
  const formattedDocumentName = block.documentName
    ? formatDailyNoteTitle(block.documentName, dateDisplayFormat, !showCurrentYear)
    : block.documentName;

  const formattedTitle =
    block.entityType === "document"
      ? formatDailyNoteTitle(block.documentName || block.content, dateDisplayFormat, !showCurrentYear)
      : block.content;

  return (
    <List.Item
      icon={block.entityType === "document" ? Icon.Document : Icon.QuoteBlock}
      subtitle={block.entityType === "document" ? undefined : formattedDocumentName}
      title={formattedTitle}
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
