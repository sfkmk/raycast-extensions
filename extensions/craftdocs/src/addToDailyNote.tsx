import { Action, ActionPanel, Clipboard, Form, Icon, showHUD, popToRoot, closeMainWindow } from "@raycast/api";
import { useState, useEffect } from "react";
import useAppExists from "./hooks/useAppExists";
import useConfig from "./hooks/useConfig";
import useDB from "./hooks/useDB";
import useSearch from "./hooks/useSearch";
import { getDailyNotePreferences, DailyNotePreferences } from "./preferences";
import { APPEND_POSITIONS } from "./constants";
import { formatTime, formatCraftInternalDate } from "./utils/dateTimeFormatter";

interface FormValues {
  content: string;
  spaceId: string;
  // Temporary formatting options (override preferences for this execution)
  tempAddTimestamp?: boolean;
  tempTimeFormat?: string;
  tempContentPrefix?: string;
  tempContentSuffix?: string;
}

// Helper function to format content with timestamp, prefix, and suffix
// Supports temporary formatting overrides
const formatContent = (content: string, preferences: DailyNotePreferences, formValues: FormValues): string => {
  let finalContent = content.trim();

  // Use temporary values if provided, otherwise fall back to preferences
  const addTimestamp =
    formValues.tempAddTimestamp !== undefined ? formValues.tempAddTimestamp : preferences.addTimestamp;
  const timeFormat = formValues.tempTimeFormat || preferences.timeFormat;
  const contentPrefix =
    formValues.tempContentPrefix !== undefined ? formValues.tempContentPrefix : preferences.contentPrefix;
  const contentSuffix =
    formValues.tempContentSuffix !== undefined ? formValues.tempContentSuffix : preferences.contentSuffix;

  if (addTimestamp) {
    const now = new Date();
    const timeString = formatTime(now, timeFormat);
    const prefix = contentPrefix.trim();
    finalContent = `**${timeString}** ${prefix ? prefix + " " : ""}${finalContent}`;
  } else {
    const prefix = contentPrefix.trim();
    finalContent = `${prefix ? prefix + " " : ""}${finalContent}`;
  }

  // Add suffix with proper spacing
  const suffix = contentSuffix.trim();
  if (suffix) {
    finalContent = `${finalContent} ${suffix}`;
  }

  return finalContent;
};

export default function AddToDailyNote() {
  const appExists = useAppExists();
  const configResult = useConfig(appExists);
  const config = configResult?.config || null;
  const configLoading = configResult?.configLoading || false;
  const preferences = getDailyNotePreferences();
  const db = useDB(configResult);

  const [formValues, setFormValues] = useState<FormValues>({
    content: "",
    spaceId: "",
    // Initialize temporary formatting with current preferences
    tempAddTimestamp: preferences.addTimestamp,
    tempTimeFormat: preferences.timeFormat,
    tempContentPrefix: preferences.contentPrefix,
    tempContentSuffix: preferences.contentSuffix,
  });

  // Format today's date as YYYY.MM.DD (Craft's internal db time format)
  const today = new Date();
  const dateString = formatCraftInternalDate(today);

  // Use useSearch hook to get document blocks matching today's date string
  const { resultsLoading, results } = useSearch(db, dateString);

  // Find daily note blockId from search results and selected space
  const getDailyNoteBlockId = (): string | null => {
    if (!results) return null;
    const dailyNotes = results.filter(
      (block) => block.entityType === "document" && block.spaceID === formValues.spaceId,
    );
    if (dailyNotes.length > 0) {
      return dailyNotes[0].id;
    }
    return null;
  };

  // Set default space when config loads, if none selected yet
  useEffect(() => {
    if (config && config.primarySpace() && !formValues.spaceId) {
      setFormValues((prev) => ({
        ...prev,
        spaceId: config.primarySpace()?.spaceID || "",
      }));
    }
  }, [config, formValues.spaceId]);

  const handleSubmit = () => {
    if (!formValues.content.trim()) {
      showHUD("❌ Content is required");
      return;
    }
    if (!formValues.spaceId) {
      showHUD("❌ Space is required");
      return;
    }
    if (!appExists.appExists) {
      showHUD("❌ Craft app is not installed");
      return;
    }

    // Format content with timestamp, prefix and suffix (including temporary overrides)
    const finalContent = formatContent(formValues.content, preferences, formValues);

    // Always copy to clipboard as safety fallback
    Clipboard.copy(finalContent);

    const position = preferences.appendPosition === "beginning" ? "prepended to" : "appended to";
    showHUD(`✅ Content ${position} daily note (also copied to clipboard)`);

    popToRoot();
    closeMainWindow();
  };

  // Generate the append URL
  const getAppendUrl = () => {
    const parentBlockId = getDailyNoteBlockId();
    if (!parentBlockId || !formValues.spaceId) return null;

    const finalContent = formatContent(formValues.content, preferences, formValues);

    const index = preferences.appendPosition === "beginning" ? APPEND_POSITIONS.BEGINNING : APPEND_POSITIONS.END;

    return `craftdocs://createblock?parentBlockId=${parentBlockId}&spaceId=${
      formValues.spaceId
    }&content=${encodeURIComponent(finalContent)}&index=${index}`;
  };

  // Generate fallback URL when no daily note exists
  const getFallbackUrl = () => {
    if (!formValues.spaceId) return null;
    return `craftdocs://openByQuery?query=today&spaceId=${formValues.spaceId}`;
  };

  if (!appExists.appExists && !appExists.appExistsLoading) {
    return (
      <Form>
        <Form.Description text="Craft app is not installed. Please install Craft to use this extension." />
      </Form>
    );
  }

  return (
    <Form
      isLoading={configLoading || appExists.appExistsLoading || resultsLoading}
      navigationTitle="Add to Daily Note"
      actions={
        <ActionPanel>
          {(() => {
            const appendUrl = getAppendUrl();
            const fallbackUrl = getFallbackUrl();

            if (appendUrl && formValues.content.trim() && formValues.spaceId) {
              return (
                <Action.OpenInBrowser
                  title="Add to Daily Note"
                  icon={Icon.Plus}
                  url={appendUrl}
                  onOpen={handleSubmit}
                />
              );
            } else if (fallbackUrl && formValues.content.trim() && formValues.spaceId) {
              return (
                <Action.OpenInBrowser
                  title="Create Daily Note & Copy Content"
                  icon={Icon.Calendar}
                  url={fallbackUrl}
                  onOpen={handleSubmit}
                />
              );
            } else {
              return <Action.SubmitForm title="Add to Daily Note" icon={Icon.Plus} onSubmit={handleSubmit} />;
            }
          })()}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="What would you like to add to today's daily note?"
        value={formValues.content}
        onChange={(value) => setFormValues((prev) => ({ ...prev, content: value }))}
        info="This content will be added to today's daily note"
      />
      <Form.Dropdown
        id="spaceId"
        title="Space"
        value={formValues.spaceId}
        onChange={(value) => setFormValues((prev) => ({ ...prev, spaceId: value }))}
      >
        {config?.getEnabledSpaces().map((space) => (
          <Form.Dropdown.Item
            key={space.spaceID}
            value={space.spaceID}
            title={config.getSpaceDisplayName(space.spaceID)}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="Temporary Formatting Options (for this execution only)" />

      <Form.Checkbox
        id="tempAddTimestamp"
        label="Add timestamp"
        value={formValues.tempAddTimestamp || false}
        onChange={(value) => setFormValues((prev) => ({ ...prev, tempAddTimestamp: value }))}
        info="Override your default timestamp setting for this entry"
      />

      {formValues.tempAddTimestamp && (
        <Form.TextField
          id="tempTimeFormat"
          title="Time Format"
          placeholder={preferences.timeFormat}
          value={formValues.tempTimeFormat || ""}
          onChange={(value) => setFormValues((prev) => ({ ...prev, tempTimeFormat: value }))}
          info="Custom time format pattern (e.g., HH:mm:, h:mm A)"
        />
      )}

      <Form.TextField
        id="tempContentPrefix"
        title="Content Prefix"
        placeholder={preferences.contentPrefix || "Enter prefix text"}
        value={formValues.tempContentPrefix || ""}
        onChange={(value) => setFormValues((prev) => ({ ...prev, tempContentPrefix: value }))}
        info="Text to add before your content (overrides preference)"
      />

      <Form.TextField
        id="tempContentSuffix"
        title="Content Suffix"
        placeholder={preferences.contentSuffix || "Enter suffix text"}
        value={formValues.tempContentSuffix || ""}
        onChange={(value) => setFormValues((prev) => ({ ...prev, tempContentSuffix: value }))}
        info="Text to add after your content (overrides preference)"
      />
    </Form>
  );
}
