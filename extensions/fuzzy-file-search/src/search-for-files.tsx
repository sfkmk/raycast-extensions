import {
  ActionPanel,
  Action,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchProps,
  LaunchType,
  List,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { basename } from "path";
import { useEffect, useMemo, useState } from "react";
import { ensureFdCLI } from "./lib/fd-downloader";
import { ensureFzfCLI } from "./lib/fzf-downloader";
import { useFileIndex, useMultiLocationIndex, type LocationIndexInfo } from "./hooks/use-file-index";
import { useFuzzySearch } from "./hooks/use-fuzzy-search";
import {
  formatPathForDisplay,
  formatRelativeParentPath,
  getBestMatchingLocation,
  getBuiltinSearchScopes,
  getScopeLocationColorValue,
  getScopeLocationPaths,
  homeSearchScopeId,
  everythingSearchScopeId,
  loadSearchScopesState,
  resolveSearchScope,
} from "./lib/search-scopes";
import type {
  ManageSearchScopesLaunchContext,
  Prefs,
  SearchFilesLaunchContext,
  SearchResult,
  SearchScopeLocation,
} from "./lib/types";

const delayedEmptyViewMs = 600;

type ResultLocationInfo = {
  matchingLocation?: { label: string; color: string; path: string };
  isAvailable: boolean;
  status: "ready" | "offline" | "stale";
};

export default function Command(props: LaunchProps<{ launchContext: SearchFilesLaunchContext }>) {
  const prefs = getPreferenceValues<Prefs>();
  const [searchText, setSearchText] = useState("");
  const [selectedScopeId, setSelectedScopeId] = useState<string | undefined>(props.launchContext?.scopeId);

  const { data: scopeState, isLoading: isScopesLoading } = usePromise(loadSearchScopesState, []);

  const scopes = useMemo(() => scopeState?.scopes ?? getBuiltinSearchScopes(), [scopeState]);
  const activeScope = useMemo(() => {
    if (!scopeState) {
      return undefined;
    }

    return resolveSearchScope(selectedScopeId, scopeState.defaultScopeId, scopeState.scopes);
  }, [scopeState, selectedScopeId]);

  const activeScopeIndex = useMemo(
    () =>
      Math.max(
        0,
        scopes.findIndex((s) => s.id === activeScope?.id),
      ),
    [scopes, activeScope],
  );

  function cycleScope(direction: 1 | -1) {
    const nextIndex = (activeScopeIndex + direction + scopes.length) % scopes.length;
    setSelectedScopeId(scopes[nextIndex].id);
  }

  useEffect(() => {
    if (scopeState && activeScope && activeScope.id !== selectedScopeId) {
      setSelectedScopeId(activeScope.id);
    }
  }, [activeScope, scopeState, selectedScopeId, setSelectedScopeId]);

  const { data: fdPath, isLoading: isFdLoading } = useCachedPromise(async () => {
    try {
      return await ensureFdCLI();
    } catch (error) {
      throw new Error(`Couldn't load the fd CLI: ${error}`);
    }
  });

  const { data: fzfPath, isLoading: isFzfCliLoading } = useCachedPromise(async () => {
    try {
      return await ensureFzfCLI();
    } catch (error) {
      throw new Error(`Couldn't load the fzf CLI: ${error}`);
    }
  });

  const activeScopeLocationPaths = useMemo(
    () => (activeScope ? getScopeLocationPaths(activeScope) : undefined),
    [activeScope],
  );

  const isEverything = activeScope?.id === everythingSearchScopeId;

  const multiLocationIndexState = useMultiLocationIndex(
    isEverything ? activeScope : undefined,
    prefs.followSymlinks,
    fdPath,
  );

  const regularIndexState = useFileIndex({
    fdPath: isEverything ? undefined : fdPath,
    searchRoots: isEverything ? undefined : activeScopeLocationPaths,
    followSymlinks: prefs.followSymlinks,
  });

  const indexState = isEverything ? multiLocationIndexState : regularIndexState;

  const { results, isLoading: isSearchLoading } = useFuzzySearch({
    fzfPath,
    indexPaths: indexState.indexPaths,
    revision: indexState.revision,
    searchText,
    prefs,
    locationInfos: indexState.locationInfos,
  });

  const locationInfoMap = useMemo(() => {
    const map = new Map<string, LocationIndexInfo>();
    for (const info of indexState.locationInfos ?? []) {
      map.set(info.locationId, info);
    }
    return map;
  }, [indexState.locationInfos]);

  const resultLocations = useMemo(() => {
    if (!activeScope) {
      return [];
    }

    if (!isEverything) {
      return activeScope.locations;
    }

    const locationsById = new Map<string, SearchScopeLocation>();
    for (const location of activeScope.locations) {
      locationsById.set(location.id, location);
    }

    for (const scope of scopes) {
      if (scope.id === everythingSearchScopeId) {
        continue;
      }

      for (const location of scope.locations) {
        if (!locationsById.has(location.id)) {
          locationsById.set(location.id, location);
        }
      }
    }

    return Array.from(locationsById.values());
  }, [activeScope, isEverything, scopes]);

  const scopeStatusSummary = useMemo(
    () => summarizeLocationInfos(indexState.locationInfos),
    [indexState.locationInfos],
  );
  const allLocationsUnavailable = scopeStatusSummary.allOffline && !scopeStatusSummary.hasUsableCache;

  const baseListLoading =
    isScopesLoading ||
    isFdLoading ||
    isFzfCliLoading ||
    (!activeScope && isScopesLoading) ||
    (!indexState.indexPaths?.length && indexState.isLoading) ||
    (!results.length && isSearchLoading);

  const resultCounts = useMemo(() => {
    if (!prefs.showResultTypeBreakdown) {
      return { total: results.length };
    }

    let files = 0;
    let folders = 0;
    let symlinks = 0;

    for (const result of results) {
      if (result.isSymbolicLink) {
        symlinks++;
      } else if (result.isDirectory) {
        folders++;
      } else {
        files++;
      }
    }

    return { total: results.length, files, folders, symlinks };
  }, [results, prefs.showResultTypeBreakdown]);

  const resultsSubtitle = useMemo(() => {
    if (resultCounts.total === 0) {
      return "0 results";
    }

    if (!prefs.showResultTypeBreakdown) {
      return `${resultCounts.total} result${resultCounts.total === 1 ? "" : "s"}`;
    }

    const parts: string[] = [];
    if (resultCounts.folders && resultCounts.folders > 0) {
      parts.push(`${resultCounts.folders} Folders`);
    }
    if (resultCounts.files && resultCounts.files > 0) {
      parts.push(`${resultCounts.files} Files`);
    }
    if (resultCounts.symlinks && resultCounts.symlinks > 0) {
      parts.push(`${resultCounts.symlinks} Links`);
    }

    return `${resultCounts.total} Items${parts.length > 0 ? `  –  ${parts.join("  •  ")}` : ""}`;
  }, [resultCounts, prefs.showResultTypeBreakdown]);

  const emptyView = useMemo(() => {
    if (!activeScopeLocationPaths || activeScopeLocationPaths.length === 0) {
      return {
        kind: "no-locations" as const,
        icon: Icon.Folder,
        title: "No search locations",
        description: "This scope has no folders configured. Add locations in the scope manager.",
      };
    }

    if (allLocationsUnavailable) {
      return {
        kind: "unavailable" as const,
        icon: Icon.ExclamationMark,
        title: "Locations not available",
        description: "None of the locations in this scope are connected. Connect a location to search.",
      };
    }

    if (indexState.error) {
      return {
        kind: "error" as const,
        icon: Icon.ExclamationMark,
        title: "Could not index files",
        description: "Something went wrong. Try selecting a different scope or check your folders.",
      };
    }

    if (!indexState.indexPaths?.length && indexState.isLoading) {
      return {
        kind: "indexing" as const,
        icon: Icon.Hourglass,
        title: "Building search index",
        description: "Creating your file index for the first time. This may take a moment for large folders.",
      };
    }

    if (results.length === 0 && searchText && !isSearchLoading) {
      if (scopeStatusSummary.anyOffline && scopeStatusSummary.hasUsableCache) {
        return {
          kind: "no-results-cache" as const,
          icon: Icon.MagnifyingGlass,
          title: "No matching files",
          description: "Some locations are offline - results may be outdated. Try different keywords.",
        };
      }
      return {
        kind: "no-results" as const,
        icon: Icon.MagnifyingGlass,
        title: "No matching files",
        description: "Try different keywords or check your search preferences.",
      };
    }

    if (results.length === 0 && !searchText && scopeStatusSummary.allOffline && scopeStatusSummary.hasUsableCache) {
      return {
        kind: "offline-empty" as const,
        icon: Icon.WifiDisabled,
        title: "Using saved results",
        description: "These locations are offline right now, and there are no saved results to show yet.",
      };
    }

    return undefined;
  }, [
    activeScopeLocationPaths,
    allLocationsUnavailable,
    indexState.error,
    indexState.indexPaths,
    indexState.isLoading,
    results.length,
    searchText,
    isSearchLoading,
    scopeStatusSummary,
  ]);

  const shouldDelayEmptyView =
    emptyView?.kind === "indexing" || emptyView?.kind === "error" || emptyView?.kind === "unavailable";
  const [canShowDelayedEmptyView, setCanShowDelayedEmptyView] = useState(false);

  useEffect(() => {
    if (!shouldDelayEmptyView) {
      setCanShowDelayedEmptyView(false);
      return;
    }
    if (emptyView?.kind === "unavailable") {
      setCanShowDelayedEmptyView(true);
      return;
    }

    setCanShowDelayedEmptyView(false);
    const timeout = setTimeout(() => {
      setCanShowDelayedEmptyView(true);
    }, delayedEmptyViewMs);

    return () => clearTimeout(timeout);
  }, [activeScope?.id, shouldDelayEmptyView, emptyView?.kind]);

  const pendingEmptyView = emptyView && shouldDelayEmptyView && !canShowDelayedEmptyView ? emptyView : undefined;
  const visibleEmptyView = emptyView && (!shouldDelayEmptyView || canShowDelayedEmptyView) ? emptyView : undefined;
  const isListLoading = visibleEmptyView || pendingEmptyView ? false : baseListLoading || shouldDelayEmptyView;

  const getLocationInfo = (
    result: SearchResult,
    scope: { id: string; locations: SearchScopeLocation[] } | undefined,
  ): ResultLocationInfo => {
    if (!scope) {
      return { isAvailable: true, status: "ready" };
    }

    const matchingLocation = getBestMatchingLocation(result.path, resultLocations);
    const sourceLocation = result.sourceLocationId
      ? resultLocations.find((location) => location.id === result.sourceLocationId)
      : matchingLocation;
    const sourceInfo = result.sourceLocationId
      ? locationInfoMap.get(result.sourceLocationId)
      : sourceLocation
        ? locationInfoMap.get(sourceLocation.id)
        : undefined;
    const isAvailable = sourceInfo?.isAvailable ?? true;
    const status: "ready" | "offline" | "stale" =
      sourceInfo?.status === "stale" || sourceInfo?.status === "unavailable"
        ? "stale"
        : sourceInfo?.status === "offline"
          ? "offline"
          : "ready";

    return {
      matchingLocation:
        resultLocations.length > 1 && sourceLocation
          ? { label: sourceLocation.label, color: sourceLocation.color, path: sourceLocation.path }
          : undefined,
      isAvailable,
      status,
    };
  };

  return (
    <List
      isLoading={isListLoading}
      searchBarPlaceholder={"Search for your files"}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search Scope"
          value={activeScope?.id ?? homeSearchScopeId}
          onChange={setSelectedScopeId}
        >
          {scopes.map((scope) => (
            <List.Dropdown.Item key={scope.id} title={scope.name} value={scope.id} />
          ))}
        </List.Dropdown>
      }
    >
      {visibleEmptyView ? (
        <List.EmptyView
          actions={
            <SearchCommandActionPanel
              activeScope={activeScope}
              activeScopeIndex={activeScopeIndex}
              cycleScope={cycleScope}
              scopes={scopes}
            />
          }
          icon={visibleEmptyView.icon}
          title={visibleEmptyView.title}
          description={visibleEmptyView.description}
        />
      ) : pendingEmptyView ? (
        <List.Section title="Status">
          <List.Item
            actions={
              <SearchCommandActionPanel
                activeScope={activeScope}
                activeScopeIndex={activeScopeIndex}
                cycleScope={cycleScope}
                scopes={scopes}
              />
            }
            icon={pendingEmptyView.icon}
            subtitle={pendingEmptyView.description}
            title={pendingEmptyView.title}
          />
        </List.Section>
      ) : (
        <List.Section subtitle={resultsSubtitle} title="Results">
          {results.map((result) => {
            const filepath = result.path;
            const filename = result.name || basename(filepath);
            const subtitle = activeScope
              ? formatRelativeParentPath(filepath, result.isDirectory, activeScope.locations)
              : formatPathForDisplay(filepath);
            const locationInfo = getLocationInfo(result, activeScope);

            const accessories: List.Item.Accessory[] = [];

            if (locationInfo.matchingLocation) {
              accessories.push({
                tag: {
                  value: locationInfo.matchingLocation.label,
                  color: getScopeLocationColorValue(
                    locationInfo.matchingLocation.color as
                      | "blue"
                      | "green"
                      | "magenta"
                      | "orange"
                      | "purple"
                      | "red"
                      | "yellow",
                  ),
                },
                tooltip: formatPathForDisplay(locationInfo.matchingLocation.path),
              });
            }

            if (locationInfo.status !== "ready" && locationInfo.isAvailable === false) {
              const statusText = locationInfo.status === "offline" ? "Offline" : "Stale";
              accessories.push({
                icon: {
                  source: locationInfo.status === "offline" ? Icon.WifiDisabled : Icon.Clock,
                  tintColor: locationInfo.status === "offline" ? Color.SecondaryText : Color.Orange,
                },
                text: statusText,
                tooltip: `${statusText} - Results from cached index`,
              });
            }

            return (
              <List.Item
                key={filepath}
                accessories={accessories}
                icon={getResultIcon(result)}
                title={filename}
                subtitle={subtitle}
                quickLook={{ path: filepath, name: filename }}
                actions={
                  <SearchResultActionPanel
                    result={result}
                    activeScope={activeScope}
                    activeScopeIndex={activeScopeIndex}
                    cycleScope={cycleScope}
                    scopes={scopes}
                    locationInfo={locationInfo}
                  />
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function SearchResultActionPanel({
  result,
  activeScope,
  activeScopeIndex,
  cycleScope,
  scopes,
  locationInfo,
}: {
  result: SearchResult;
  activeScope?: { id: string; locations: SearchScopeLocation[] };
  activeScopeIndex: number;
  cycleScope: (direction: 1 | -1) => void;
  scopes: Array<{ id: string; name: string }>;
  locationInfo: ResultLocationInfo;
}) {
  const filepath = result.path;
  const isAvailable = locationInfo.isAvailable !== false;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {isAvailable ? (
          <>
            <Action.Open title="Open" target={filepath} />
            <Action.ShowInFinder title="Show in Finder" path={filepath} />
            <Action.OpenWith path={filepath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
          </>
        ) : (
          <>
            <Action icon={Icon.Folder} onAction={() => showOfflineLocationToast("open this file")} title="Open" />
            <Action
              icon={Icon.Folder}
              onAction={() => showOfflineLocationToast("reveal this file in Finder")}
              title="Show in Finder"
            />
            <Action
              icon={Icon.AppWindow}
              onAction={() => showOfflineLocationToast("open this file with another app")}
              title="Open with"
            />
            <Action icon={Icon.Eye} onAction={() => showOfflineLocationToast("preview this file")} title="Quick Look" />
          </>
        )}
        <Action.CopyToClipboard
          title="Copy Path to Clipboard"
          content={filepath}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          icon={Icon.ChevronUp}
          onAction={() => cycleScope(-1)}
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
          title={`Scope: ${scopes[(activeScopeIndex - 1 + scopes.length) % scopes.length]?.name}`}
        />
        <Action
          icon={Icon.ChevronDown}
          onAction={() => cycleScope(1)}
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
          title={`Scope: ${scopes[(activeScopeIndex + 1) % scopes.length]?.name}`}
        />
        {activeScope ? (
          <Action
            icon={Icon.Gear}
            onAction={() => openScopeInManager(activeScope.id)}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            title="Manage Current Search Scope"
          />
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function showOfflineLocationToast(actionLabel: string) {
  return showToast({
    style: Toast.Style.Failure,
    title: "Location not available",
    message: `Connect the storage device to ${actionLabel}.`,
  });
}

function SearchCommandActionPanel({
  activeScope,
  activeScopeIndex,
  cycleScope,
  scopes,
}: {
  activeScope?: { id: string };
  activeScopeIndex: number;
  cycleScope: (direction: 1 | -1) => void;
  scopes: Array<{ id: string; name: string }>;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          icon={Icon.ChevronUp}
          onAction={() => cycleScope(-1)}
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
          title={`Scope: ${scopes[(activeScopeIndex - 1 + scopes.length) % scopes.length]?.name}`}
        />
        <Action
          icon={Icon.ChevronDown}
          onAction={() => cycleScope(1)}
          shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
          title={`Scope: ${scopes[(activeScopeIndex + 1) % scopes.length]?.name}`}
        />
        {activeScope ? (
          <Action
            icon={Icon.Gear}
            onAction={() => openScopeInManager(activeScope.id)}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            title="Manage Current Search Scope"
          />
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function openScopeInManager(scopeId: string) {
  const context: ManageSearchScopesLaunchContext = { scopeId };
  await launchCommand({
    name: "manage-search-scopes",
    type: LaunchType.UserInitiated,
    context,
  });
}

function getResultIcon(result: { isDirectory: boolean; isSymbolicLink: boolean }) {
  if (result.isSymbolicLink) {
    return {
      value: Icon.Link,
      tooltip: result.isDirectory ? "Symbolic Link to Folder" : "Symbolic Link to File",
    };
  }

  return result.isDirectory ? Icon.Folder : Icon.Document;
}

function summarizeLocationInfos(locationInfos: LocationIndexInfo[]) {
  return {
    anyOffline: locationInfos.some((locationInfo) => !locationInfo.isAvailable),
    allOffline: locationInfos.length > 0 && locationInfos.every((locationInfo) => !locationInfo.isAvailable),
    hasUsableCache: locationInfos.some((locationInfo) => Boolean(locationInfo.dataPath)),
  };
}
