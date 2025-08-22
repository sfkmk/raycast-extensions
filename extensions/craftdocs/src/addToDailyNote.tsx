import { Action, ActionPanel, Clipboard, Form, Icon, showHUD, popToRoot, closeMainWindow } from "@raycast/api";
import { useState, useEffect, useMemo, useCallback } from "react";
import useAppExists from "./hooks/useAppExists";
import useConfig from "./hooks/useConfig";
import useDB from "./hooks/useDB";
import useSearch from "./hooks/useSearch";
import { getDailyNotePreferences } from "./preferences";
import { APPEND_POSITIONS, PREFERENCE_FIELDS } from "./constants";
import { formatCraftInternalDate } from "./utils/dateTimeFormatter";
import { createBlockInParentUrl, createQueryUrl } from "./utils/craftUrls";
import { ContentFormatter, ContentFormattingOptions } from "./utils/contentFormatter";

interface CoreFormValues {
  content: string;
  spaceId: string;
  showTemporaryOptions: boolean;
}

interface TemporaryFormattingOptions {
  addTimestamp: boolean;
  timeFormat: string;
  contentPrefix: string;
  contentSuffix: string;
}

type FormValues = CoreFormValues & TemporaryFormattingOptions;

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
    showTemporaryOptions: false,
    addTimestamp: preferences.addTimestamp,
    timeFormat: preferences.timeFormat,
    contentPrefix: preferences.contentPrefix,
    contentSuffix: preferences.contentSuffix,
  });

  // Format today's date and search for daily note
  const today = new Date();
  const dateString = formatCraftInternalDate(today);
  const { resultsLoading, results } = useSearch(db, dateString);

  // Set default space when config loads
  useEffect(() => {
    if (config && config.primarySpace() && !formValues.spaceId) {
      setFormValues((prev) => ({ ...prev, spaceId: config.primarySpace()?.spaceID || "" }));
    }
  }, [config, formValues.spaceId]);

  // Helper functions
  const validateInput = useCallback(
    (requireSpace = true) => {
      if (!formValues.content.trim()) return "Content is required";
      if (requireSpace && !formValues.spaceId) return "Space is required";
      if (!appExists.appExists) return "Craft app is not installed";
      return null;
    },
    [formValues.content, formValues.spaceId, appExists.appExists]
  );

  const formatContent = useMemo((): string => {
    const formattingOptions: ContentFormattingOptions = {
      addTimestamp: formValues.addTimestamp,
      timeFormat: formValues.timeFormat,
      contentPrefix: formValues.contentPrefix,
      contentSuffix: formValues.contentSuffix,
    };

    return ContentFormatter.formatSimple(formValues.content, formattingOptions);
  }, [
    formValues.content,
    formValues.addTimestamp,
    formValues.timeFormat,
    formValues.contentPrefix,
    formValues.contentSuffix,
  ]);

  const getDailyNoteBlockId = useMemo(() => {
    if (!results) return null;
    const dailyNote = results.find((block) => block.entityType === "document" && block.spaceID === formValues.spaceId);
    return dailyNote?.id || null;
  }, [results, formValues.spaceId]);

  // Action handlers
  const handleDirectAdd = useCallback(async () => {
    const error = validateInput();
    if (error) {
      showHUD(`❌ ${error}`);
      return;
    }

    const finalContent = formatContent;
    await Clipboard.copy(finalContent);

    const position = preferences.appendPosition === "beginning" ? "prepended to" : "appended to";
    showHUD(`✅ Content ${position} daily note (also copied to clipboard)`);
    popToRoot();
    closeMainWindow();
  }, [validateInput, formatContent, preferences.appendPosition]);

  const handleOpenAndCopy = useCallback(async () => {
    const error = validateInput();
    if (error) {
      showHUD(`❌ ${error}`);
      return;
    }

    const finalContent = formatContent;
    await Clipboard.copy(finalContent);

    showHUD("✅ Content copied to clipboard → Open daily note → Paste with ⌘V");
    popToRoot();
    closeMainWindow();
  }, [validateInput, formatContent]);

  const handleCopyOnly = useCallback(async () => {
    const error = validateInput(false);
    if (error) {
      showHUD(`❌ ${error}`);
      return;
    }

    const finalContent = formatContent;
    await Clipboard.copy(finalContent);

    showHUD("✅ Content copied to clipboard. Open your daily note and paste with ⌘V");
    popToRoot();
    closeMainWindow();
  }, [validateInput, formatContent]);

  // URL generators
  const getAppendUrl = useMemo(() => {
    const blockId = getDailyNoteBlockId;
    if (!blockId || !formValues.spaceId || !formValues.content.trim()) return null;

    const content = formatContent;
    const index = preferences.appendPosition === "beginning" ? APPEND_POSITIONS.BEGINNING : APPEND_POSITIONS.END;
    return createBlockInParentUrl(blockId, formValues.spaceId, content, index);
  }, [getDailyNoteBlockId, formValues.spaceId, formValues.content, formatContent, preferences.appendPosition]);

  const getOpenDailyNoteUrl = useMemo(() => {
    return formValues.spaceId ? createQueryUrl("today", formValues.spaceId) : null;
  }, [formValues.spaceId]);

  // Render actions based on current state
  const renderActions = useMemo(() => {
    const appendUrl = getAppendUrl;
    const openUrl = getOpenDailyNoteUrl;
    const hasContent = formValues.content.trim();
    const hasSpace = formValues.spaceId;

    if (appendUrl) {
      return (
        <Action.OpenInBrowser title="Add to Daily Note" icon={Icon.Plus} url={appendUrl} onOpen={handleDirectAdd} />
      );
    } else if (openUrl && hasContent && hasSpace) {
      return (
        <>
          <Action.OpenInBrowser
            title="Open Daily Note & Copy Content"
            icon={Icon.Calendar}
            url={openUrl}
            onOpen={handleOpenAndCopy}
          />
          <Action title="Just Copy to Clipboard" icon={Icon.Clipboard} onAction={handleCopyOnly} />
        </>
      );
    } else {
      return <Action.SubmitForm title="Add to Daily Note" icon={Icon.Plus} onSubmit={handleDirectAdd} />;
    }
  }, [
    getAppendUrl,
    getOpenDailyNoteUrl,
    formValues.content,
    formValues.spaceId,
    handleDirectAdd,
    handleOpenAndCopy,
    handleCopyOnly,
  ]);

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
      actions={<ActionPanel>{renderActions}</ActionPanel>}
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="What would you like to add to today's daily note?"
        value={formValues.content}
        onChange={(value) => setFormValues((prev) => ({ ...prev, content: value }))}
        info="If today's daily note exists, content will be added directly. If not, you'll open the daily note first (content gets copied to clipboard for pasting)."
      />

      {formValues.content.trim() && <Form.Description title="Preview" text={formatContent} />}

      <Form.Dropdown
        id="spaceId"
        title="Space"
        value={formValues.spaceId}
        onChange={(value) => setFormValues((prev) => ({ ...prev, spaceId: value }))}
      >
        {config?.getAllSpacesForDropdown().map((space) => (
          <Form.Dropdown.Item key={space.id} value={space.id} title={space.title} icon={space.icon} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Checkbox
        id="showTemporaryOptions"
        title="Temporary Formatting Options"
        label="Customize formatting for this execution"
        value={formValues.showTemporaryOptions}
        onChange={(value) =>
          setFormValues((prev) => ({
            ...prev,
            showTemporaryOptions: value,
            // Reset to preferences when disabling temporary options
            ...(value === false
              ? {
                  addTimestamp: preferences.addTimestamp,
                  timeFormat: preferences.timeFormat,
                  contentPrefix: preferences.contentPrefix,
                  contentSuffix: preferences.contentSuffix,
                }
              : {}),
          }))
        }
        info="Show options to temporarily override your default formatting preferences"
      />

      {formValues.showTemporaryOptions && (
        <>
          <Form.Checkbox
            id="addTimestamp"
            label="Add Timestamp"
            value={formValues.addTimestamp}
            onChange={(value) => setFormValues((prev) => ({ ...prev, addTimestamp: value }))}
            info="Prepends current time to your content"
          />

          {formValues.addTimestamp && (
            <Form.TextField
              id="timeFormat"
              title="Time Format"
              placeholder={PREFERENCE_FIELDS.timeFormat.placeholder}
              value={formValues.timeFormat}
              onChange={(value) => setFormValues((prev) => ({ ...prev, timeFormat: value }))}
              info={PREFERENCE_FIELDS.timeFormat.info}
            />
          )}

          <Form.TextField
            id="contentPrefix"
            title="Prefix"
            placeholder={PREFERENCE_FIELDS.contentPrefix.placeholder}
            value={formValues.contentPrefix}
            onChange={(value) => setFormValues((prev) => ({ ...prev, contentPrefix: value }))}
            info={PREFERENCE_FIELDS.contentPrefix.info}
          />

          <Form.TextField
            id="contentSuffix"
            title="Suffix"
            placeholder={PREFERENCE_FIELDS.contentSuffix.placeholder}
            value={formValues.contentSuffix}
            onChange={(value) => setFormValues((prev) => ({ ...prev, contentSuffix: value }))}
            info={PREFERENCE_FIELDS.contentSuffix.info}
          />
        </>
      )}
    </Form>
  );
}
