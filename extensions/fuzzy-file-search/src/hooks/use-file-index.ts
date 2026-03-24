import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { spawn } from "child_process";
import { createHash, randomUUID } from "crypto";
import fs from "fs";
import afs from "fs/promises";
import os from "os";
import path from "path";
import { basename } from "path";
import { useEffect, useMemo, useState } from "react";
import Stream from "stream";
import { pipeline } from "stream/promises";
import {
  buildIndexPaths,
  cleanupStaleTempFiles,
  encodeIndexRecord,
  ensureIndexDirectory,
  isHiddenPath,
  normalizeIndexedPath,
  readIndexMetadata,
  type IndexPaths,
  writeIndexMetadata,
  indexVersion,
} from "../lib/cache";
import type { IndexMetadata, IndexState } from "../lib/types";

type UseFileIndexOptions = {
  fdPath?: string;
  searchRoot: string;
  followSymlinks: boolean;
};

export function useFileIndex({ fdPath, searchRoot, followSymlinks }: UseFileIndexOptions): IndexState {
  const [state, setState] = useState<IndexState>({ isLoading: true, isRefreshing: false });
  const indexPaths = useMemo(() => buildIndexPaths({ searchRoot, followSymlinks }), [followSymlinks, searchRoot]);

  useEffect(() => {
    cleanupStaleTempFiles().catch((error) => {
      console.error("Failed to clean stale temp files", error);
    });
  }, []);

  useEffect(() => {
    let canceled = false;
    const abortController = new AbortController();
    let refreshToast: Toast | undefined;

    const run = async () => {
      const existingIndex = await getExistingIndexState(indexPaths);
      if (canceled) {
        return;
      }

      setState({
        indexPath: existingIndex.exists ? indexPaths.dataPath : undefined,
        revision: existingIndex.revision,
        isLoading: !existingIndex.exists,
        isRefreshing: false,
      });

      if (!fdPath) {
        return;
      }

      setState((current) => ({
        ...current,
        isLoading: !current.indexPath,
        isRefreshing: true,
      }));

      refreshToast = await showToast({
        style: Toast.Style.Animated,
        title: existingIndex.exists ? "Updating Index" : "Indexing",
        message: existingIndex.exists ? "Refreshing search results in background" : "Creating search index",
      });

      try {
        const result = await rebuildIndex({
          fdPath,
          searchRoot,
          followSymlinks,
          indexPaths,
          existingHash: existingIndex.metadata?.hash,
          signal: abortController.signal,
        });

        if (canceled || abortController.signal.aborted) {
          return;
        }

        refreshToast?.hide();
        setState({
          indexPath: indexPaths.dataPath,
          revision: result.hash,
          isLoading: false,
          isRefreshing: false,
        });
      } catch (error) {
        refreshToast?.hide();

        if (canceled || abortController.signal.aborted) {
          return;
        }

        setState((current) => ({
          ...current,
          isLoading: false,
          isRefreshing: false,
        }));

        await showFailureToast(error, {
          title: existingIndex.exists ? "Could not refresh search index" : "Could not create search index",
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
  }, [fdPath, followSymlinks, indexPaths, searchRoot]);

  return state;
}

type ExistingIndexState = {
  exists: boolean;
  metadata: IndexMetadata | null;
  revision?: string;
};

async function getExistingIndexState(indexPaths: IndexPaths): Promise<ExistingIndexState> {
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

type RebuildIndexOptions = {
  fdPath: string;
  searchRoot: string;
  followSymlinks: boolean;
  indexPaths: IndexPaths;
  existingHash?: string;
  signal: AbortSignal;
};

async function rebuildIndex({
  fdPath,
  searchRoot,
  followSymlinks,
  indexPaths,
  existingHash,
  signal,
}: RebuildIndexOptions) {
  await ensureIndexDirectory();
  await ensureDefaultIgnoreFile();

  const searchDirs = searchRoot.split(/\s+/).filter(Boolean);
  const fdArgs = ["--hidden"];

  if (followSymlinks) {
    fdArgs.push("--follow");
  }

  fdArgs.push("--print0", ".", ...searchDirs);

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
    signal,
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

      if (signal.aborted) {
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
    searchRoot,
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
  const isDirectory = detectDirectory(rawRecord);

  return encodeIndexRecord({
    path: normalizedPath,
    name,
    isDirectory,
    isHidden: isHiddenPath(normalizedPath),
  });
}

function detectDirectory(rawRecord: string) {
  return rawRecord.endsWith(path.sep);
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
    path.join(os.homedir(), "Library/*"),
    path.join(os.homedir(), "!/Library/CloudStorage/"),
    path.join(os.homedir(), "**", "*.photoslibrary/"),
  ];

  await afs.writeFile(ignoreFile, ignorePaths.join("\n"));
}
