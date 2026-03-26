import afs from "fs/promises";
import { loadSearchScopesState, getScopeLocationPaths, everythingSearchScopeId } from "./search-scopes";
import { buildLocationIndexPaths, type LocationIndexPaths, deriveLocationId } from "./cache";
import type { SearchScopeLocation } from "./types";

let cachedExplicitPaths: string[] | null = null;

export function isEverythingScope(searchRoots: string[]): boolean {
  return searchRoots.length === 1 && searchRoots[0] === "/";
}

export async function getAllExplicitLocationPaths(): Promise<string[]> {
  if (cachedExplicitPaths !== null) {
    return cachedExplicitPaths;
  }

  const state = await loadSearchScopesState();
  const explicitPaths = new Set<string>();

  for (const scope of state.scopes) {
    if (scope.id === everythingSearchScopeId) {
      continue;
    }

    for (const locationPath of getScopeLocationPaths(scope)) {
      if (locationPath !== "/") {
        explicitPaths.add(locationPath);
      }
    }
  }

  cachedExplicitPaths = [...explicitPaths].sort((left, right) => right.length - left.length);
  return cachedExplicitPaths;
}

export function clearExplicitPathsCache() {
  cachedExplicitPaths = null;
}

export type LocationWithAvailability = {
  locationId: string;
  locationPath: string;
  indexPaths: LocationIndexPaths;
  isAvailable: boolean;
};

export async function resolveScopeLocations(
  scope: { locations: SearchScopeLocation[] },
  followSymlinks: boolean,
): Promise<LocationWithAvailability[]> {
  const locationPaths = getScopeLocationPaths(scope);
  const results: LocationWithAvailability[] = [];

  for (const locationPath of locationPaths) {
    const indexPaths = buildLocationIndexPaths(locationPath, followSymlinks);
    const isAvailable = await checkLocationAvailable(locationPath);

    results.push({
      locationId: deriveLocationId(locationPath),
      locationPath,
      indexPaths,
      isAvailable,
    });
  }

  return results;
}

export async function resolveEverythingScopeLocations(followSymlinks: boolean): Promise<LocationWithAvailability[]> {
  const explicitPaths = await getAllExplicitLocationPaths();
  const results: LocationWithAvailability[] = [];

  const rootIndexPaths = buildLocationIndexPaths("/", followSymlinks);
  const rootAvailable = await checkLocationAvailable("/");
  results.push({
    locationId: deriveLocationId("/"),
    locationPath: "/",
    indexPaths: rootIndexPaths,
    isAvailable: rootAvailable,
  });

  for (const locationPath of explicitPaths) {
    const indexPaths = buildLocationIndexPaths(locationPath, followSymlinks);
    const isAvailable = await checkLocationAvailable(locationPath);

    results.push({
      locationId: deriveLocationId(locationPath),
      locationPath,
      indexPaths,
      isAvailable,
    });
  }

  return results;
}

async function checkLocationAvailable(locationPath: string): Promise<boolean> {
  try {
    await afs.access(locationPath);
    return true;
  } catch {
    return false;
  }
}
