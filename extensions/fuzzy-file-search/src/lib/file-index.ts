import { spawn } from "child_process";
import { createHash, randomUUID } from "crypto";
import fs from "fs";
import afs from "fs/promises";
import os from "os";
import path from "path";
import { basename } from "path";
import Stream from "stream";
import { pipeline } from "stream/promises";
import {
  buildLocationIndexPaths,
  cleanupStaleTempFiles,
  composeLocationIndexes,
  encodeIndexRecord,
  ensureIndexDirectory,
  getLocationManifest,
  isHiddenPath,
  normalizeIndexedPath,
  readIndexMetadata,
  type IndexPaths,
  writeIndexMetadata,
  writeLocationManifest,
  indexVersion,
} from "./cache";
import type { IndexMetadata } from "./types";

export type ExistingIndexState = {
  exists: boolean;
  metadata: IndexMetadata | null;
  revision?: string;
};

export type LocationIndexState = {
  locationPath: string;
  exists: boolean;
  hash?: string;
};

type RebuildLocationIndexOptions = {
  fdPath: string;
  locationPath: string;
  followSymlinks: boolean;
  excludePrefixes?: string[];
  signal?: AbortSignal;
};

export async function cleanupFileIndexTempFiles() {
  await cleanupStaleTempFiles();
}

export async function getExistingLocationIndexState(
  locationPath: string,
  followSymlinks: boolean,
): Promise<LocationIndexState> {
  const paths = buildLocationIndexPaths(locationPath, followSymlinks);
  const manifest = await getLocationManifest(paths.metadataPath);

  if (!manifest || !fs.existsSync(paths.dataPath)) {
    return { locationPath, exists: false };
  }

  return {
    locationPath,
    exists: true,
    hash: manifest.hash,
  };
}

export async function getExistingFileIndexState(indexPaths: IndexPaths): Promise<ExistingIndexState> {
  const exists = fs.existsSync(indexPaths.dataPath);
  const metadata = exists ? await readIndexMetadata(indexPaths.metadataPath) : null;

  if (!exists) {
    return { exists: false, metadata: null };
  }

  return {
    exists: true,
    metadata,
    revision: metadata?.hash ?? `${fs.statSync(indexPaths.dataPath).mtimeMs}`,
  };
}

export async function rebuildLocationIndexes({
  fdPath,
  locationPaths,
  followSymlinks,
  excludePrefixesForRoot,
  signal,
}: {
  fdPath: string;
  locationPaths: string[];
  followSymlinks: boolean;
  excludePrefixesForRoot?: string[];
  signal?: AbortSignal;
}) {
  await ensureIndexDirectory();

  const results: Array<{
    locationPath: string;
    paths: ReturnType<typeof buildLocationIndexPaths>;
    hash: string;
    changed: boolean;
  }> = [];

  for (const locationPath of locationPaths) {
    const excludePrefixes = locationPath === "/" ? excludePrefixesForRoot : undefined;
    const result = await rebuildLocationIndex({
      fdPath,
      locationPath,
      followSymlinks,
      excludePrefixes,
      signal,
    });
    results.push(result);
  }

  return results;
}

export async function rebuildLocationIndex({
  fdPath,
  locationPath,
  followSymlinks,
  excludePrefixes,
  signal,
}: RebuildLocationIndexOptions): Promise<{
  locationPath: string;
  paths: ReturnType<typeof buildLocationIndexPaths>;
  hash: string;
  changed: boolean;
}> {
  await ensureIndexDirectory();
  await ensureDefaultIgnoreFile();

  const paths = buildLocationIndexPaths(locationPath, followSymlinks);
  await afs.mkdir(paths.directoryPath, { recursive: true });

  const sourceLocationId = paths.locationId;

  const existingManifest = await getLocationManifest(paths.metadataPath);

  const fdArgs = ["--hidden"];

  if (followSymlinks) {
    fdArgs.push("--follow");
  }

  fdArgs.push("--print0", ".", locationPath);

  const tempOutputPath = `${paths.dataPath}.${Date.now()}-${randomUUID()}.temp`;
  const writeStream = fs.createWriteStream(tempOutputPath, { flags: "wx" });
  const hash = createHash("sha1");
  let entryCount = 0;
  let buffer = Buffer.alloc(0);

  const transform = new Stream.Transform({
    transform(chunk: Buffer, _encoding, callback) {
      buffer = Buffer.concat([buffer, chunk]);
      let offset = 0;

      try {
        while (true) {
          const nullIndex = buffer.indexOf(0, offset);
          if (nullIndex === -1) {
            break;
          }

          const rawRecord = buffer.subarray(offset, nullIndex).toString("utf8");
          if (shouldIncludeRecord(rawRecord, excludePrefixes)) {
            const encodedRecord = createEncodedRecord(rawRecord, sourceLocationId);
            if (encodedRecord) {
              entryCount += 1;
              hash.update(encodedRecord);
              this.push(encodedRecord);
            }
          }

          offset = nullIndex + 1;
        }

        buffer = buffer.subarray(offset);
        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
    flush(callback) {
      try {
        if (buffer.length > 0) {
          const rawRecord = buffer.toString("utf8");
          if (shouldIncludeRecord(rawRecord, excludePrefixes)) {
            const encodedRecord = createEncodedRecord(rawRecord, sourceLocationId);
            if (encodedRecord) {
              entryCount += 1;
              hash.update(encodedRecord);
              this.push(encodedRecord);
            }
          }
        }

        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
  });

  const fd = spawn(fdPath, fdArgs, {
    stdio: ["ignore", "pipe", "pipe"],
    ...(signal ? { signal } : {}),
  });

  let stderr = "";
  fd.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const closePromise = new Promise<void>((resolve, reject) => {
    fd.on("error", reject);
    fd.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      if (signal?.aborted) {
        reject(new Error("fd indexing aborted"));
        return;
      }

      reject(new Error(`Exit code of 'fd' = ${code}:\n${stderr}`));
    });
  });

  try {
    await Promise.all([closePromise, pipeline(fd.stdout as Stream.Readable, transform, writeStream)]);
  } catch (error) {
    await afs.rm(tempOutputPath, { force: true });
    throw error;
  }

  const nextHash = hash.digest("hex");
  const manifest = {
    version: indexVersion,
    locationPath,
    followSymlinks,
    hash: nextHash,
    entryCount,
    builtAt: new Date().toISOString(),
  };

  if (existingManifest?.hash === nextHash && fs.existsSync(paths.dataPath)) {
    await afs.rm(tempOutputPath, { force: true });
    await writeLocationManifest(paths.metadataPath, manifest);
    return { locationPath, paths, hash: nextHash, changed: false };
  }

  await afs.rename(tempOutputPath, paths.dataPath);
  await writeLocationManifest(paths.metadataPath, manifest);

  return { locationPath, paths, hash: nextHash, changed: true };
}

function shouldIncludeRecord(rawRecord: string, excludePrefixes?: string[]): boolean {
  if (!excludePrefixes || excludePrefixes.length === 0) {
    return true;
  }

  const normalizedPath = normalizeIndexedPath(rawRecord);
  if (!normalizedPath) {
    return false;
  }

  for (const prefix of excludePrefixes) {
    const normalizedPrefix = normalizeIndexedPath(prefix);
    if (normalizedPath.startsWith(normalizedPrefix + "/") || normalizedPath === normalizedPrefix) {
      return false;
    }
  }

  return true;
}

function createEncodedRecord(rawRecord: string, sourceLocationId: string) {
  const normalizedPath = normalizeIndexedPath(rawRecord);
  if (!normalizedPath) {
    return null;
  }

  const name = basename(normalizedPath) || normalizedPath;

  return encodeIndexRecord({
    path: normalizedPath,
    name,
    isDirectory: rawRecord.endsWith(path.sep),
    isHidden: isHiddenPath(normalizedPath),
    isSymbolicLink: false,
    sourceLocationId,
  });
}

async function ensureDefaultIgnoreFile() {
  const ignoreFile = path.join(os.homedir(), ".config", "fd", "ignore");
  if (fs.existsSync(ignoreFile)) {
    return;
  }

  await afs.mkdir(path.dirname(ignoreFile), { recursive: true });

  const ignorePaths = [
    "/nix/",
    "/System/",
    "/Library/",
    "/private/",
    "/usr/",
    "**/.DS_Store",
    "**/node_modules/",
    path.join(os.homedir(), "Library/*"),
    path.join(os.homedir(), "!/Library/CloudStorage/"),
    path.join(os.homedir(), "**", "*.photoslibrary/"),
  ];

  await afs.writeFile(ignoreFile, ignorePaths.join("\n"));
}

export async function composeAndBuildIndex({
  locationPaths,
  followSymlinks,
  composedIndexPaths,
}: {
  locationPaths: Array<ReturnType<typeof buildLocationIndexPaths>>;
  followSymlinks: boolean;
  composedIndexPaths: IndexPaths;
}): Promise<{ hash: string; changed: boolean }> {
  const manifests = await Promise.all(locationPaths.map((paths) => getLocationManifest(paths.metadataPath)));
  const allHashes = manifests
    .map((manifest, index) => `${locationPaths[index].locationId}:${manifest?.hash ?? "missing"}`)
    .sort()
    .join("-");
  const hash = createHash("sha1").update(allHashes).digest("hex");

  const metadata: IndexMetadata = {
    version: indexVersion,
    hash,
    entryCount: 0,
    builtAt: new Date().toISOString(),
    searchRoots: locationPaths.map((paths, index) => manifests[index]?.locationPath ?? paths.locationId),
    followSymlinks,
  };

  await ensureIndexDirectory();

  const entryCount = await composeLocationIndexes(locationPaths, composedIndexPaths.dataPath);
  metadata.entryCount = entryCount;

  await writeIndexMetadata(composedIndexPaths.metadataPath, metadata);

  return { hash, changed: true };
}

export { buildLocationIndexPaths };
