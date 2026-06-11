import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { createDocumentUrl } from "../utils/craftUrls";

export default function CreateDocumentItem({ query, spaceID }: { query: string; spaceID: string }) {
  const canCreateDocument = query.trim().length > 0 && spaceID.trim().length > 0;

  return (
    <List.Item
      title={`Create the Document '${query}'`}
      detail={<List.Item.Detail markdown={`Create Document '${query}'`} />}
      icon={Icon.NewDocument}
      actions={
        canCreateDocument ? (
          <ActionPanel>
            <Action.OpenInBrowser title="Create the Document" url={createDocumentUrl(spaceID, query, "")} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
