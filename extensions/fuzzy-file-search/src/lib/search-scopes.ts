import { Color, LocalStorage } from "@raycast/api";
import { createHash, randomUUID } from "crypto";
import afs from "fs/promises";
import os from "os";
import path from "path";
import { buildLocationIndexPaths, getLocationManifest } from "./cache";
import {
  formatPathForDisplay as formatDisplayPath,
  formatScopeLocationPath as formatDisplayScopeLocationPath,
  getDefaultLocationBadgeLabel,
  getLegacyDefaultLocationBadgeLabel,
  getLocationBadgeLabel,
} from "./location-display";
import type {
  SavedSearchScope,
  SearchScope,
  SearchScopeId,
  SearchScopeIndexVariant,
  SearchScopeInsights,
  SearchScopeLocation,
  SearchScopeLocationColor,
  IndexMetadata,
} from "./types";

const savedSearchScopesKeyV1 = "saved-search-scopes-v1";
const savedSearchScopesKeyV2 = "saved-search-scopes-v2";
const defaultSearchScopeKey = "default-search-scope-v1";

const scopeLocationColorPalette: SearchScopeLocationColor[] = [
  "blue",
  "green",
  "orange",
  "magenta",
  "purple",
  "yellow",
  "red",
];

const scopeLocationColorMap: Record<SearchScopeLocationColor, Color.ColorLike> = {
  blue: Color.Blue,
  green: Color.Green,
  magenta: Color.Magenta,
  orange: Color.Orange,
  purple: Color.Purple,
  red: Color.Red,
  yellow: Color.Yellow,
};

const scopeLocationColorTitles: Record<SearchScopeLocationColor, string> = {
  blue: "Blue",
  green: "Green",
  magenta: "Magenta",
  orange: "Orange",
  purple: "Purple",
  red: "Red",
  yellow: "Yellow",
};

export const homeSearchScopeId = "builtin:home";
export const everythingSearchScopeId = "builtin:everything";

export async function loadSearchScopesState() {
  const [savedScopes, storedDefaultScopeId] = await Promise.all([loadSavedSearchScopes(), loadDefaultSearchScopeId()]);
  const scopes = [...getBuiltinSearchScopes(), ...savedScopes];

  return {
    defaultScopeId: resolveSearchScopeId(storedDefaultScopeId, scopes),
    savedScopes,
    scopes,
  };
}

export function getBuiltinSearchScopes(): SearchScope[] {
  return [
    {
      id: homeSearchScopeId,
      name: "Home",
      locations: [createSearchScopeLocation(os.homedir(), { colorOverride: "blue" })],
      isBuiltin: true,
    },
    {
      id: everythingSearchScopeId,
      name: "Everything",
      locations: [createSearchScopeLocation("/", { colorOverride: "orange" })],
      isBuiltin: true,
    },
  ];
}

export function resolveSearchScopeId(scopeId: string | undefined, scopes: SearchScope[]) {
  if (scopeId && scopes.some((scope) => scope.id === scopeId)) {
    return scopeId;
  }

  return homeSearchScopeId;
}

export function resolveSearchScope(
  scopeId: string | undefined,
  defaultScopeId: string | undefined,
  scopes: SearchScope[],
) {
  const fallbackId = resolveSearchScopeId(defaultScopeId, scopes);
  return scopes.find((scope) => scope.id === scopeId) ?? scopes.find((scope) => scope.id === fallbackId) ?? scopes[0];
}

export async function saveSavedSearchScopes(scopes: SavedSearchScope[]) {
  await LocalStorage.setItem(savedSearchScopesKeyV2, JSON.stringify(scopes));
}

export async function saveDefaultSearchScopeId(scopeId: SearchScopeId) {
  await LocalStorage.setItem(defaultSearchScopeKey, scopeId);
}

export async function createSavedSearchScope({
  name,
  locations,
}: {
  name: string;
  locations: Array<string | SearchScopeLocation>;
}) {
  const now = new Date().toISOString();

  return {
    id: `custom:${randomUUID()}`,
    name: name.trim(),
    locations: normalizeScopeLocations(locations),
    isBuiltin: false as const,
    createdAt: now,
    updatedAt: now,
  } satisfies SavedSearchScope;
}

export async function updateSavedSearchScope(
  scope: SavedSearchScope,
  updates: { name: string; locations: Array<string | SearchScopeLocation> },
) {
  return {
    ...scope,
    name: updates.name.trim(),
    locations: mergeScopeLocations(scope.locations, updates.locations),
    updatedAt: new Date().toISOString(),
  } satisfies SavedSearchScope;
}

export function normalizeScopeLocations(locations: Array<string | Partial<SearchScopeLocation> | SearchScopeLocation>) {
  const normalizedLocations = new Map<string, SearchScopeLocation>();

  for (const location of locations) {
    const normalizedLocation = normalizeScopeLocation(location);
    if (!normalizedLocation) {
      continue;
    }

    normalizedLocations.set(normalizedLocation.path, normalizedLocation);
  }

  return Array.from(normalizedLocations.values());
}

export async function validateScopeLocations(locations: string[]) {
  const issues: string[] = [];

  for (const location of locations) {
    try {
      const stats = await afs.stat(location);
      if (!stats.isDirectory()) {
        issues.push(`${formatPathForDisplay(location)} is not a directory`);
      }
    } catch {
      issues.push(`${formatPathForDisplay(location)} does not exist`);
    }
  }

  return issues;
}

export function getScopeLocationPaths(scope: Pick<SearchScope, "locations">) {
  return scope.locations.map((location) => location.path);
}

export function getEffectiveSearchScopeLocations(scope: SearchScope, scopes: SearchScope[] = [scope]) {
  if (scope.id !== everythingSearchScopeId) {
    return scope.locations;
  }

  const locationsByPath = new Map<string, SearchScopeLocation>();

  for (const location of scope.locations) {
    locationsByPath.set(normalizeLocationPath(location.path), location);
  }

  for (const candidateScope of scopes) {
    if (candidateScope.id === everythingSearchScopeId) {
      continue;
    }

    for (const location of candidateScope.locations) {
      const normalizedPath = normalizeLocationPath(location.path);
      if (!locationsByPath.has(normalizedPath)) {
        locationsByPath.set(normalizedPath, location);
      }
    }
  }

  return Array.from(locationsByPath.values());
}

export function formatPathForDisplay(filePath: string) {
  return formatDisplayPath(filePath);
}

export function getBestMatchingLocation(filePath: string, locations: SearchScopeLocation[]) {
  const normalizedPath = path.normalize(filePath);

  return [...locations]
    .sort((left, right) => right.path.length - left.path.length)
    .find((location) => {
      const normalizedLocation = path.normalize(location.path);
      return normalizedPath === normalizedLocation || normalizedPath.startsWith(`${normalizedLocation}${path.sep}`);
    });
}

export function formatRelativeParentPath(filePath: string, isDirectory: boolean, locations: SearchScopeLocation[]) {
  const matchingLocation = getBestMatchingLocation(filePath, locations);
  if (!matchingLocation) {
    return withTrailingSlash(formatPathForDisplay(path.dirname(filePath)));
  }

  const isHomeLocation = matchingLocation.path === os.homedir();
  const locationLabel = isHomeLocation ? "~" : "./";

  const relativePath = path.relative(matchingLocation.path, filePath);
  if (!relativePath || relativePath === ".") {
    return locationLabel;
  }

  const parentPath = isDirectory ? path.dirname(relativePath) : path.dirname(relativePath);
  if (!parentPath || parentPath === ".") {
    return locationLabel;
  }

  return withTrailingSlash(isHomeLocation ? `~/${parentPath}` : `./${parentPath}`);
}

export function formatScopeLocationPath(location: SearchScopeLocation) {
  return formatDisplayScopeLocationPath(location);
}

export function formatScopeLocationsPreview(scope: Pick<SearchScope, "locations">) {
  if (scope.locations.length === 0) {
    return "No folders selected";
  }

  if (scope.locations.length === 1) {
    return formatScopeLocationPreview(scope.locations[0]);
  }

  return `${getLocationBadgeLabel(scope.locations[0])} +${scope.locations.length - 1} more`;
}

export function formatScopeLocationsMarkdown(scope: Pick<SearchScope, "locations">) {
  return scope.locations
    .map((location) => `- ${getLocationBadgeLabel(location)}: \`${formatScopeLocationPath(location)}\``)
    .join("\n");
}

export function formatEntryCount(entryCount: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(entryCount);
}

export function formatRelativeTime(isoDate: string) {
  const deltaMs = new Date(isoDate).getTime() - Date.now();
  const minutes = Math.round(deltaMs / 60_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, "hour");
  }

  const days = Math.round(hours / 24);
  return formatter.format(days, "day");
}

export async function loadSearchScopeInsights(
  scope: SearchScope,
  scopes: SearchScope[] = [scope],
): Promise<SearchScopeInsights> {
  const effectiveLocations = getEffectiveSearchScopeLocations(scope, scopes);
  const variants = await Promise.all([
    readSearchScopeVariant(effectiveLocations, false),
    readSearchScopeVariant(effectiveLocations, true),
  ]);
  const latest =
    variants
      .filter((variant) => variant.metadata !== null)
      .sort((left, right) => {
        const leftTime = left.metadata ? new Date(left.metadata.builtAt).getTime() : 0;
        const rightTime = right.metadata ? new Date(right.metadata.builtAt).getTime() : 0;
        return rightTime - leftTime;
      })[0] ?? null;

  return {
    latest,
    variants,
  };
}

export function formatScopeInsightSummary(insights: SearchScopeInsights) {
  if (!insights.latest?.metadata) {
    return "Not indexed";
  }

  const latest = insights.latest.metadata;
  const suffix = insights.latest.followSymlinks ? " with links" : "";
  return `${formatEntryCount(latest.entryCount)} items${suffix}`;
}

export function getScopeLocationColorOptions() {
  return scopeLocationColorPalette.map((color) => ({
    color: getScopeLocationColorValue(color),
    title: scopeLocationColorTitles[color],
    value: color,
  }));
}

export function getScopeLocationColorValue(color: SearchScopeLocationColor) {
  return scopeLocationColorMap[color];
}

export function getScopeLocationColor(location: Pick<SearchScopeLocation, "path" | "colorOverride">) {
  return location.colorOverride ?? getDefaultScopeLocationColor(location.path);
}

async function loadSavedSearchScopes(): Promise<SavedSearchScope[]> {
  const v2Value = await LocalStorage.getItem<string>(savedSearchScopesKeyV2);
  if (v2Value) {
    try {
      const parsed = JSON.parse(v2Value) as unknown;
      if (Array.isArray(parsed)) {
        const scopes = parsed.filter(isSavedSearchScope).map((scope) => ({
          ...scope,
          locations: normalizeScopeLocations(scope.locations),
        }));
        return scopes;
      }
    } catch {
      // Fall through to v1 migration
    }
  }

  const v1Value = await LocalStorage.getItem<string>(savedSearchScopesKeyV1);
  if (!v1Value) {
    return [];
  }

  try {
    const parsed = JSON.parse(v1Value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const migrated = parsed
      .filter(isLegacySavedSearchScope)
      .map(migrateLegacySavedSearchScope)
      .map((scope) => ({
        ...scope,
        locations: normalizeScopeLocations(scope.locations),
      }));

    await LocalStorage.setItem(savedSearchScopesKeyV2, JSON.stringify(migrated));
    await LocalStorage.removeItem(savedSearchScopesKeyV1);

    return migrated;
  } catch {
    return [];
  }
}

async function loadDefaultSearchScopeId() {
  const storedValue = await LocalStorage.getItem<string>(defaultSearchScopeKey);
  return typeof storedValue === "string" ? storedValue : undefined;
}

function migrateLegacySavedSearchScope(scope: LegacySavedSearchScope): SavedSearchScope {
  return {
    id: scope.id,
    name: scope.name,
    locations: scope.roots.map((root) => createSearchScopeLocation(root.path, normalizeLegacyLocationOverrides(root))),
    isBuiltin: false,
    createdAt: scope.createdAt,
    updatedAt: scope.updatedAt,
  };
}

type LegacySearchScopeRoot = {
  path: string;
  label: string;
  color: SearchScopeLocationColor;
};

type LegacySavedSearchScope = {
  id: string;
  name: string;
  roots: LegacySearchScopeRoot[];
  isBuiltin: false;
  createdAt: string;
  updatedAt: string;
};

function isLegacySavedSearchScope(value: unknown): value is LegacySavedSearchScope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const scope = value as Partial<LegacySavedSearchScope>;
  return (
    typeof scope.id === "string" &&
    typeof scope.name === "string" &&
    Array.isArray(scope.roots) &&
    scope.roots.every((root) => isLegacyScopeRootInput(root)) &&
    scope.isBuiltin === false &&
    typeof scope.createdAt === "string" &&
    typeof scope.updatedAt === "string"
  );
}

function isLegacyScopeRootInput(value: unknown): value is LegacySearchScopeRoot {
  if (typeof value === "string") {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const root = value as Partial<LegacySearchScopeRoot>;
  return typeof root.path === "string";
}

function isSavedSearchScope(value: unknown): value is SavedSearchScope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const scope = value as Partial<SavedSearchScope>;
  return (
    typeof scope.id === "string" &&
    typeof scope.name === "string" &&
    Array.isArray(scope.locations) &&
    scope.locations.every((location) => isScopeLocationInput(location)) &&
    scope.isBuiltin === false &&
    typeof scope.createdAt === "string" &&
    typeof scope.updatedAt === "string"
  );
}

function isScopeLocationInput(value: unknown): value is string | SearchScopeLocation {
  if (typeof value === "string") {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const location = value as Partial<SearchScopeLocation>;
  return typeof location.path === "string";
}

function normalizeScopeLocation(location: string | Partial<SearchScopeLocation> | SearchScopeLocation) {
  if (typeof location === "string") {
    return createSearchScopeLocation(location);
  }

  if (!location || typeof location.path !== "string") {
    return null;
  }

  return createSearchScopeLocation(location.path, {
    badgeLabelOverride: getBadgeLabelOverride(location),
    basePathAliasOverride:
      typeof location.basePathAliasOverride === "string" ? location.basePathAliasOverride : undefined,
    colorOverride: getLocationColorOverride(location),
  });
}

function mergeScopeLocations(
  existingLocations: SearchScopeLocation[],
  nextLocations: Array<string | SearchScopeLocation>,
) {
  const existingLocationsByPath = new Map(
    existingLocations.map((location) => [normalizeLocationPath(location.path), location]),
  );

  return normalizeScopeLocations(
    nextLocations.map((location) => {
      if (typeof location === "string") {
        const normalizedPath = normalizeLocationPath(location);
        return existingLocationsByPath.get(normalizedPath) ?? location;
      }

      const normalizedPath = normalizeLocationPath(location.path);
      return {
        ...(existingLocationsByPath.get(normalizedPath) ?? {}),
        ...location,
        path: normalizedPath,
      } satisfies SearchScopeLocation;
    }),
  );
}

function createSearchScopeLocation(
  locationPath: string,
  overrides?: Pick<SearchScopeLocation, "badgeLabelOverride" | "basePathAliasOverride" | "colorOverride">,
): SearchScopeLocation {
  const normalizedPath = normalizeLocationPath(locationPath);
  return {
    id: deriveLocationId(normalizedPath),
    path: normalizedPath,
    badgeLabelOverride: normalizeOptionalString(overrides?.badgeLabelOverride),
    basePathAliasOverride: normalizeOptionalString(overrides?.basePathAliasOverride),
    colorOverride:
      overrides?.colorOverride && isSearchScopeLocationColor(overrides.colorOverride)
        ? overrides.colorOverride
        : undefined,
  } satisfies SearchScopeLocation;
}

function deriveLocationId(normalizedPath: string): string {
  return createHash("sha1").update(normalizedPath).digest("hex").slice(0, 12);
}

function normalizeLocationPath(locationPath: string) {
  const trimmedPath = locationPath.trim();
  if (trimmedPath === "~") {
    return os.homedir();
  }

  if (trimmedPath.startsWith("~/")) {
    return path.join(os.homedir(), trimmedPath.slice(2));
  }

  return path.normalize(trimmedPath);
}

function getDefaultScopeLocationColor(locationPath: string): SearchScopeLocationColor {
  let hash = 0;
  for (const character of locationPath) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return scopeLocationColorPalette[hash % scopeLocationColorPalette.length];
}

function formatScopeLocationPreview(location: SearchScopeLocation) {
  const displayPath = formatScopeLocationPath(location);
  const badgeLabel = getLocationBadgeLabel(location);
  return badgeLabel === getDefaultLocationBadgeLabel(location.path) ? displayPath : `${badgeLabel} - ${displayPath}`;
}

function withTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function getBadgeLabelOverride(location: Partial<SearchScopeLocation>) {
  const explicitOverride = normalizeOptionalString(location.badgeLabelOverride);
  if (explicitOverride) {
    return explicitOverride;
  }

  const legacyLabel = normalizeOptionalString(location.label);
  if (!legacyLabel) {
    return undefined;
  }

  return legacyLabel === getLegacyDefaultLocationBadgeLabel(location.path ?? "") ? undefined : legacyLabel;
}

function getLocationColorOverride(location: Partial<SearchScopeLocation>) {
  if (isSearchScopeLocationColor(location.colorOverride)) {
    return location.colorOverride;
  }

  if (!isSearchScopeLocationColor(location.color) || typeof location.path !== "string") {
    return undefined;
  }

  return location.color === getDefaultScopeLocationColor(location.path) ? undefined : location.color;
}

function normalizeOptionalString(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

function normalizeLegacyLocationOverrides(location: {
  path: string;
  label?: string;
  color?: SearchScopeLocationColor;
}) {
  return {
    badgeLabelOverride: getBadgeLabelOverride(location),
    colorOverride: getLocationColorOverride(location),
  };
}

function isSearchScopeLocationColor(value: unknown): value is SearchScopeLocationColor {
  return typeof value === "string" && scopeLocationColorPalette.includes(value as SearchScopeLocationColor);
}

async function readSearchScopeVariant(
  locations: SearchScopeLocation[],
  followSymlinks: boolean,
): Promise<SearchScopeIndexVariant> {
  const locationPaths = getScopeLocationPaths({ locations });
  const allLocations = locationPaths.map((path) => buildLocationIndexPaths(path, followSymlinks));
  const manifests = await Promise.all(
    allLocations.map((locationIndexPaths) => getLocationManifest(locationIndexPaths.metadataPath)),
  );

  if (manifests.some((manifest) => manifest === null)) {
    return { followSymlinks, metadata: null };
  }

  const validManifests = manifests.filter((manifest): manifest is NonNullable<typeof manifest> => manifest !== null);

  if (validManifests.length === 0) {
    return { followSymlinks, metadata: null };
  }

  const oldestBuiltAt = validManifests.reduce((oldest, manifest) => {
    return manifest.builtAt < oldest ? manifest.builtAt : oldest;
  }, validManifests[0].builtAt);

  const combinedMetadata: IndexMetadata = {
    version: validManifests[0].version,
    hash: createHash("sha1")
      .update(
        validManifests
          .map((manifest) => `${manifest.locationPath}:${manifest.hash}`)
          .sort()
          .join("|"),
      )
      .digest("hex"),
    entryCount: validManifests.reduce((count, manifest) => count + manifest.entryCount, 0),
    builtAt: oldestBuiltAt,
    searchRoots: validManifests.map((manifest) => manifest.locationPath),
    followSymlinks,
  };

  return {
    followSymlinks,
    metadata: combinedMetadata,
  };
}
