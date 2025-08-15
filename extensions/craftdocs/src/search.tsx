import { useEffect, useState } from "react";
import useSearch, { Block } from "./hooks/useSearch";
import ListBlocks from "./components/ListBlocks";
import useAppExists, { UseAppExists } from "./hooks/useAppExists";
import useConfig, { UseConfig } from "./hooks/useConfig";
import useDB, { UseDB } from "./hooks/useDB";
import { CACHE_KEYS, APP_CONSTANTS } from "./constants";
import { Action, ActionPanel, List, showToast, Toast, openExtensionPreferences, Cache } from "@raycast/api";
import { getSearchPreferences, getDateFormatPreferences, getPrimaryLanguage } from "./preferences";
import useDocumentSearch from "./hooks/useDocumentSearch";
import ListDocBlocks from "./components/ListDocBlocks";
import { parseMultilingualDate } from "./utils/multilingualDateParser";
import { formatCraftInternalDate } from "./utils/dateTimeFormatter";
import { prioritizeDailyNotes, combineBlockResults, combineDocBlockResults } from "./hooks/common";
import { useExpandedSearch, useExpandedDocumentSearch } from "./hooks/useExpandedSearch";
import Style = Toast.Style;

const cache = new Cache();

interface SpaceOption {
  id: string;
  title: string;
}

interface SpaceDropdownProps {
  value: string;
  spaces: SpaceOption[];
  onSpaceChange: (newValue: string) => void;
}

function SpaceDropdown({ value, spaces, onSpaceChange }: SpaceDropdownProps) {
  return (
    <List.Dropdown value={value} tooltip="Select Space" onChange={onSpaceChange}>
      <List.Dropdown.Section title="Spaces">
        <List.Dropdown.Item key="all" title="All spaces" value="all" />
        {spaces.map((space) => (
          <List.Dropdown.Item key={space.id} title={space.title} value={space.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

const { useDetailedView, enableCustomEntries } = getSearchPreferences();
const { dateDisplayFormat, showCurrentYear } = getDateFormatPreferences();

// noinspection JSUnusedGlobalSymbols
export default function search() {
  const appExists = useAppExists();
  const config = useConfig(appExists);
  const db = useDB(config);

  const [query, setQuery] = useState("");
  const [parsedDate, setParsedDate] = useState<Date | undefined>();
  const [selectedSpace, setSelectedSpace] = useState<string>(
    cache.get(CACHE_KEYS.SEARCH_SPACE_ID) || APP_CONSTANTS.DEFAULT_SPACE_FILTER
  );

  const parseTextToDate = (text: string): Date | null => {
    if (!text || text.trim().length === 0) return null;

    const today = new Date();

    // Use multilingual parser with search-optimized options
    const preferredLanguage = getPrimaryLanguage();
    const result = parseMultilingualDate(text, {
      referenceDate: today,
      // For search, disable forward bias to find exact dates user is looking for
      // This prevents "monday" from jumping to next week when user meant last Monday
      forwardDate: false,
      // For search context, bias toward current year for ambiguous dates
      // This helps "24.08.26" resolve to 2024 instead of 1924 or other years
      currentYearBias: true,
      // Use user's preferred language from extension preferences
      locale: preferredLanguage,
    });

    return result;
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    const date = parseTextToDate(text);
    setParsedDate(date || undefined);
  };

  const handleSpaceChange = (newValue: string) => {
    setSelectedSpace(newValue);
    cache.set(CACHE_KEYS.SEARCH_SPACE_ID, newValue);
  };

  const params = {
    appExists,
    db,
    query,
    setQuery: handleQueryChange,
    config,
    selectedSpace,
    handleSpaceChange,
    parsedDate,
    dateDisplayFormat,
    showCurrentYear,
  };

  useEffect(() => {
    if (appExists.appExistsLoading) return;
    if (appExists.appExists) return;

    showToast(Style.Failure, "Error", "Craft app is not installed");
  }, [appExists.appExistsLoading]);

  // Reset to "all" if selected space no longer exists
  useEffect(() => {
    if (
      selectedSpace !== "all" &&
      config.config &&
      !config.config.getEnabledSpaces().find((s) => s.spaceID === selectedSpace)
    ) {
      handleSpaceChange("all");
    }
  }, [selectedSpace, config.config]);

  return useDetailedView ? handleDetailedView(params) : handleListView(params);
}

type ViewParams = {
  appExists: UseAppExists;
  db: UseDB;
  query: string;
  setQuery: (query: string) => void;
  config: UseConfig;
  selectedSpace: string;
  handleSpaceChange: (newValue: string) => void;
  parsedDate: Date | undefined;
  dateDisplayFormat: string;
  showCurrentYear: boolean;
};

const handleListView = ({
  appExists,
  db,
  query,
  setQuery,
  config,
  selectedSpace,
  handleSpaceChange,
  parsedDate,
  dateDisplayFormat,
  showCurrentYear,
}: ViewParams) => {
  const { resultsLoading, results } = useSearch(db, query, parsedDate);

  // Get expanded task search results using the new hook
  const { resultsLoading: expandedResultsLoading, results: expandedResults } = useExpandedSearch(
    db,
    query,
    parsedDate,
    enableCustomEntries
  );

  // If we have a parsed date, also search for the ISO format
  const isoDateQuery = parsedDate ? formatCraftInternalDate(parsedDate) : "";
  const { resultsLoading: isoResultsLoading, results: isoResults } = useSearch(db, isoDateQuery, parsedDate);

  // Combine results using shared utility
  const expandedResultsToUse = enableCustomEntries ? expandedResults : [];
  const isoResultsToUse = parsedDate ? isoResults : undefined;
  const combinedResults = combineBlockResults(results || [], expandedResultsToUse, isoResultsToUse);

  // Re-prioritize combined results to ensure daily notes are at the top
  const prioritizedCombinedResults = parsedDate ? prioritizeDailyNotes(combinedResults, parsedDate) : combinedResults;

  // Filter results by selected space
  const filteredResults =
    selectedSpace === "all"
      ? prioritizedCombinedResults?.filter((block) =>
          config.config?.getEnabledSpaces().some((space) => space.spaceID === block.spaceID)
        )
      : prioritizedCombinedResults?.filter((block) => block.spaceID === selectedSpace);

  const spaces = config.config?.getAllSpacesForDropdown() || [];
  const showSpaceDropdown = spaces.length > 1;

  const listBlocks = (
    <ListBlocks
      isLoading={
        resultsLoading || (parsedDate ? isoResultsLoading : false) || (enableCustomEntries && expandedResultsLoading)
      }
      onSearchTextChange={setQuery}
      blocks={filteredResults}
      query={query}
      config={config.config}
      parsedDate={parsedDate}
      dateDisplayFormat={dateDisplayFormat}
      showCurrentYear={showCurrentYear}
      enableCustomEntries={enableCustomEntries}
      searchBarAccessory={
        showSpaceDropdown ? (
          <SpaceDropdown spaces={spaces} onSpaceChange={handleSpaceChange} value={selectedSpace} />
        ) : undefined
      }
    />
  );

  const listOrInfo = appExists.appExists ? listBlocks : <NoResults />;

  return appExists.appExistsLoading ? listBlocks : listOrInfo;
};

const handleDetailedView = ({
  appExists,
  db,
  query,
  setQuery,
  config,
  selectedSpace,
  handleSpaceChange,
  parsedDate,
  dateDisplayFormat,
  showCurrentYear,
}: ViewParams) => {
  const { resultsLoading, results } = useDocumentSearch(db, query, parsedDate);

  // Get expanded task search results using the new hook
  const { resultsLoading: expandedResultsLoading, results: expandedDocResults } = useExpandedDocumentSearch(
    db,
    query,
    parsedDate,
    enableCustomEntries
  );

  // If we have a parsed date, also search for the ISO format
  const isoDateQuery = parsedDate ? formatCraftInternalDate(parsedDate) : "";
  const { resultsLoading: isoResultsLoading, results: isoResults } = useDocumentSearch(db, isoDateQuery, parsedDate);

  // Combine results using shared utility
  const expandedResultsToUse = enableCustomEntries ? expandedDocResults : [];
  const isoResultsToUse = parsedDate ? isoResults : undefined;
  const combinedResults = combineDocBlockResults(results || [], expandedResultsToUse, isoResultsToUse);

  // Sort combined results to prioritize daily notes
  const sortedCombinedResults = parsedDate
    ? combinedResults.sort((a, b) => {
        const aIsDaily = isDailyNote(a.block, parsedDate);
        const bIsDaily = isDailyNote(b.block, parsedDate);
        if (aIsDaily && !bIsDaily) return -1;
        if (!aIsDaily && bIsDaily) return 1;
        return 0;
      })
    : combinedResults;

  // Filter results by selected space
  const filteredResults =
    selectedSpace === "all"
      ? sortedCombinedResults?.filter((doc) =>
          config.config?.getEnabledSpaces().some((space) => space.spaceID === doc.block.spaceID)
        )
      : sortedCombinedResults?.filter((doc) => doc.block.spaceID === selectedSpace);

  const spaces = config.config?.getAllSpacesForDropdown() || [];
  const showSpaceDropdown = spaces.length > 1;

  const listDocuments = (
    <ListDocBlocks
      resultsLoading={
        resultsLoading || (parsedDate ? isoResultsLoading : false) || (enableCustomEntries && expandedResultsLoading)
      }
      setQuery={setQuery}
      results={filteredResults}
      query={query}
      config={config.config}
      parsedDate={parsedDate}
      dateDisplayFormat={dateDisplayFormat}
      showCurrentYear={showCurrentYear}
      searchBarAccessory={
        showSpaceDropdown ? (
          <SpaceDropdown spaces={spaces} onSpaceChange={handleSpaceChange} value={selectedSpace} />
        ) : undefined
      }
    />
  );

  const listOrInfo = appExists.appExists ? listDocuments : <NoResults />;

  return appExists.appExistsLoading ? listDocuments : listOrInfo;
};

// Helper function to check if a block is a daily note
const isDailyNote = (block: Block, parsedDate: Date): boolean => {
  const isoFormat = formatCraftInternalDate(parsedDate);
  return (
    block.entityType === "document" &&
    (block.documentName === isoFormat ||
      block.content === isoFormat ||
      block.documentName?.includes(isoFormat) ||
      block.content?.includes(isoFormat))
  );
};

const NoResults = () => (
  <>
    <List
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        title="No results"
        description="Selecting Craft application in preferences might help"
        icon={"command-icon-small.png"}
      />
    </List>
  </>
);
