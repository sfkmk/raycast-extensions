import { Action, ActionPanel, Icon, open } from "@raycast/api";
import type { ComponentProps } from "react";
import type { CraftConfig } from "../Config";
import type { ExtendedResult } from "../utils/searchHelpers";
import { createBlockUrl, createDocumentUrl } from "../utils/craftUrls";
import { generateSearchResultsMarkdown } from "../utils/searchHelpers";

type OpenInCraftActionProps = {
  blockId: string;
  spaceId: string;
  label?: string;
};

type SearchResultsDocumentActionProps = {
  query: string;
  allResults: ExtendedResult[];
  createDocumentSpaceId: string;
  config: CraftConfig | null;
  shortcut?: ComponentProps<typeof Action>["shortcut"];
};

export function OpenInCraftActionPanel({ blockId, spaceId, label }: OpenInCraftActionProps) {
  const craftUrl = createBlockUrl(blockId, spaceId);

  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title={label ? `Open ${label}` : "Open in Craft"}
        url={craftUrl}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      <Action.CopyToClipboard title="Copy Craft URL" content={craftUrl} shortcut={{ modifiers: ["cmd"], key: "u" }} />
    </ActionPanel>
  );
}

export function CreateSearchResultsDocumentAction({
  query,
  allResults,
  createDocumentSpaceId,
  config,
  shortcut,
}: SearchResultsDocumentActionProps) {
  return (
    <Action
      title="Create Document with Search Results"
      icon={Icon.NewDocument}
      shortcut={shortcut}
      onAction={() => {
        const url = createDocumentUrl(
          createDocumentSpaceId,
          `Search results for "${query}"`,
          generateSearchResultsMarkdown(allResults, query, config),
        );

        void open(url);
      }}
    />
  );
}

export function SearchResultActionPanel({
  title,
  url,
  query,
  allResults,
  createDocumentSpaceId,
  config,
}: {
  title: string;
  url: string;
  query: string;
  allResults: ExtendedResult[];
  createDocumentSpaceId: string;
  config: CraftConfig | null;
}) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title={title} url={url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
      <Action.CopyToClipboard title="Copy Craft URL" content={url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
      {query.trim().length > 0 && createDocumentSpaceId ? (
        <ActionPanel.Section>
          <CreateSearchResultsDocumentAction
            query={query}
            allResults={allResults}
            createDocumentSpaceId={createDocumentSpaceId}
            config={config}
            shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
          />
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}
