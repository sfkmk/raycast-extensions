import { Action, ActionPanel, List } from "@raycast/api";
import { getDateFormatPreferences } from "../preferences";
import { formatDate } from "../utils/dateTimeFormatter";
import { createQueryUrl } from "../utils/craftUrls";

export const DailyNoteRef = ({ date, text, spaceID }: { date: Date | undefined; text: string; spaceID: string }) => {
  const { dateDisplayFormat, showCurrentYear } = getDateFormatPreferences();

  return (
    <List.Item
      title={date ? formatDate(date, dateDisplayFormat, !showCurrentYear) : "Specify query"}
      subtitle={text}
      actions={
        !date ? undefined : (
          <ActionPanel>
            <Action.Open
              title={`Open ${formatDate(date, dateDisplayFormat, !showCurrentYear)}`}
              target={createQueryUrl(date.toISOString().substring(0, 10), spaceID)}
            />
          </ActionPanel>
        )
      }
    />
  );
};
