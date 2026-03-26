import { environment } from "@raycast/api";
import { createHash, randomUUID } from "crypto";
import { once } from "events";
import fs from "fs";
import afs from "fs/promises";
import path from "path";
import sanitizeFilename from "sanitize-filename";
import type { IndexMetadata, SearchResult } from "./types";

export type LocationIndexInfo = {
  locationId: string;
  locationPath: string;
  indexPath: string;
  isAvailable: boolean;
};

export const indexVersion = 6;
export const indexFieldSeparator = "\u001f";

const indexDirectory = path.join(environment.supportPath, "indexes");
const staleTempFileAgeMs = 10 * 60 * 1000;

export type IndexPaths = {
  key: string;
  dataPath: string;
  metadataPath: string;
};

export type LocationIndexPaths = {
  locationId: string;
  directoryPath: string;
  dataPath: string;
  metadataPath: string;
};

export async function ensureIndexDirectory() {
  await afs.mkdir(indexDirectory, { recursive: true });
  return indexDirectory;
}

export function getIndexDirectory() {
  return indexDirectory;
}

export function deriveLocationId(locationPath: string): string {
  const normalized = path.normalize(locationPath);
  return createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}

export function buildLocationIndexPaths(locationPath: string, followSymlinks: boolean): LocationIndexPaths {
  const locationId = deriveLocationId(locationPath);
  const locationDir = path.join(indexDirectory, locationId);

  return {
    locationId,
    directoryPath: locationDir,
    dataPath: path.join(locationDir, followSymlinks ? "index-follow-links.txt" : "index.txt"),
    metadataPath: path.join(locationDir, followSymlinks ? "manifest-follow-links.json" : "manifest.json"),
  };
}

export function buildComposedIndexPaths(locationIds: string[], followSymlinks: boolean): IndexPaths {
  const key = createHash("sha1")
    .update(JSON.stringify({ version: indexVersion, locationIds: [...locationIds].sort(), followSymlinks }))
    .digest("hex")
    .slice(0, 16);

  const prefix = `composed-v${indexVersion}-${key}`;
  return {
    key,
    dataPath: path.join(indexDirectory, `${prefix}.txt`),
    metadataPath: path.join(indexDirectory, `${prefix}.json`),
  };
}

export function buildIndexPathsLegacy({
  searchRoots,
  followSymlinks,
}: {
  searchRoots: string[];
  followSymlinks: boolean;
}): IndexPaths {
  const key = createHash("sha1")
    .update(
      JSON.stringify({
        version: indexVersion,
        searchRoots,
        followSymlinks,
      }),
    )
    .digest("hex")
    .slice(0, 16);

  const primaryRoot = searchRoots[0] ?? "root";
  const primaryLabel =
    primaryRoot === "/" ? "root" : sanitizeFilename(path.basename(primaryRoot) || primaryRoot).slice(0, 28) || "root";
  const label = searchRoots.length > 1 ? `${primaryLabel}-${searchRoots.length}roots` : primaryLabel;
  const prefix = `fd-index-v${indexVersion}-${label}-${key}`;

  return {
    key,
    dataPath: path.join(indexDirectory, `${prefix}.txt`),
    metadataPath: path.join(indexDirectory, `${prefix}.json`),
  };
}

export async function getLocationManifest(manifestPath: string) {
  try {
    const raw = await afs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(raw) as {
      version: number;
      locationPath: string;
      followSymlinks: boolean;
      hash: string;
      entryCount: number;
      builtAt: string;
    } | null;

    if (!manifest || manifest.version !== indexVersion) {
      return null;
    }

    if (
      typeof manifest.locationPath !== "string" ||
      typeof manifest.followSymlinks !== "boolean" ||
      typeof manifest.hash !== "string" ||
      typeof manifest.entryCount !== "number" ||
      typeof manifest.builtAt !== "string"
    ) {
      return null;
    }

    return manifest;
  } catch {
    return null;
  }
}

export async function writeLocationManifest(
  manifestPath: string,
  manifest: {
    version: number;
    locationPath: string;
    followSymlinks: boolean;
    hash: string;
    entryCount: number;
    builtAt: string;
  },
) {
  const tempPath = `${manifestPath}.${Date.now()}-${randomUUID()}.temp`;
  await afs.writeFile(tempPath, JSON.stringify(manifest), "utf8");
  await afs.rename(tempPath, manifestPath);
}

export function normalizeIndexedPath(filePath: string) {
  if (filePath.length <= 1) {
    return filePath;
  }

  return filePath.replace(/\/+$/, "");
}

export function isHiddenPath(filePath: string) {
  return normalizeIndexedPath(filePath)
    .split(path.sep)
    .some((part) => part.length > 1 && part.startsWith("."));
}

export function encodeIndexRecord(entry: SearchResult & { sourceLocationId: string }) {
  return `${entry.name}${indexFieldSeparator}${entry.path}${indexFieldSeparator}${entry.isDirectory ? "d" : "f"}${indexFieldSeparator}${entry.isHidden ? "1" : "0"}${indexFieldSeparator}${entry.isSymbolicLink ? "1" : "0"}${indexFieldSeparator}${entry.sourceLocationId}\0`;
}

export function parseIndexRecord(record: string): SearchResult | null {
  const fields = record.split(indexFieldSeparator, 6);

  if (fields.length < 5) {
    return null;
  }

  const [name, filePath, type, hidden, symbolicLink] = fields;
  const sourceLocationId = fields.length >= 6 ? fields[5] : undefined;

  if (!name || !filePath || !type) {
    return null;
  }

  return {
    path: filePath,
    name,
    isDirectory: type === "d",
    isHidden: hidden === "1",
    isSymbolicLink: symbolicLink === "1",
    sourceLocationId,
  };
}

export async function readIndexMetadata(metadataPath: string) {
  try {
    const raw = await afs.readFile(metadataPath, "utf8");
    const metadata = JSON.parse(raw) as Partial<IndexMetadata>;

    if (metadata.version !== indexVersion || typeof metadata.hash !== "string") {
      return null;
    }

    if (
      typeof metadata.entryCount !== "number" ||
      typeof metadata.builtAt !== "string" ||
      !Array.isArray(metadata.searchRoots) ||
      metadata.searchRoots.some((root) => typeof root !== "string") ||
      typeof metadata.followSymlinks !== "boolean"
    ) {
      return null;
    }

    return metadata as IndexMetadata;
  } catch {
    return null;
  }
}

export async function writeIndexMetadata(metadataPath: string, metadata: IndexMetadata) {
  const tempPath = `${metadataPath}.${Date.now()}-${randomUUID()}.temp`;
  await afs.writeFile(tempPath, JSON.stringify(metadata), "utf8");
  await afs.rename(tempPath, metadataPath);
}

export async function cleanupStaleTempFiles() {
  await Promise.all([
    cleanupTempFilesInDirectory(environment.supportPath),
    cleanupTempFilesInDirectory(indexDirectory),
  ]);
}

async function cleanupTempFilesInDirectory(directory: string) {
  if (!fs.existsSync(directory)) {
    return;
  }

  const now = Date.now();
  const entries = await afs.readdir(directory);

  await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".temp"))
      .map(async (entry) => {
        const filePath = path.join(directory, entry);

        try {
          const stats = await afs.stat(filePath);
          if (now - stats.birthtimeMs > staleTempFileAgeMs) {
            await afs.rm(filePath, { force: true });
          }
        } catch {
          // File was removed by another run.
        }
      }),
  );
}

export async function listLocationIndexDirectories(): Promise<string[]> {
  if (!fs.existsSync(indexDirectory)) {
    return [];
  }

  const entries = await afs.readdir(indexDirectory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && /^[a-f0-9]{16}$/.test(entry.name)).map((entry) => entry.name);
}

export async function composeLocationIndexes(
  locationPaths: LocationIndexPaths[],
  composedPath: string,
): Promise<number> {
  let totalEntries = 0;
  const tempPath = `${composedPath}.${Date.now()}-${randomUUID()}.temp`;
  const writeStream = fs.createWriteStream(tempPath, { flags: "wx" });

  try {
    for (const locPath of locationPaths) {
      if (!fs.existsSync(locPath.dataPath)) {
        continue;
      }

      const readStream = fs.createReadStream(locPath.dataPath);

      for await (const chunk of readStream) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        for (const byte of buffer) {
          if (byte === 0) {
            totalEntries += 1;
          }
        }

        if (!writeStream.write(buffer)) {
          await once(writeStream, "drain");
        }
      }
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end((error?: Error | null) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await afs.rename(tempPath, composedPath);
    return totalEntries;
  } catch (error) {
    try {
      await afs.rm(tempPath, { force: true });
    } catch {
      // Temp file may not exist.
    }
    throw error;
  }
}
