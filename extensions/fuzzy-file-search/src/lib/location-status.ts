import afs from "fs/promises";
import fs from "fs";
import { buildLocationIndexPaths, deriveLocationId, getLocationManifest } from "./cache";
import type { SearchScopeLocation } from "./types";

export type LocationStatus = "ready" | "notIndexed" | "offline" | "stale" | "unavailable";

export type LocationStatusInfo = {
  locationId: string;
  locationPath: string;
  status: LocationStatus;
  isAvailable: boolean;
  hasExactCache: boolean;
  hasFallbackCache: boolean;
  activeDataPath?: string;
  activeFollowSymlinks?: boolean;
  activeHash?: string;
};

export type ScopeStatusSummary = {
  ready: number;
  notIndexed: number;
  offline: number;
  stale: number;
  unavailable: number;
  unreachable: number;
  total: number;
  anyUnavailable: boolean;
  allUnavailable: boolean;
  anyOffline: boolean;
  allOffline: boolean;
  hasUsableCache: boolean;
};

export async function getLocationStatus(
  location: Pick<SearchScopeLocation, "id" | "path"> | string,
  followSymlinks: boolean,
): Promise<LocationStatusInfo> {
  const locationPath = typeof location === "string" ? location : location.path;
  const locationId = typeof location === "string" ? deriveLocationId(location) : location.id;
  const exactIndexPaths = buildLocationIndexPaths(locationPath, followSymlinks);
  const fallbackIndexPaths = buildLocationIndexPaths(locationPath, !followSymlinks);

  let isAvailable = false;
  try {
    await afs.access(locationPath);
    isAvailable = true;
  } catch {
    isAvailable = false;
  }

  const exactManifest = await getLocationManifest(exactIndexPaths.metadataPath);
  const hasExactCache = exactManifest !== null && fs.existsSync(exactIndexPaths.dataPath);

  const fallbackManifest = await getLocationManifest(fallbackIndexPaths.metadataPath);
  const hasFallbackCache = fallbackManifest !== null && fs.existsSync(fallbackIndexPaths.dataPath);

  let status: LocationStatus;
  let activeDataPath: string | undefined;
  let activeFollowSymlinks: boolean | undefined;
  let activeHash: string | undefined;

  if (hasExactCache) {
    activeDataPath = exactIndexPaths.dataPath;
    activeFollowSymlinks = followSymlinks;
    activeHash = exactManifest?.hash;
  } else if (hasFallbackCache) {
    activeDataPath = fallbackIndexPaths.dataPath;
    activeFollowSymlinks = !followSymlinks;
    activeHash = fallbackManifest?.hash;
  }

  if (hasExactCache && isAvailable) {
    status = "ready";
  } else if (isAvailable) {
    status = "notIndexed";
  } else if (hasExactCache) {
    status = "offline";
  } else if (hasFallbackCache) {
    status = "stale";
  } else {
    status = "unavailable";
  }

  return {
    locationId,
    locationPath,
    status,
    isAvailable,
    hasExactCache,
    hasFallbackCache,
    activeDataPath,
    activeFollowSymlinks,
    activeHash,
  };
}

export async function getScopeLocationsStatus(
  locations: SearchScopeLocation[],
  followSymlinks: boolean,
): Promise<LocationStatusInfo[]> {
  return Promise.all(locations.map((location) => getLocationStatus(location, followSymlinks)));
}

export function summarizeScopeStatus(statuses: LocationStatusInfo[]): ScopeStatusSummary {
  const summary: ScopeStatusSummary = {
    ready: 0,
    notIndexed: 0,
    offline: 0,
    stale: 0,
    unavailable: 0,
    unreachable: 0,
    total: statuses.length,
    anyUnavailable: false,
    allUnavailable: true,
    anyOffline: false,
    allOffline: statuses.length > 0,
    hasUsableCache: false,
  };

  for (const status of statuses) {
    summary[status.status]++;

    if (!status.isAvailable) {
      summary.unreachable++;
      summary.anyUnavailable = true;
      summary.anyOffline = true;
    } else {
      summary.allUnavailable = false;
      summary.allOffline = false;
    }

    if (status.activeDataPath) {
      summary.hasUsableCache = true;
    }
  }

  return summary;
}

export function getStatusLabel(status: LocationStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "notIndexed":
      return "Not indexed";
    case "offline":
      return "Offline";
    case "stale":
      return "Stale";
    case "unavailable":
      return "Offline";
  }
}

export function getStatusDescription(status: LocationStatus): string {
  switch (status) {
    case "ready":
      return "This location is available and indexed.";
    case "notIndexed":
      return "This location is available, but it has not been indexed for the current settings yet.";
    case "offline":
      return "This location is offline, but a recent cache exists.";
    case "stale":
      return "This location is offline. Results may be outdated.";
    case "unavailable":
      return "This location is offline and has no cached data.";
  }
}
