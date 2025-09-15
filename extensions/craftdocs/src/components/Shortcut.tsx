import { Action, ActionPanel, List } from "@raycast/api";
import { createQueryUrl } from "../utils/craftUrls";
import { getDateFormatPreferences } from "../preferences";
import { formatDate } from "../utils/dateTimeFormatter";
import * as chrono from "chrono-node";

type DayReference = "today" | "yesterday" | "tomorrow";

export const Shortcut = ({ dayRef, spaceID }: { dayRef: DayReference; spaceID: string }) => {
  const { dateDisplayFormat, showCurrentYear } = getDateFormatPreferences();
  const parsedDate = chrono.parseDate(dayRef);

  return (
    <List.Item
      title={toTitleCase(dayRef)}
      subtitle={parsedDate ? formatDate(parsedDate, dateDisplayFormat, !showCurrentYear) : dayRef}
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
