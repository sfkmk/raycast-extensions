import { Action, ActionPanel, List } from "@raycast/api";
import { createQueryUrl } from "../utils/craftUrls";
import * as chrono from "chrono-node";

type DayReference = "today" | "yesterday" | "tomorrow";

export const Shortcut = ({ dayRef, spaceID }: { dayRef: DayReference; spaceID: string }) => {
  // Simple null-safe date parsing like original main branch
  const parsedDate = chrono.parseDate(dayRef);
  const subtitle = parsedDate ? parsedDate.toDateString() : toTitleCase(dayRef);

  return (
    <List.Item
      title={toTitleCase(dayRef)}
      subtitle={subtitle}
      actions={
        <ActionPanel>
          <Action.Open
            title={`Open ${dayRef.charAt(0).toUpperCase() + dayRef.slice(1)} Notes`}
            target={createQueryUrl(dayRef, spaceID)}
          />
        </ActionPanel>
      }
    />
  );
};

const toTitleCase = (str: string) => str.substring(0, 1).toUpperCase() + str.substring(1);
