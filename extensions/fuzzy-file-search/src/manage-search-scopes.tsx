import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  LaunchProps,
  List,
  showToast,
  Toast,
  useNavigation,
  Color,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ensureFdCLI } from "./lib/fd-downloader";
import { rebuildLocationIndexes } from "./lib/file-index";
import {
  formatPathForLocation,
  getDefaultLocationBadgeLabel,
  getDefaultLocationBasePathAlias,
  getLocationBadgeLabel,
} from "./lib/location-display";
import {
  createSavedSearchScope,
  everythingSearchScopeId,
  formatEntryCount,
  formatPathForDisplay,
  formatScopeInsightSummary,
  formatScopeLocationPath,
  formatScopeLocationsMarkdown,
  formatScopeLocationsPreview,
  getBuiltinSearchScopes,
  getScopeLocationColor,
  getScopeLocationColorOptions,
  getScopeLocationColorValue,
  getScopeLocationPaths,
  homeSearchScopeId,
  loadSearchScopeInsights,
  loadSearchScopesState,
  normalizeScopeLocations,
  saveDefaultSearchScopeId,
  saveSavedSearchScopes,
  updateSavedSearchScope,
  validateScopeLocations,
} from "./lib/search-scopes";
import { getAllExplicitLocationPaths, isEverythingScope, clearExplicitPathsCache } from "./lib/search-scopes-helpers";
import {
  getScopeLocationsStatus,
  summarizeScopeStatus,
  getStatusLabel,
  type LocationStatusInfo,
} from "./lib/location-status";
import type {
  ManageSearchScopesLaunchContext,
  Prefs,
  SavedSearchScope,
  SearchFilesLaunchContext,
  SearchScope,
  SearchScopeId,
  SearchScopeInsights,
  SearchScopeLocation,
  SearchScopeLocationColor,
} from "./lib/types";

type ScopeFormValues = {
  name: string;
  locations: string[];
};

type LocationFormValues = {
  badgeLabel: string;
  basePathAlias: string;
  color: SearchScopeLocationColor | "automatic";
};

const automaticLocationColorValue = "automatic";

export default function Command(props: LaunchProps<{ launchContext: ManageSearchScopesLaunchContext }>) {
  const prefs = getPreferenceValues<Prefs>();
  const { data, isLoading, revalidate } = usePromise(
    async (followSymlinks: boolean) => loadManagerData(followSymlinks),
    [prefs.followSymlinks],
  );
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(props.launchContext?.scopeId);
  const [reindexingScopeCounts, setReindexingScopeCounts] = useState<Partial<Record<SearchScopeId, number>>>({});

  const scopes = data?.scopes ?? getBuiltinSearchScopes();
  const defaultScopeId = data?.defaultScopeId ?? homeSearchScopeId;
  const builtInScopes = scopes.filter((scope) => scope.isBuiltin);
  const savedScopes = scopes.filter((scope) => !scope.isBuiltin);

  useEffect(() => {
    if (!data) {
      return;
    }

    const nextSelectedId = scopes.some((scope) => scope.id === selectedItemId)
      ? selectedItemId
      : props.launchContext?.scopeId && scopes.some((scope) => scope.id === props.launchContext?.scopeId)
        ? props.launchContext?.scopeId
        : undefined;

    if (nextSelectedId !== selectedItemId) {
      setSelectedItemId(nextSelectedId);
    }
  }, [data, props.launchContext?.scopeId, scopes, selectedItemId]);

  async function handleReindexScope(
    scope: SearchScope,
    options?: {
      startTitle?: string;
      startMessage?: string;
      successTitle?: string;
      successMessage?: string;
    },
  ) {
    setReindexingScopeCounts((current) => ({
      ...current,
      [scope.id]: (current[scope.id] ?? 0) + 1,
    }));

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: options?.startTitle ?? `Reindexing ${scope.name}`,
      message:
        options?.startMessage ??
        (prefs.followSymlinks ? "Refreshing standard and linked results" : "Refreshing this scope now"),
    });

    try {
      const fdPath = await ensureFdCLI();
      const scopePaths = getScopeLocationPaths(scope);
      const isEverything = isEverythingScope(scopePaths);
      const explicitLocationPaths = isEverything ? await getAllExplicitLocationPaths() : undefined;
      const locationPaths = isEverything ? ["/", ...(explicitLocationPaths ?? [])] : scopePaths;
      const excludePrefixesForRoot = isEverything ? explicitLocationPaths : undefined;

      for (const followSymlinks of prefs.followSymlinks ? [false, true] : [false]) {
        await rebuildLocationIndexes({
          fdPath,
          locationPaths,
          followSymlinks,
          excludePrefixesForRoot,
        });
      }

      clearExplicitPathsCache();
      toast.style = Toast.Style.Success;
      toast.title = options?.successTitle ?? `Indexed ${scope.name}`;
      toast.message =
        options?.successMessage ??
        (prefs.followSymlinks ? "Standard and linked results are ready" : "Search results are ready");
      await revalidate();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: `Could not index ${scope.name}` });
    } finally {
      setReindexingScopeCounts((current) => {
        const nextCount = (current[scope.id] ?? 1) - 1;
        if (nextCount > 0) {
          return {
            ...current,
            [scope.id]: nextCount,
          };
        }

        const nextState = { ...current };
        delete nextState[scope.id];
        return nextState;
      });
    }
  }

  async function handleCreateScope(values: ScopeFormValues) {
    const scope = await createSavedSearchScope(values);
    await saveSavedSearchScopes([...(data?.savedScopes ?? []), scope]);
    await revalidate();
    void handleReindexScope(scope, {
      startTitle: `Created ${scope.name}`,
      startMessage: "Indexing this scope now",
      successTitle: `Indexed ${scope.name}`,
      successMessage: "Search results are ready",
    });
  }

  async function handleUpdateScope(scope: SavedSearchScope, values: ScopeFormValues) {
    const nextScope = await updateSavedSearchScope(scope, values);
    const nextScopes = (data?.savedScopes ?? []).map((entry) => (entry.id === scope.id ? nextScope : entry));
    await saveSavedSearchScopes(nextScopes);
    await revalidate();
    void handleReindexScope(nextScope, {
      startTitle: `Saved ${nextScope.name}`,
      startMessage: "Refreshing this scope now",
      successTitle: `Indexed ${nextScope.name}`,
      successMessage: "Search results are up to date",
    });

    return nextScope;
  }

  async function handleUpdateScopeLocations(scope: SavedSearchScope, locations: SearchScopeLocation[]) {
    const nextScope = await updateSavedSearchScope(scope, { name: scope.name, locations });
    const nextScopes = (data?.savedScopes ?? []).map((entry) => (entry.id === scope.id ? nextScope : entry));
    await saveSavedSearchScopes(nextScopes);
    await showToast({ style: Toast.Style.Success, title: `Saved changes to ${scope.name}` });
    await revalidate();
    return nextScope;
  }

  async function handleDeleteScope(scope: SavedSearchScope) {
    const confirmed = await confirmAlert({
      title: `Delete ${scope.name}?`,
      message: "This removes the saved scope from the dropdown but keeps the folders on disk untouched.",
      primaryAction: {
        title: "Delete Scope",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const nextScopes = (data?.savedScopes ?? []).filter((entry) => entry.id !== scope.id);
    await saveSavedSearchScopes(nextScopes);

    if (defaultScopeId === scope.id) {
      await saveDefaultSearchScopeId(homeSearchScopeId);
    }

    await showToast({ style: Toast.Style.Success, title: `Deleted ${scope.name}` });
    await revalidate();
  }

  async function handleMoveScope(scope: SavedSearchScope, direction: "up" | "down") {
    const currentSavedScopes = data?.savedScopes ?? [];
    const currentIndex = currentSavedScopes.findIndex((s) => s.id === scope.id);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentSavedScopes.length) {
      return;
    }

    const nextScopes = [...currentSavedScopes];
    [nextScopes[currentIndex], nextScopes[targetIndex]] = [nextScopes[targetIndex], nextScopes[currentIndex]];
    await saveSavedSearchScopes(nextScopes);
    await revalidate();
  }

  async function handleSetDefaultScope(scopeId: SearchScopeId, scopeName: string) {
    await saveDefaultSearchScopeId(scopeId);
    await showToast({ style: Toast.Style.Success, title: `${scopeName} is now the default scope` });
    await revalidate();
  }

  return (
    <List
      isLoading={isLoading}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      searchBarPlaceholder="Manage search scopes"
      selectedItemId={selectedItemId}
    >
      <List.Section title="Built-In Scopes">
        {builtInScopes.map((scope) => (
          <List.Item
            key={scope.id}
            icon={scope.id === everythingSearchScopeId ? Icon.Globe : Icon.House}
            title={scope.name}
            subtitle={formatScopeLocationsPreview(scope)}
            accessories={buildScopeAccessories(
              scope,
              data?.insightsById[scope.id],
              data?.locationStatusesById[scope.id],
              defaultScopeId,
              Boolean(reindexingScopeCounts[scope.id]),
            )}
            actions={
              <ScopeActionPanel
                defaultScopeId={defaultScopeId}
                onCreateScope={handleCreateScope}
                onDeleteScope={handleDeleteScope}
                onReindexScope={handleReindexScope}
                onSetDefaultScope={handleSetDefaultScope}
                onUpdateScopeLocations={handleUpdateScopeLocations}
                onUpdateScope={handleUpdateScope}
                scope={scope}
              />
            }
          />
        ))}
      </List.Section>

      <List.Section subtitle={savedScopes.length > 0 ? `${savedScopes.length}` : undefined} title="Saved Scopes">
        {savedScopes.map((scope, index) => (
          <List.Item
            key={scope.id}
            actions={
              <ScopeActionPanel
                defaultScopeId={defaultScopeId}
                index={index}
                moveScope={handleMoveScope}
                onCreateScope={handleCreateScope}
                onDeleteScope={handleDeleteScope}
                onReindexScope={handleReindexScope}
                onSetDefaultScope={handleSetDefaultScope}
                onUpdateScopeLocations={handleUpdateScopeLocations}
                onUpdateScope={handleUpdateScope}
                scope={scope}
                total={savedScopes.length}
              />
            }
            accessories={buildScopeAccessories(
              scope,
              data?.insightsById[scope.id],
              data?.locationStatusesById[scope.id],
              defaultScopeId,
              Boolean(reindexingScopeCounts[scope.id]),
            )}
            icon={Icon.Filter}
            subtitle={formatScopeLocationsPreview(scope)}
            title={scope.name}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ScopeActionPanel({
  scope,
  defaultScopeId,
  onCreateScope,
  onUpdateScope,
  onUpdateScopeLocations,
  onDeleteScope,
  onReindexScope,
  onSetDefaultScope,
  moveScope,
  index,
  total,
}: {
  scope: SearchScope;
  defaultScopeId: SearchScopeId;
  onCreateScope: (values: ScopeFormValues) => Promise<void>;
  onUpdateScope: (scope: SavedSearchScope, values: ScopeFormValues) => Promise<SavedSearchScope>;
  onUpdateScopeLocations: (scope: SavedSearchScope, locations: SearchScopeLocation[]) => Promise<SavedSearchScope>;
  onDeleteScope: (scope: SavedSearchScope) => Promise<void>;
  onReindexScope: (scope: SearchScope) => Promise<void>;
  onSetDefaultScope: (scopeId: SearchScopeId, scopeName: string) => Promise<void>;
  moveScope?: (scope: SavedSearchScope, direction: "up" | "down") => Promise<void>;
  index?: number;
  total?: number;
}) {
  const isDefault = scope.id === defaultScopeId;
  const canMoveUp = moveScope !== undefined && index !== undefined && index > 0;
  const canMoveDown = moveScope !== undefined && index !== undefined && total !== undefined && index < total - 1;

  return (
    <ActionPanel>
      <Action icon={Icon.MagnifyingGlass} onAction={() => openScopeInSearch(scope.id)} title="Search This Scope" />

      <Action icon={Icon.Repeat} onAction={() => onReindexScope(scope)} title="Rebuild Search Index" />

      {!scope.isBuiltin ? (
        <Action.Push
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={
            <SearchScopeEditor
              onUpdateScope={onUpdateScope}
              onUpdateScopeLocations={onUpdateScopeLocations}
              scope={scope as SavedSearchScope}
            />
          }
          title="Edit Search Scope"
        />
      ) : null}

      <Action.Push
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<SearchScopeForm onCreate={onCreateScope} onUpdate={onUpdateScope} />}
        title="Add Search Scope"
      />

      {!isDefault ? (
        <Action
          icon={Icon.Star}
          onAction={() => onSetDefaultScope(scope.id, scope.name)}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          title="Set as Default Scope"
        />
      ) : null}

      {canMoveUp ? (
        <Action
          icon={Icon.ArrowUp}
          onAction={() => moveScope?.(scope as SavedSearchScope, "up")}
          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
          title="Move up"
        />
      ) : null}

      {canMoveDown ? (
        <Action
          icon={Icon.ArrowDown}
          onAction={() => moveScope?.(scope as SavedSearchScope, "down")}
          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
          title="Move Down"
        />
      ) : null}

      <Action.Push
        icon={Icon.BarChart}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        target={<SearchScopeInsightsDetail scope={scope} />}
        title="Show Index Insights"
      />

      <Action.CopyToClipboard
        content={getScopeLocationPaths(scope).join("\n")}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        title="Copy Search Locations"
      />

      {scope.isBuiltin ? null : (
        <Action
          icon={Icon.Trash}
          onAction={() => onDeleteScope(scope as SavedSearchScope)}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          style={Action.Style.Destructive}
          title="Delete Search Scope"
        />
      )}
    </ActionPanel>
  );
}

function SearchScopeForm({
  scope,
  onCreate,
  onUpdate,
}: {
  scope?: SavedSearchScope;
  onCreate: (values: ScopeFormValues) => Promise<void>;
  onUpdate: (scope: SavedSearchScope, values: ScopeFormValues) => Promise<SavedSearchScope>;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: ScopeFormValues) {
    const name = values.name.trim();
    const selectedLocations = values.locations ?? [];
    const normalizedLocations = normalizeScopeLocations(selectedLocations);

    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }

    if (normalizedLocations.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Choose at least one folder" });
      return;
    }

    const issues = await validateScopeLocations(selectedLocations);
    if (issues.length > 0) {
      await showToast({ style: Toast.Style.Failure, title: issues[0] });
      return;
    }

    if (scope) {
      await onUpdate(scope, { name, locations: selectedLocations });
    } else {
      await onCreate({ name, locations: selectedLocations });
    }
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title={scope ? "Save Search Scope" : "Create Search Scope"} />
        </ActionPanel>
      }
    >
      <Form.TextField defaultValue={scope?.name} id="name" placeholder="Work" title="Name" />
      <Form.FilePicker
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={scope ? getScopeLocationPaths(scope) : undefined}
        id="locations"
        title="Folders"
      />
    </Form>
  );
}

function SearchScopeEditor({
  scope,
  onUpdateScope,
  onUpdateScopeLocations,
}: {
  scope: SavedSearchScope;
  onUpdateScope: (scope: SavedSearchScope, values: ScopeFormValues) => Promise<SavedSearchScope>;
  onUpdateScopeLocations: (scope: SavedSearchScope, locations: SearchScopeLocation[]) => Promise<SavedSearchScope>;
}) {
  const prefs = getPreferenceValues<Prefs>();
  const [currentScope, setCurrentScope] = useState(scope);

  const { data: locationStatuses } = usePromise(
    async (locations: SearchScopeLocation[], followSymlinks: boolean) => {
      return getScopeLocationsStatus(locations, followSymlinks);
    },
    [currentScope.locations, prefs.followSymlinks],
  );

  async function handleUpdateScopeSettings(values: ScopeFormValues) {
    const nextScope = await onUpdateScope(currentScope, values);
    setCurrentScope(nextScope);
    return nextScope;
  }

  async function handleUpdateLocation(locationPath: string, values: LocationFormValues) {
    const nextLocations = currentScope.locations.map((location) =>
      location.path === locationPath
        ? {
            ...location,
            badgeLabelOverride: values.badgeLabel.trim() || undefined,
            basePathAliasOverride: values.basePathAlias.trim() || undefined,
            colorOverride: values.color === automaticLocationColorValue ? undefined : values.color,
          }
        : location,
    );
    const nextScope = await onUpdateScopeLocations(currentScope, nextLocations);
    setCurrentScope(nextScope);
  }

  async function handleRemoveLocation(locationPath: string) {
    if (currentScope.locations.length === 1) {
      await showToast({ style: Toast.Style.Failure, title: "A scope needs at least one location" });
      return;
    }

    const location = currentScope.locations.find((entry) => entry.path === locationPath);
    if (!location) {
      return;
    }

    const confirmed = await confirmAlert({
      title: `Remove ${getLocationBadgeLabel(location)}?`,
      message: "This removes the location from the scope but keeps the folder on disk untouched.",
      primaryAction: {
        title: "Remove Location",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const nextScope = await onUpdateScopeLocations(
      currentScope,
      currentScope.locations.filter((entry) => entry.path !== locationPath),
    );
    setCurrentScope(nextScope);
  }

  const scopeSettingsTarget = (
    <SearchScopeForm
      onCreate={async () => undefined}
      onUpdate={async (_scope, values) => handleUpdateScopeSettings(values)}
      scope={currentScope}
    />
  );

  return (
    <List searchBarPlaceholder="Edit search scope">
      <List.Section title="Scope">
        <List.Item
          icon={Icon.Filter}
          title={currentScope.name}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={scopeSettingsTarget}
                title="Edit Scope"
              />
              <Action.Push
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={scopeSettingsTarget}
                title="Add Search Location"
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Locations">
        {currentScope.locations.map((location) => {
          const statusInfo = locationStatuses?.find((s) => s.locationId === location.id);
          const badgeLabel = getLocationBadgeLabel(location);
          const accessories: List.Item.Accessory[] = [
            {
              tag: {
                value: badgeLabel,
                color: getScopeLocationColorValue(getScopeLocationColor(location)),
              },
            },
          ];

          if (statusInfo) {
            if (!statusInfo.isAvailable) {
              if (statusInfo.status === "stale") {
                accessories.push({
                  icon: { source: Icon.Clock, tintColor: Color.Orange },
                  text: "Stale",
                  tooltip: "Offline - using an older saved index",
                });
              } else {
                accessories.push({
                  icon: { source: Icon.CircleDisabled, tintColor: Color.Red },
                  text: "Offline",
                  tooltip:
                    statusInfo.status === "offline"
                      ? "Offline - searchable from saved results"
                      : "Offline - connect storage to search",
                });
              }
            } else if (statusInfo.status === "notIndexed") {
              accessories.push({
                icon: { source: Icon.Circle, tintColor: Color.SecondaryText },
                tooltip: `${getStatusLabel(statusInfo.status)} - rebuild to search this location`,
              });
            }
          }

          return (
            <List.Item
              key={location.path}
              accessories={accessories}
              icon={Icon.Folder}
              subtitle={formatScopeLocationPath(location)}
              title={badgeLabel}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={
                      <SearchScopeLocationForm
                        onSubmit={(values) => handleUpdateLocation(location.path, values)}
                        location={location}
                      />
                    }
                    title="Edit Location Metadata"
                  />
                  <Action.Push
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={scopeSettingsTarget}
                    title="Add Search Location"
                  />
                  <Action
                    icon={Icon.Trash}
                    onAction={() => handleRemoveLocation(location.path)}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    style={Action.Style.Destructive}
                    title="Remove Search Location"
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function SearchScopeLocationForm({
  location,
  onSubmit,
}: {
  location: SearchScopeLocation;
  onSubmit: (values: LocationFormValues) => Promise<void>;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: LocationFormValues) {
    await onSubmit({
      badgeLabel: values.badgeLabel,
      basePathAlias: values.basePathAlias,
      color: values.color,
    });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Location Metadata" />
        </ActionPanel>
      }
    >
      <Form.Description text={location.path} title="Location" />
      <Form.TextField
        defaultValue={location.badgeLabelOverride ?? ""}
        id="badgeLabel"
        placeholder={getDefaultLocationBadgeLabel(location.path)}
        title="Badge Label"
      />
      <Form.TextField
        defaultValue={location.basePathAliasOverride ?? ""}
        id="basePathAlias"
        placeholder={getDefaultLocationBasePathAlias(location.path)}
        title="Base Path Alias"
      />
      <Form.Dropdown
        defaultValue={location.colorOverride ?? automaticLocationColorValue}
        id="color"
        title="Badge Color"
      >
        <Form.Dropdown.Item title="Automatic" value={automaticLocationColorValue} />
        {getScopeLocationColorOptions().map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            icon={{ source: Icon.Circle, tintColor: option.color }}
            title={option.title}
            value={option.value}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function SearchScopeInsightsDetail({ scope }: { scope: SearchScope }) {
  const { data: insights, isLoading } = usePromise(loadSearchScopeInsights, [scope]);

  return <Detail isLoading={isLoading} markdown={buildScopeInsightsMarkdown(scope, insights)} />;
}

function buildScopeAccessories(
  scope: SearchScope,
  insights: SearchScopeInsights | undefined,
  locationStatuses: LocationStatusInfo[] | undefined,
  defaultScopeId: SearchScopeId,
  isIndexing: boolean,
) {
  const indexSummaryAccessory = insights?.latest?.metadata
    ? { text: formatScopeInsightSummary(insights) }
    : isIndexing
      ? undefined
      : {
          icon: { source: Icon.Circle, tintColor: Color.SecondaryText },
          text: "Not indexed",
          tooltip: "This scope has not been indexed yet",
        };

  const accessories: List.Item.Accessory[] = [
    ...(scope.id === defaultScopeId ? [{ text: "Default" }] : []),
    { text: scope.locations.length === 1 ? "1 location" : `${scope.locations.length} locations` },
    ...(indexSummaryAccessory ? [indexSummaryAccessory] : []),
  ];

  if (locationStatuses && locationStatuses.length > 0) {
    const summary = summarizeScopeStatus(locationStatuses);
    if (summary.stale > 0) {
      accessories.push({
        icon: { source: Icon.Clock, tintColor: Color.Orange },
        text: `${summary.stale} stale`,
        tooltip: `${summary.stale} location${summary.stale === 1 ? " is" : "s are"} using an older saved index`,
      });
    }
    if (summary.unreachable > 0) {
      accessories.push({
        icon: { source: Icon.CircleDisabled, tintColor: Color.Red },
        text: `${summary.unreachable} offline`,
        tooltip: `${summary.unreachable} location${summary.unreachable === 1 ? " is" : "s are"} currently offline`,
      });
    }
  }

  if (isIndexing) {
    accessories.push({
      icon: Icon.Hourglass,
      text: "Indexing",
      tooltip: "Refreshing this scope now",
    });
  } else if (insights?.latest?.metadata) {
    const builtAtDate = new Date(insights.latest.metadata.builtAt);
    const exactTime = builtAtDate.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
    accessories.push({
      icon: Icon.Clock,
      date: builtAtDate,
      tooltip: `Last indexed: ${exactTime}`,
    });
  }

  return accessories;
}

function buildScopeInsightsMarkdown(scope: SearchScope, insights: SearchScopeInsights | undefined) {
  const title = `# ${scope.name}`;
  const locations = `## Search Locations\n${formatScopeLocationsMarkdown(scope)}`;
  const variants =
    insights?.variants.map((variant) => buildVariantMarkdown(scope, variant)).join("\n\n") ?? "No index data yet.";

  return [title, locations, `## Index Insights\n${variants}`].join("\n\n");
}

function buildVariantMarkdown(scope: SearchScope, variant: SearchScopeInsights["variants"][number]) {
  const heading = variant.followSymlinks ? "### Follow Symbolic Links" : "### Standard Traversal";

  if (!variant.metadata) {
    return `${heading}\n- Status: Not indexed`;
  }

  return [
    heading,
    `- Status: Indexed`,
    `- Entries: ${formatEntryCount(variant.metadata.entryCount)}`,
    `- Built: ${new Date(variant.metadata.builtAt).toLocaleString()}`,
    `- Locations: ${variant.metadata.searchRoots.map((searchRoot) => formatSearchRootForScope(scope, searchRoot)).join(", ")}`,
  ].join("\n");
}

function formatSearchRootForScope(scope: SearchScope, searchRoot: string) {
  const matchingLocation = scope.locations.find((location) => location.path === searchRoot);
  return matchingLocation ? formatPathForLocation(searchRoot, matchingLocation) : formatPathForDisplay(searchRoot);
}

async function loadManagerData(followSymlinks: boolean) {
  const state = await loadSearchScopesState();
  const [insightEntries, locationStatusEntries] = await Promise.all([
    Promise.all(state.scopes.map(async (scope) => [scope.id, await loadSearchScopeInsights(scope)] as const)),
    Promise.all(
      state.scopes.map(async (scope) => {
        return [scope.id, await getScopeLocationsStatus(scope.locations, followSymlinks)] as const;
      }),
    ),
  ]);

  return {
    ...state,
    insightsById: Object.fromEntries(insightEntries),
    locationStatusesById: Object.fromEntries(locationStatusEntries),
  };
}

async function openScopeInSearch(scopeId: SearchScopeId) {
  const context: SearchFilesLaunchContext = { scopeId };
  await launchCommand({
    name: "search-for-files",
    type: LaunchType.UserInitiated,
    context,
  });
}
