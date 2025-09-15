import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import React from "react";
import { Block } from "../hooks/useSearch";
import Config from "../Config";
import CreateDocumentItem from "./CreateDocumentItem";
import { generateSearchResultsMarkdown } from "../utils/searchHelpers";
import { createDocumentUrl, createBlockUrl } from "../utils/craftUrls";
import { ensureSafeTitle } from "../utils/safety";

type ListBlocksParams = {
  isLoading: boolean;
  onSearchTextChange: (text: string) => void;
  blocks: Block[];
  query: string;
  config: Config | null;
  searchBarAccessory?: any; // Necessary due to Raycast API type conflicts. Keep it that way.
};

export default function ListBlocks(params: ListBlocksParams) {
  const { isLoading, onSearchTextChange, blocks, query, config, searchBarAccessory } = params;
  const spaceID = config?.primarySpace()?.spaceID || "";
  const showSpaceInfo = config ? config.getEnabledSpaces().length > 1 : false;

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
      {blocks.map((block) => (
        <BlockItem
          key={`${block.spaceID}-${block.id}`}
          block={block}
          config={config}
          showSpaceInfo={showSpaceInfo}
          allResults={blocks}
          query={query}
          spaceID={spaceID}
        />
      ))}
      {query.length > 0 && (
        <List.Section title="Create new document">
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
  allResults,
  query,
  spaceID,
}: {
  block: Block;
  config: Config | null;
  showSpaceInfo?: boolean;
  allResults: Block[];
  query: string;
  spaceID: string;
}) => {
  const spaceDisplayName = config?.getSpaceDisplayName(block.spaceID) || block.spaceID;

  return (
    <List.Item
      icon={block.entityType === "document" ? Icon.Document : Icon.Text}
      subtitle={block.entityType === "document" ? undefined : block.documentName}
      title={ensureSafeTitle(block.entityType === "document" ? block.documentName || block.content : block.content, [
        block.content,
        `Document ${block.id}`,
      ])}
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
