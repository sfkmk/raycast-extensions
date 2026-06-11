import { Icon } from "@raycast/api";
import type { Block } from "../lib/search";
import { isDailyNoteBlock, isTaskBlockDocument } from "./customEntries";
import { formatDailyNoteTitle } from "./dateTimeFormatter";

const DEFAULT_DATE_FORMAT = "EEE d. MMM yyyy";

export const formatResultTitle = (
  block: Block,
  dateDisplayFormat = DEFAULT_DATE_FORMAT,
  hideCurrentYear = true,
  enableCustomEntries = true,
): string => {
  if (block.entityType !== "document") {
    return block.content;
  }

  if (enableCustomEntries && (isTaskBlockDocument(block.content) || isTaskBlockDocument(block.documentName))) {
    return "Tasks";
  }

  return formatDailyNoteTitle(block.documentName || block.content, dateDisplayFormat, hideCurrentYear);
};

export const formatResultSubtitle = (
  block: Block,
  dateDisplayFormat = DEFAULT_DATE_FORMAT,
  hideCurrentYear = true,
): string | undefined => {
  if (block.entityType === "document") {
    return undefined;
  }

  return block.documentName ? formatDailyNoteTitle(block.documentName, dateDisplayFormat, hideCurrentYear) : undefined;
};

export const getResultIcon = (block: Block, enableCustomEntries = true, parsedDate?: Date): Icon => {
  if (block.entityType === "document") {
    if (enableCustomEntries && isTaskBlockDocument(block.content)) {
      return Icon.List;
    }

    return isDailyNoteBlock(block, parsedDate) ? Icon.Calendar : Icon.Document;
  }

  return enableCustomEntries && isTaskBlockDocument(block.documentName) ? Icon.CheckCircle : Icon.Text;
};
