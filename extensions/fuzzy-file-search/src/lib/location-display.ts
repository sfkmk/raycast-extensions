import os from "os";
import path from "path";
import type { SearchScopeLocation } from "./types";

const homeDirectoryPath = path.normalize(os.homedir());
const iCloudDrivePath = path.join(homeDirectoryPath, "Library", "Mobile Documents", "com~apple~CloudDocs");

type LocationPathDisplayMatch = {
  basePath: string;
  alias: string;
};

type LocationDisplayLocation = Pick<SearchScopeLocation, "path" | "badgeLabelOverride" | "basePathAliasOverride">;

export function formatPathForDisplay(filePath: string) {
  const normalizedPath = normalizeDisplayPath(filePath);
  if (!normalizedPath) {
    return filePath;
  }

  return formatPathWithSystemAlias(normalizedPath);
}

export function getDefaultLocationBadgeLabel(locationPath: string) {
  const normalizedPath = normalizeDisplayPath(locationPath);
  if (!normalizedPath) {
    return locationPath;
  }

  if (normalizedPath === path.sep) {
    return path.sep;
  }

  if (normalizedPath === homeDirectoryPath) {
    return "Home";
  }

  if (normalizedPath === iCloudDrivePath) {
    return "iCloud Drive";
  }

  const volumeRoot = getVolumeRootPath(normalizedPath);
  if (volumeRoot && normalizedPath === volumeRoot) {
    return path.basename(volumeRoot);
  }

  return path.basename(normalizedPath) || formatPathWithSystemAlias(normalizedPath);
}

export function getLegacyDefaultLocationBadgeLabel(locationPath: string) {
  const normalizedPath = normalizeDisplayPath(locationPath);
  if (!normalizedPath) {
    return locationPath;
  }

  if (normalizedPath === path.sep) {
    return path.sep;
  }

  if (normalizedPath === homeDirectoryPath) {
    return "Home";
  }

  if (normalizedPath === iCloudDrivePath) {
    return "iCloud";
  }

  return path.basename(normalizedPath) || formatPathWithSystemAlias(normalizedPath);
}

export function getDefaultLocationBasePathAlias(locationPath: string) {
  return formatPathForDisplay(locationPath);
}

export function getLocationBadgeLabel(location: LocationDisplayLocation) {
  return normalizeOverrideValue(location.badgeLabelOverride) ?? getDefaultLocationBadgeLabel(location.path);
}

export function getLocationBasePathAlias(location: LocationDisplayLocation) {
  return normalizeOverrideValue(location.basePathAliasOverride) ?? getDefaultLocationBasePathAlias(location.path);
}

export function formatScopeLocationPath(location: LocationDisplayLocation) {
  const basePathAlias = getLocationBasePathAlias(location);
  if (basePathAlias === path.sep || basePathAlias === "~") {
    return basePathAlias;
  }

  return withTrailingSlash(basePathAlias);
}

export function formatPathForLocation(
  filePath: string,
  location: Pick<SearchScopeLocation, "path" | "basePathAliasOverride">,
) {
  const normalizedPath = normalizeDisplayPath(filePath);
  const normalizedLocationPath = normalizeDisplayPath(location.path);
  if (!normalizedPath || !normalizedLocationPath || !isPathWithinBase(normalizedPath, normalizedLocationPath)) {
    return formatPathForDisplay(filePath);
  }

  return replacePathPrefix(normalizedPath, normalizedLocationPath, getLocationBasePathAlias(location));
}

function formatPathWithSystemAlias(normalizedPath: string) {
  const displayMatch = getSystemDisplayMatch(normalizedPath);
  if (!displayMatch) {
    return normalizedPath;
  }

  return replacePathPrefix(normalizedPath, displayMatch.basePath, displayMatch.alias);
}

function getSystemDisplayMatch(normalizedPath: string): LocationPathDisplayMatch | null {
  if (normalizedPath === path.sep) {
    return { basePath: path.sep, alias: path.sep };
  }

  if (isPathWithinBase(normalizedPath, iCloudDrivePath)) {
    return { basePath: iCloudDrivePath, alias: "iCloud Drive" };
  }

  const volumeRoot = getVolumeRootPath(normalizedPath);
  if (volumeRoot) {
    return { basePath: volumeRoot, alias: path.basename(volumeRoot) };
  }

  if (isPathWithinBase(normalizedPath, homeDirectoryPath)) {
    return { basePath: homeDirectoryPath, alias: "~" };
  }

  return null;
}

function getVolumeRootPath(normalizedPath: string) {
  const segments = normalizedPath.split(path.sep).filter(Boolean);
  if (segments[0] !== "Volumes" || segments.length < 2) {
    return null;
  }

  return path.join(path.sep, "Volumes", segments[1]);
}

function replacePathPrefix(targetPath: string, basePath: string, alias: string) {
  if (targetPath === basePath) {
    return alias;
  }

  const relativePath = path.relative(basePath, targetPath);
  if (!relativePath || relativePath === ".") {
    return alias;
  }

  if (alias === path.sep) {
    return path.join(path.sep, relativePath);
  }

  return `${alias}/${relativePath}`;
}

function isPathWithinBase(targetPath: string, basePath: string) {
  return targetPath === basePath || targetPath.startsWith(`${basePath}${path.sep}`);
}

function normalizeDisplayPath(filePath: string) {
  const trimmedPath = filePath.trim();
  if (!trimmedPath) {
    return "";
  }

  const normalizedPath = path.normalize(trimmedPath);
  return normalizedPath === "." ? trimmedPath : normalizedPath;
}

function normalizeOverrideValue(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

function withTrailingSlash(value: string) {
  return value.endsWith(path.sep) ? value : `${value}${path.sep}`;
}
