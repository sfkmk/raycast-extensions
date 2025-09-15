import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { createDocumentUrl } from "../utils/craftUrls";

export default function CreateDocumentItem({ query, spaceID }: { query: string; spaceID: string }) {
  // Don't render if spaceID is empty to avoid createDocumentUrl errors
  if (!spaceID?.trim()) {
    return null;
  }

  return (
    <List.Item
      title={`Create the Document '${query}'`}
      detail={<List.Item.Detail markdown={`Create document '${query}'`} />}
      icon={Icon.NewDocument}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Create the Document" url={createDocumentUrl(spaceID, query, "")} />
        </ActionPanel>
      }
    />
  );
}
