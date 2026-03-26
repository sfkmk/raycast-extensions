import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createHash } from "crypto";
import { useCallback, useEffect, useMemo, useState } from "react";
import { rebuildLocationIndexes, cleanupFileIndexTempFiles } from "../lib/file-index";
import { getLocationStatus, type LocationStatus } from "../lib/location-status";
import {
  getAllExplicitLocationPaths,
  resolveEverythingScopeLocations,
  resolveScopeLocations,
} from "../lib/search-scopes-helpers";
import type { IndexState, SearchScope } from "../lib/types";

export type LocationIndexInfo = {
  locationId: string;
  locationPath: string;
  dataPath?: string;
  isAvailable: boolean;
  status: LocationStatus;
  hasExactCache: boolean;
  hasFallbackCache: boolean;
  activeHash?: string;
};

export type MultiLocationIndexState = IndexState & {
  locationInfos: LocationIndexInfo[];
};

type UseFileIndexOptions = {
  fdPath?: string;
  searchRoots?: string[];
  followSymlinks: boolean;
};

type LoadedLocationIndexes = {
  locationInfos: LocationIndexInfo[];
  excludePrefixesForRoot?: string[];
};

const emptyState: MultiLocationIndexState = {
  indexPaths: undefined,
  indexPath: undefined,
  revision: undefined,
  isLoading: false,
  isRefreshing: false,
  error: undefined,
  locationInfos: [],
};

export function useFileIndex({ fdPath, searchRoots, followSymlinks }: UseFileIndexOptions): MultiLocationIndexState {
  const searchRootsKey = useMemo(() => (searchRoots ? JSON.stringify(searchRoots) : undefined), [searchRoots]);
  const loadLocations = useCallback(async () => {
    if (!searchRoots || searchRoots.length === 0) {
      return { locationInfos: [] };
    }

    return {
      locationInfos: await Promise.all(
        searchRoots.map((locationPath) => resolveLocationInfo(locationPath, followSymlinks)),
      ),
    } satisfies LoadedLocationIndexes;
  }, [followSymlinks, searchRoots, searchRootsKey]);

  return useResolvedLocationIndex({
    dependencyKey: `regular:${searchRootsKey ?? "none"}:${followSymlinks}`,
    fdPath,
    followSymlinks,
    loadLocations,
  });
}

export function useMultiLocationIndex(
  scope: SearchScope | undefined,
  followSymlinks: boolean,
  fdPath: string | undefined,
): MultiLocationIndexState {
  const scopeKey = useMemo(() => (scope ? `${scope.id}:${followSymlinks}` : undefined), [scope, followSymlinks]);
  const loadLocations = useCallback(async () => {
    if (!scope) {
      return { locationInfos: [] };
    }

    if (scope.id === "builtin:everything") {
      const [resolvedLocations, explicitLocationPaths] = await Promise.all([
        resolveEverythingScopeLocations(followSymlinks),
        getAllExplicitLocationPaths(),
      ]);

      return {
        locationInfos: await Promise.all(
          resolvedLocations.map((location) => resolveLocationInfo(location.locationPath, followSymlinks)),
        ),
        excludePrefixesForRoot: explicitLocationPaths,
      } satisfies LoadedLocationIndexes;
    }

    const resolvedLocations = await resolveScopeLocations(scope, followSymlinks);
    return {
      locationInfos: await Promise.all(
        resolvedLocations.map((location) => resolveLocationInfo(location.locationPath, followSymlinks)),
      ),
    } satisfies LoadedLocationIndexes;
  }, [followSymlinks, scope, scopeKey]);

  return useResolvedLocationIndex({
    dependencyKey: `multi:${scopeKey ?? "none"}`,
    fdPath,
    followSymlinks,
    loadLocations,
  });
}

function useResolvedLocationIndex({
  dependencyKey,
  fdPath,
  followSymlinks,
  loadLocations,
}: {
  dependencyKey: string;
  fdPath?: string;
  followSymlinks: boolean;
  loadLocations: () => Promise<LoadedLocationIndexes>;
}): MultiLocationIndexState {
  const [state, setState] = useState<MultiLocationIndexState>({
    ...emptyState,
    isLoading: true,
  });

  useEffect(() => {
    cleanupFileIndexTempFiles().catch((error) => {
      console.error("Failed to clean stale temp files", error);
    });
  }, []);

  useEffect(() => {
    let canceled = false;
    const abortController = new AbortController();
    let refreshToast: Toast | undefined;

    const run = async () => {
      const { locationInfos, excludePrefixesForRoot } = await loadLocations();

      if (canceled) {
        return;
      }

      if (locationInfos.length === 0) {
        setState(emptyState);
        return;
      }

      const currentState = buildState(locationInfos);
      setState(currentState);

      if (!fdPath) {
        return;
      }

      const availableLocationPaths = locationInfos
        .filter((locationInfo) => locationInfo.isAvailable)
        .map((locationInfo) => locationInfo.locationPath);

      if (availableLocationPaths.length === 0) {
        return;
      }

      setState((current) => ({
        ...current,
        isLoading: current.indexPaths === undefined,
        isRefreshing: true,
      }));

      refreshToast = await showToast({
        style: Toast.Style.Animated,
        title: currentState.indexPaths ? "Updating Index" : "Indexing",
        message: currentState.indexPaths ? "Refreshing search results in background" : "Creating search index",
      });

      try {
        await rebuildLocationIndexes({
          fdPath,
          locationPaths: availableLocationPaths,
          followSymlinks,
          excludePrefixesForRoot,
          signal: abortController.signal,
        });

        if (canceled || abortController.signal.aborted) {
          return;
        }

        const refreshedLocationInfos = await Promise.all(
          locationInfos.map((locationInfo) => resolveLocationInfo(locationInfo.locationPath, followSymlinks)),
        );

        if (canceled || abortController.signal.aborted) {
          return;
        }

        refreshToast?.hide();
        setState({
          ...buildState(refreshedLocationInfos),
          isRefreshing: false,
        });
      } catch (error) {
        refreshToast?.hide();

        if (canceled || abortController.signal.aborted) {
          return;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        setState((current) => ({
          ...current,
          isLoading: false,
          isRefreshing: false,
          error: current.indexPaths ? undefined : errorMessage,
        }));

        await showFailureToast(error, {
          title: currentState.indexPaths ? "Could not refresh search index" : "Could not create search index",
        });
      }
    };

    run().catch((error) => {
      console.error("Failed to manage file index", error);
    });

    return () => {
      canceled = true;
      abortController.abort();
      refreshToast?.hide();
    };
  }, [dependencyKey, fdPath, followSymlinks, loadLocations]);

  return state;
}

function buildState(locationInfos: LocationIndexInfo[]): MultiLocationIndexState {
  const indexPaths = locationInfos
    .map((locationInfo) => locationInfo.dataPath)
    .filter((dataPath): dataPath is string => typeof dataPath === "string");

  return {
    indexPaths: indexPaths.length > 0 ? indexPaths : undefined,
    indexPath: indexPaths.length > 0 ? indexPaths.join("|") : undefined,
    revision: computeRevision(locationInfos),
    isLoading: indexPaths.length === 0,
    isRefreshing: false,
    error: undefined,
    locationInfos,
  };
}

function computeRevision(locationInfos: LocationIndexInfo[]) {
  const comparableStates = locationInfos
    .filter((locationInfo) => locationInfo.dataPath && locationInfo.activeHash)
    .map((locationInfo) => `${locationInfo.locationPath}:${locationInfo.activeHash}`)
    .sort();

  if (comparableStates.length === 0) {
    return undefined;
  }

  return createHash("sha1").update(comparableStates.join("|"), "utf8").digest("hex");
}

async function resolveLocationInfo(locationPath: string, followSymlinks: boolean): Promise<LocationIndexInfo> {
  const statusInfo = await getLocationStatus(locationPath, followSymlinks);

  return {
    locationId: statusInfo.locationId,
    locationPath,
    dataPath: statusInfo.activeDataPath,
    isAvailable: statusInfo.isAvailable,
    status: statusInfo.status,
    hasExactCache: statusInfo.hasExactCache,
    hasFallbackCache: statusInfo.hasFallbackCache,
    activeHash: statusInfo.activeHash,
  };
}
