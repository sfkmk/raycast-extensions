import { Color, LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";
import fs from "fs";
import afs from "fs/promises";
import os from "os";
import path from "path";
import { buildIndexPaths, readIndexMetadata } from "./cache";
import type {
  SavedSearchScope,
  SearchScope,
  SearchScopeId,
  SearchScopeIndexVariant,
  SearchScopeInsights,
  SearchScopeRoot,
  SearchScopeRootColor,
} from "./types";

const savedSearchScopesKey = "saved-search-scopes-v1";
const defaultSearchScopeKey = "default-search-scope-v1";

const scopeRootColorPalette: SearchScopeRootColor[] = ["blue", "green", "orange", "magenta", "purple", "yellow", "red"];

const scopeRootColorMap: Record<SearchScopeRootColor, Color.ColorLike> = {
  blue: Color.Blue,
  green: Color.Green,
  magenta: Color.Magenta,
  orange: Color.Orange,
  purple: Color.Purple,
  red: Color.Red,
  yellow: Color.Yellow,
};

const scopeRootColorTitles: Record<SearchScopeRootColor, string> = {
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
      roots: [createSearchScopeRoot(os.homedir(), { color: "blue", label: "Home" })],
      isBuiltin: true,
    },
    {
      id: everythingSearchScopeId,
      name: "Everything",
      roots: [createSearchScopeRoot("/", { color: "orange", label: "/" })],
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
  await LocalStorage.setItem(savedSearchScopesKey, JSON.stringify(scopes));
}

export async function saveDefaultSearchScopeId(scopeId: SearchScopeId) {
  await LocalStorage.setItem(defaultSearchScopeKey, scopeId);
}

export async function createSavedSearchScope({
  name,
  roots,
}: {
  name: string;
  roots: Array<string | SearchScopeRoot>;
}) {
  const now = new Date().toISOString();

  return {
    id: `custom:${randomUUID()}`,
    name: name.trim(),
    roots: normalizeScopeRoots(roots),
    isBuiltin: false as const,
    createdAt: now,
    updatedAt: now,
  } satisfies SavedSearchScope;
}

export async function updateSavedSearchScope(
  scope: SavedSearchScope,
  updates: { name: string; roots: Array<string | SearchScopeRoot> },
) {
  return {
    ...scope,
    name: updates.name.trim(),
    roots: mergeScopeRoots(scope.roots, updates.roots),
    updatedAt: new Date().toISOString(),
  } satisfies SavedSearchScope;
}

export function normalizeScopeRoots(roots: Array<string | Partial<SearchScopeRoot> | SearchScopeRoot>) {
  const normalizedRoots = new Map<string, SearchScopeRoot>();

  for (const root of roots) {
    const normalizedRoot = normalizeScopeRoot(root);
    if (!normalizedRoot) {
      continue;
    }

    normalizedRoots.set(normalizedRoot.path, normalizedRoot);
  }

  return Array.from(normalizedRoots.values());
}

export async function validateScopeRoots(roots: string[]) {
  const issues: string[] = [];

  for (const root of roots) {
    try {
      const stats = await afs.stat(root);
      if (!stats.isDirectory()) {
        issues.push(`${formatPathForDisplay(root)} is not a directory`);
      }
    } catch {
      issues.push(`${formatPathForDisplay(root)} does not exist`);
    }
  }

  return issues;
}

export function getScopeRootPaths(scope: Pick<SearchScope, "roots">) {
  return scope.roots.map((root) => root.path);
}

export function formatPathForDisplay(filePath: string) {
  return filePath.startsWith(os.homedir()) ? filePath.replace(os.homedir(), "~") : filePath;
}

export function getBestMatchingRoot(filePath: string, roots: SearchScopeRoot[]) {
  const normalizedPath = path.normalize(filePath);

  return [...roots]
    .sort((left, right) => right.path.length - left.path.length)
    .find((root) => {
      const normalizedRoot = path.normalize(root.path);
      return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}${path.sep}`);
    });
}

export function formatRelativeParentPath(filePath: string, isDirectory: boolean, roots: SearchScopeRoot[]) {
  const matchingRoot = getBestMatchingRoot(filePath, roots);
  if (!matchingRoot) {
    return withTrailingSlash(formatPathForDisplay(path.dirname(filePath)));
  }

  const isHomeRoot = matchingRoot.path === os.homedir();
  const rootLabel = isHomeRoot ? "~" : "./";

  const relativePath = path.relative(matchingRoot.path, filePath);
  if (!relativePath || relativePath === ".") {
    return rootLabel;
  }

  const parentPath = isDirectory ? path.dirname(relativePath) : path.dirname(relativePath);
  if (!parentPath || parentPath === ".") {
    return rootLabel;
  }

  return withTrailingSlash(isHomeRoot ? `~/${parentPath}` : `./${parentPath}`);
}

export function formatScopeRootPath(root: SearchScopeRoot) {
  const formatted = formatPathForDisplay(root.path);
  if (formatted === "/" || formatted === "~") {
    return formatted;
  }
  return `${formatted}/`;
}

export function formatScopeRootsPreview(scope: Pick<SearchScope, "roots">) {
  if (scope.roots.length === 0) {
    return "No folders selected";
  }

  if (scope.roots.length === 1) {
    return formatScopeRootPreview(scope.roots[0]);
  }

  return `${scope.roots[0].label} +${scope.roots.length - 1} more`;
}

export function formatScopeRootsMarkdown(scope: Pick<SearchScope, "roots">) {
  return scope.roots.map((root) => `- ${root.label}: \`${formatScopeRootPath(root)}\``).join("\n");
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

export async function loadSearchScopeInsights(scope: SearchScope): Promise<SearchScopeInsights> {
  const variants = await Promise.all([readSearchScopeVariant(scope, false), readSearchScopeVariant(scope, true)]);
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
    return "Not indexed yet";
  }

  const latest = insights.latest.metadata;
  const suffix = insights.latest.followSymlinks ? " with links" : "";
  return `${formatEntryCount(latest.entryCount)} items${suffix}`;
}

export function getScopeRootColorOptions() {
  return scopeRootColorPalette.map((color) => ({
    color: getScopeRootColorValue(color),
    title: scopeRootColorTitles[color],
    value: color,
  }));
}

export function getScopeRootColorValue(color: SearchScopeRootColor) {
  return scopeRootColorMap[color];
}

async function loadSavedSearchScopes() {
  const storedValue = await LocalStorage.getItem<string>(savedSearchScopesKey);
  if (!storedValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSavedSearchScope).map((scope) => ({
      ...scope,
      roots: normalizeScopeRoots(scope.roots),
    }));
  } catch {
    return [];
  }
}

async function loadDefaultSearchScopeId() {
  const storedValue = await LocalStorage.getItem<string>(defaultSearchScopeKey);
  return typeof storedValue === "string" ? storedValue : undefined;
}

function isSavedSearchScope(value: unknown): value is SavedSearchScope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const scope = value as Partial<SavedSearchScope>;
  return (
    typeof scope.id === "string" &&
    typeof scope.name === "string" &&
    Array.isArray(scope.roots) &&
    scope.roots.every((root) => isScopeRootInput(root)) &&
    scope.isBuiltin === false &&
    typeof scope.createdAt === "string" &&
    typeof scope.updatedAt === "string"
  );
}

function isScopeRootInput(value: unknown): value is string | SearchScopeRoot {
  if (typeof value === "string") {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const root = value as Partial<SearchScopeRoot>;
  return typeof root.path === "string";
}

function normalizeScopeRoot(root: string | Partial<SearchScopeRoot> | SearchScopeRoot) {
  if (typeof root === "string") {
    return createSearchScopeRoot(root);
  }

  if (!root || typeof root.path !== "string") {
    return null;
  }

  return createSearchScopeRoot(root.path, {
    color: isSearchScopeRootColor(root.color) ? root.color : undefined,
    label: typeof root.label === "string" ? root.label : undefined,
  });
}

function mergeScopeRoots(existingRoots: SearchScopeRoot[], nextRoots: Array<string | SearchScopeRoot>) {
  const existingRootsByPath = new Map(existingRoots.map((root) => [normalizeRootPath(root.path), root]));

  return normalizeScopeRoots(
    nextRoots.map((root) => {
      if (typeof root === "string") {
        const normalizedPath = normalizeRootPath(root);
        return existingRootsByPath.get(normalizedPath) ?? root;
      }

      const normalizedPath = normalizeRootPath(root.path);
      return {
        ...(existingRootsByPath.get(normalizedPath) ?? {}),
        ...root,
        path: normalizedPath,
      } satisfies SearchScopeRoot;
    }),
  );
}

function createSearchScopeRoot(rootPath: string, overrides?: Partial<SearchScopeRoot>) {
  const normalizedPath = normalizeRootPath(rootPath);
  return {
    path: normalizedPath,
    label: overrides?.label?.trim() || getDefaultScopeRootLabel(normalizedPath),
    color:
      overrides?.color && isSearchScopeRootColor(overrides.color)
        ? overrides.color
        : getDefaultScopeRootColor(normalizedPath),
  } satisfies SearchScopeRoot;
}

function normalizeRootPath(rootPath: string) {
  const trimmedPath = rootPath.trim();
  if (trimmedPath === "~") {
    return os.homedir();
  }

  if (trimmedPath.startsWith("~/")) {
    return path.join(os.homedir(), trimmedPath.slice(2));
  }

  return path.normalize(trimmedPath);
}

function getDefaultScopeRootLabel(rootPath: string) {
  if (rootPath === "/") {
    return "/";
  }

  if (rootPath === os.homedir()) {
    return "Home";
  }

  if (rootPath.endsWith(path.join("Mobile Documents", "com~apple~CloudDocs"))) {
    return "iCloud";
  }

  return path.basename(rootPath) || formatPathForDisplay(rootPath);
}

function getDefaultScopeRootColor(rootPath: string): SearchScopeRootColor {
  let hash = 0;
  for (const character of rootPath) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return scopeRootColorPalette[hash % scopeRootColorPalette.length];
}

function formatScopeRootPreview(root: SearchScopeRoot) {
  const displayPath = formatScopeRootPath(root);
  return root.label === getDefaultScopeRootLabel(root.path) ? displayPath : `${root.label} - ${displayPath}`;
}

function withTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function isSearchScopeRootColor(value: unknown): value is SearchScopeRootColor {
  return typeof value === "string" && scopeRootColorPalette.includes(value as SearchScopeRootColor);
}

async function readSearchScopeVariant(scope: SearchScope, followSymlinks: boolean): Promise<SearchScopeIndexVariant> {
  const metadataPath = buildIndexPaths({ searchRoots: getScopeRootPaths(scope), followSymlinks }).metadataPath;

  if (!fs.existsSync(metadataPath)) {
    return { followSymlinks, metadata: null };
  }

  return {
    followSymlinks,
    metadata: await readIndexMetadata(metadataPath),
  };
}
