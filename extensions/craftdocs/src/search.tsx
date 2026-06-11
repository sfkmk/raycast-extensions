import { useMemo, useState } from "react";
import { Action, ActionPanel, List, openExtensionPreferences } from "@raycast/api";
import { CraftConfig } from "./Config";
import ListSpaceDropdown from "./components/ListSpaceDropdown";
import { CraftEnvironmentList, DatabaseIssueList } from "./components/CraftCommandState";
import ListBlocks from "./components/ListBlocks";
import ListDocBlocks from "./components/ListDocBlocks";
import { APP_CONSTANTS, CACHE_KEYS } from "./constants";
import useCraftCommandContext from "./hooks/useCraftCommandContext";
import useDocumentSearch from "./hooks/useDocumentSearch";
import usePersistedSpaceSelection from "./hooks/usePersistedSpaceSelection";
import useSearch from "./hooks/useSearch";
import { useBlockSearchViewModel, useDocumentSearchViewModel } from "./hooks/useSearchViewModel";
import { filterDatabasesBySpaceId, resolveCreateDocumentSpaceId } from "./lib/search";
import { getSearchPreferences, getSupportedDateLanguages } from "./preferences";
import { parseNaturalDateInput } from "./utils/dateParsing";

const searchPreferences = getSearchPreferences() as Preferences.Search & {
  enableCustomEntries?: boolean;
  dateDisplayFormat?: string;
  showCurrentYear?: boolean;
};
const {
  useDetailedView,
  enableCustomEntries = true,
  dateDisplayFormat = "EEE d. MMM yyyy",
  showCurrentYear = false,
} = searchPreferences;
const supportedDateLanguages = getSupportedDateLanguages();

// noinspection JSUnusedGlobalSymbols
export default function search() {
  const command = useCraftCommandContext({ includeDatabases: true });
  const [query, setQuery] = useState("");

  const availableSpaceIDs = useMemo(
    () => new Set(command.db.databases.map((database) => database.spaceID)),
    [command.db.databases],
  );
  const spaces = useMemo(
    () =>
      command.config.config?.enabledSpaces
        .filter((space) => availableSpaceIDs.has(space.spaceID))
        .map((space) => ({
          id: space.spaceID,
          title: command.config.config?.getSpaceDisplayName(space.spaceID) || space.spaceID,
        })) || [],
    [command.config.config, availableSpaceIDs],
  );

  const { selectedSpaceId, setSelectedSpaceId } = usePersistedSpaceSelection({
    cacheKey: CACHE_KEYS.SEARCH_SPACE_ID,
    validSelections: spaces.map((space) => space.id),
    fallbackSelection: APP_CONSTANTS.DEFAULT_SPACE_FILTER,
    alwaysAllowedSelections: [APP_CONSTANTS.DEFAULT_SPACE_FILTER],
  });

  const filteredDatabases = useMemo(
    () => filterDatabasesBySpaceId(command.db.databases, selectedSpaceId),
    [command.db.databases, selectedSpaceId],
  );

  if (command.loading) {
    return <List isLoading={true} />;
  }

  if (!command.environment.environment || command.environment.environment.status !== "ready") {
    return <CraftEnvironmentList environment={command.environment.environment} />;
  }

  if (command.db.fatalIssue) {
    return <DatabaseIssueList issue={command.db.fatalIssue} />;
  }

  if (!command.config.config || command.config.config.enabledSpaces.length === 0) {
    return <NoSpaces />;
  }

  return useDetailedView ? (
    <DetailedResultsView
      config={command.config.config}
      databases={filteredDatabases}
      query={query}
      selectedSpaceId={selectedSpaceId}
      setQuery={setQuery}
      setSelectedSpaceId={setSelectedSpaceId}
      spaces={spaces}
    />
  ) : (
    <BlockResultsView
      config={command.config.config}
      databases={filteredDatabases}
      query={query}
      selectedSpaceId={selectedSpaceId}
      setQuery={setQuery}
      setSelectedSpaceId={setSelectedSpaceId}
      spaces={spaces}
    />
  );
}

type SearchViewProps = {
  config: CraftConfig;
  databases: ReturnType<typeof filterDatabasesBySpaceId>;
  query: string;
  selectedSpaceId: string;
  setQuery: (query: string) => void;
  setSelectedSpaceId: (spaceId: string) => void;
  spaces: Array<{ id: string; title: string }>;
};

const BlockResultsView = ({
  config,
  databases,
  query,
  selectedSpaceId,
  setQuery,
  setSelectedSpaceId,
  spaces,
}: SearchViewProps) => {
  const parsedDate = useMemo(
    () => parseNaturalDateInput(query, { supportedLanguages: supportedDateLanguages }),
    [query],
  );
  const dbState = useMemo(() => ({ databases, databasesLoading: false, fatalIssue: null, issues: [] }), [databases]);
  const searchState = useSearch(dbState, query, {
    parsedDate,
    includeTaskExpansion: enableCustomEntries,
    includeDateFallback: true,
  });
  const createDocumentSpaceId = resolveCreateDocumentSpaceId({
    selectedSpaceId,
    primarySpaceId: config.primarySpace?.spaceID,
  });
  const viewModel = useBlockSearchViewModel({
    blocks: searchState.results,
    query,
    config,
    createDocumentSpaceId,
    parsedDate,
    dateDisplayFormat,
    showCurrentYear,
    enableCustomEntries,
  });

  return (
    <ListBlocks
      isLoading={searchState.resultsLoading}
      onSearchTextChange={setQuery}
      results={viewModel.results}
      query={query}
      config={config}
      createDocumentSpaceId={createDocumentSpaceId}
      parsedDate={parsedDate}
      dateDisplayFormat={dateDisplayFormat}
      showCurrentYear={showCurrentYear}
      enableCustomEntries={enableCustomEntries}
      showSpaceInfo={viewModel.showSpaceInfo}
      dailyNoteCreateAction={viewModel.dailyNoteCreateAction}
      searchBarAccessory={
        spaces.length > 1 ? (
          <ListSpaceDropdown spaces={spaces} onChange={setSelectedSpaceId} value={selectedSpaceId} includeAll={true} />
        ) : undefined
      }
    />
  );
};

const DetailedResultsView = ({
  config,
  databases,
  query,
  selectedSpaceId,
  setQuery,
  setSelectedSpaceId,
  spaces,
}: SearchViewProps) => {
  const parsedDate = useMemo(
    () => parseNaturalDateInput(query, { supportedLanguages: supportedDateLanguages }),
    [query],
  );
  const dbState = useMemo(() => ({ databases, databasesLoading: false, fatalIssue: null, issues: [] }), [databases]);
  const searchState = useDocumentSearch(dbState, query, {
    parsedDate,
    includeTaskExpansion: enableCustomEntries,
    includeDateFallback: true,
  });
  const createDocumentSpaceId = resolveCreateDocumentSpaceId({
    selectedSpaceId,
    primarySpaceId: config.primarySpace?.spaceID,
  });
  const viewModel = useDocumentSearchViewModel({
    results: searchState.results,
    query,
    config,
    createDocumentSpaceId,
    parsedDate,
    dateDisplayFormat,
    showCurrentYear,
  });

  return (
    <ListDocBlocks
      resultsLoading={searchState.resultsLoading}
      setQuery={setQuery}
      results={searchState.results}
      query={query}
      config={config}
      createDocumentSpaceId={createDocumentSpaceId}
      parsedDate={parsedDate}
      dateDisplayFormat={dateDisplayFormat}
      showCurrentYear={showCurrentYear}
      showSpaceInfo={viewModel.showSpaceInfo}
      allResults={viewModel.allResults}
      dailyNoteCreateAction={viewModel.dailyNoteCreateAction}
      searchBarAccessory={
        spaces.length > 1 ? (
          <ListSpaceDropdown spaces={spaces} onChange={setSelectedSpaceId} value={selectedSpaceId} includeAll={true} />
        ) : undefined
      }
    />
  );
};

const NoSpaces = () => (
  <List
    actions={
      <ActionPanel>
        <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
      </ActionPanel>
    }
  >
    <List.EmptyView
      title="No Spaces found"
      description="Open Craft and let it finish syncing before searching."
      icon="command-icon-small.png"
    />
  </List>
);
