import { Action, ActionPanel, Icon, List } from "@raycast/api";

export default function CreateDocumentItem({ query, spaceID }: { query: string; spaceID: string }) {
  return (
    <List.Item
      title={`Create the Document '${query}'`}
      detail={<List.Item.Detail markdown={`Create document '${query}'`} />}
      icon={Icon.NewDocument}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Create the Document"
            url={`craftdocs://createdocument?spaceId=${spaceID}&title=${encodeURIComponent(query)}&content=&folderId=`}
          />
        </ActionPanel>
      }
    />
  );
}
