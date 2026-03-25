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
  buildIndexPaths,
  cleanupStaleTempFiles,
  encodeIndexRecord,
  ensureIndexDirectory,
  indexVersion,
  isHiddenPath,
  normalizeIndexedPath,
  readIndexMetadata,
  type IndexPaths,
  writeIndexMetadata,
} from "./cache";
import type { IndexMetadata } from "./types";

export type ExistingIndexState = {
  exists: boolean;
  metadata: IndexMetadata | null;
  revision?: string;
};

type RebuildFileIndexOptions = {
  fdPath: string;
  searchRoots: string[];
  followSymlinks: boolean;
  indexPaths: IndexPaths;
  existingHash?: string;
  signal?: AbortSignal;
};

type RebuildSearchScopeIndexOptions = {
  fdPath: string;
  searchRoots: string[];
  followSymlinks: boolean;
  signal?: AbortSignal;
};

export async function cleanupFileIndexTempFiles() {
  await cleanupStaleTempFiles();
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

export async function rebuildSearchScopeIndex({
  fdPath,
  searchRoots,
  followSymlinks,
  signal,
}: RebuildSearchScopeIndexOptions) {
  const indexPaths = buildIndexPaths({ searchRoots, followSymlinks });
  const existingIndex = await getExistingFileIndexState(indexPaths);
  const result = await rebuildFileIndex({
    fdPath,
    searchRoots,
    followSymlinks,
    indexPaths,
    existingHash: existingIndex.metadata?.hash,
    signal,
  });

  return {
    ...result,
    existingIndex,
    indexPaths,
  };
}

export async function rebuildFileIndex({
  fdPath,
  searchRoots,
  followSymlinks,
  indexPaths,
  existingHash,
  signal,
}: RebuildFileIndexOptions) {
  await ensureIndexDirectory();
  await ensureDefaultIgnoreFile();

  const fdArgs = ["--hidden"];

  if (followSymlinks) {
    fdArgs.push("--follow");
  }

  fdArgs.push("--print0", ".", ...searchRoots);

  const tempOutputPath = `${indexPaths.dataPath}.${Date.now()}-${randomUUID()}.temp`;
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
          const encodedRecord = createEncodedRecord(rawRecord);
          if (encodedRecord) {
            entryCount += 1;
            hash.update(encodedRecord);
            this.push(encodedRecord);
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
          const encodedRecord = createEncodedRecord(rawRecord);
          if (encodedRecord) {
            entryCount += 1;
            hash.update(encodedRecord);
            this.push(encodedRecord);
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
  const metadata: IndexMetadata = {
    version: indexVersion,
    hash: nextHash,
    entryCount,
    builtAt: new Date().toISOString(),
    searchRoots,
    followSymlinks,
  };

  if (existingHash === nextHash && fs.existsSync(indexPaths.dataPath)) {
    await afs.rm(tempOutputPath, { force: true });
    await writeIndexMetadata(indexPaths.metadataPath, metadata);
    return { hash: nextHash, changed: false };
  }

  await afs.rename(tempOutputPath, indexPaths.dataPath);
  await writeIndexMetadata(indexPaths.metadataPath, metadata);

  return { hash: nextHash, changed: true };
}

function createEncodedRecord(rawRecord: string) {
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
