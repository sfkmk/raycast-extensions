import {
  ActionPanel,
  Action,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchProps,
  LaunchType,
  List,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { basename } from "path";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ensureFdCLI } from "./lib/fd-downloader";
import { ensureFzfCLI } from "./lib/fzf-downloader";
import { useFileIndex } from "./hooks/use-file-index";
import { useFuzzySearch } from "./hooks/use-fuzzy-search";
import {
  formatPathForDisplay,
  formatRelativeParentPath,
  getBestMatchingRoot,
  getBuiltinSearchScopes,
  getScopeRootColorValue,
  getScopeRootPaths,
  homeSearchScopeId,
  loadSearchScopesState,
  resolveSearchScope,
} from "./lib/search-scopes";
import type { ManageSearchScopesLaunchContext, Prefs, SearchFilesLaunchContext } from "./lib/types";

const delayedEmptyViewMs = 600;

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

  const activeScopeRootPaths = useMemo(() => (activeScope ? getScopeRootPaths(activeScope) : undefined), [activeScope]);

  const indexState = useFileIndex({
    fdPath,
    searchRoots: activeScopeRootPaths,
    followSymlinks: prefs.followSymlinks,
  });

  const { results, isLoading: isSearchLoading } = useFuzzySearch({
    fzfPath,
    indexPath: indexState.indexPath,
    revision: indexState.revision,
    searchText,
    prefs,
  });

  const baseListLoading =
    isScopesLoading ||
    isFdLoading ||
    isFzfCliLoading ||
    (!activeScope && isScopesLoading) ||
    (!indexState.indexPath && indexState.isLoading) ||
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
    if (!activeScopeRootPaths || activeScopeRootPaths.length === 0) {
      return {
        kind: "no-roots" as const,
        icon: Icon.Folder,
        title: "No search locations",
        description: "This scope has no folders configured. Add locations in the scope manager.",
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

    if (!indexState.indexPath && indexState.isLoading) {
      return {
        kind: "indexing" as const,
        icon: Icon.Hourglass,
        title: "Building search index",
        description: "Creating your file index for the first time. This may take a moment for large folders.",
      };
    }

    if (results.length === 0 && searchText && !isSearchLoading) {
      return {
        kind: "no-results" as const,
        icon: Icon.MagnifyingGlass,
        title: "No matching files",
        description: "Try different keywords or check your search preferences.",
      };
    }

    return undefined;
  }, [
    activeScopeRootPaths,
    indexState.error,
    indexState.indexPath,
    indexState.isLoading,
    results.length,
    searchText,
    isSearchLoading,
  ]);

  const shouldDelayEmptyView = emptyView?.kind === "indexing" || emptyView?.kind === "error";
  const [canShowDelayedEmptyView, setCanShowDelayedEmptyView] = useState(false);

  useEffect(() => {
    if (!shouldDelayEmptyView) {
      setCanShowDelayedEmptyView(false);
      return;
    }

    setCanShowDelayedEmptyView(false);
    const timeout = setTimeout(() => {
      setCanShowDelayedEmptyView(true);
    }, delayedEmptyViewMs);

    return () => clearTimeout(timeout);
  }, [activeScope?.id, shouldDelayEmptyView]);

  const pendingEmptyView = emptyView && shouldDelayEmptyView && !canShowDelayedEmptyView ? emptyView : undefined;
  const visibleEmptyView = emptyView && (!shouldDelayEmptyView || canShowDelayedEmptyView) ? emptyView : undefined;
  const isListLoading = visibleEmptyView || pendingEmptyView ? false : baseListLoading || shouldDelayEmptyView;

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
              ? formatRelativeParentPath(filepath, result.isDirectory, activeScope.roots)
              : formatPathForDisplay(filepath);
            const matchingRoot = activeScope ? getBestMatchingRoot(filepath, activeScope.roots) : undefined;
            const accessories =
              activeScope && activeScope.roots.length > 1 && matchingRoot
                ? [
                    {
                      tag: {
                        value: matchingRoot.label,
                        color: getScopeRootColorValue(matchingRoot.color),
                      },
                      tooltip: formatPathForDisplay(matchingRoot.path),
                    },
                  ]
                : [];

            return (
              <List.Item
                key={filepath}
                accessories={accessories}
                icon={getResultIcon(result)}
                title={filename}
                subtitle={subtitle}
                quickLook={{ path: filepath, name: filename }}
                actions={
                  <SearchCommandActionPanel
                    activeScope={activeScope}
                    activeScopeIndex={activeScopeIndex}
                    cycleScope={cycleScope}
                    scopes={scopes}
                  >
                    <Action.Open title="Open" target={filepath} />
                    <Action.ShowInFinder title="Show in Finder" path={filepath} />
                    <Action.OpenWith path={filepath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                    <Action.CopyToClipboard
                      title="Copy Path to Clipboard"
                      content={filepath}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
                  </SearchCommandActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function SearchCommandActionPanel({
  activeScope,
  activeScopeIndex,
  cycleScope,
  scopes,
  children,
}: {
  activeScope?: { id: string };
  activeScopeIndex: number;
  cycleScope: (direction: 1 | -1) => void;
  scopes: Array<{ id: string; name: string }>;
  children?: ReactNode;
}) {
  return (
    <ActionPanel>
      {children}
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
