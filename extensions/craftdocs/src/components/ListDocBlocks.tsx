import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import React from "react";
import { DocBlock } from "../hooks/useDocumentSearch";
import CreateDocumentItem from "./CreateDocumentItem";
import Config from "../Config";
import { formatDailyNoteTitle, formatCraftInternalDate } from "../utils/dateTimeFormatter";

type ListDocBlocksParams = {
  resultsLoading: boolean;
  setQuery: (text: string) => void;
  results: DocBlock[];
  query: string;
  config: Config | null;
  parsedDate?: Date;
  dateDisplayFormat: string;
  showCurrentYear: boolean;
  searchBarAccessory?: any; // Necessary due to Raycast API type conflicts. Keep it that way.
};

export default function ListDocBlocks({
  resultsLoading,
  setQuery,
  results,
  query,
  config,
  parsedDate,
  dateDisplayFormat,
  showCurrentYear,
  searchBarAccessory,
}: ListDocBlocksParams) {
  const showSpaceInfo = config ? config.getEnabledSpaces().length > 1 : false;
  return (
    <List
      isLoading={resultsLoading}
      isShowingDetail={true}
      onSearchTextChange={setQuery}
      searchBarAccessory={searchBarAccessory}
    >
      {results.map((doc) => {
        // Format document title if it matches ISO date pattern
        const formattedTitle = formatDailyNoteTitle(doc.block.content, dateDisplayFormat, !showCurrentYear);

        return (
          <List.Item
            key={`${doc.block.spaceID}-${doc.block.id}`}
            title={formattedTitle}
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
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Craft"
                  url={`craftdocs://open?blockId=${doc.block.id}&spaceId=${doc.block.spaceID}`}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {query.length > 0 && (
        <List.Section title="Create new Document">
          {parsedDate
            ? (() => {
                const isoDateString = formatCraftInternalDate(parsedDate);
                const dailyNoteExists = results.some(
                  (doc) =>
                    doc.block.entityType === "document" &&
                    (doc.block.documentName === isoDateString || doc.block.content === isoDateString)
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
                          url={`craftdocs://openByQuery?query=${isoDateString}&spaceId=${
                            config?.primarySpace()?.spaceID || ""
                          }`}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })()
            : null}
          <CreateDocumentItem query={query} spaceID={config?.primarySpace()?.spaceID || ""} />
        </List.Section>
      )}
    </List>
  );
}
