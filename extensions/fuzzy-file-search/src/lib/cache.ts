import { environment } from "@raycast/api";
import { createHash, randomUUID } from "crypto";
import fs from "fs";
import afs from "fs/promises";
import path from "path";
import sanitizeFilename from "sanitize-filename";
import type { IndexMetadata, SearchResult } from "./types";

export const indexVersion = 3;
export const indexFieldSeparator = "\u001f";

const indexDirectory = path.join(environment.supportPath, "indexes");
const staleTempFileAgeMs = 10 * 60 * 1000;

type IndexKeyOptions = {
  searchRoot: string;
  followSymlinks: boolean;
};

export type IndexPaths = {
  key: string;
  dataPath: string;
  metadataPath: string;
};

export async function ensureIndexDirectory() {
  await afs.mkdir(indexDirectory, { recursive: true });
  return indexDirectory;
}

export function buildIndexPaths({ searchRoot, followSymlinks }: IndexKeyOptions): IndexPaths {
  const key = createHash("sha1")
    .update(
      JSON.stringify({
        version: indexVersion,
        searchRoot,
        followSymlinks,
      }),
    )
    .digest("hex")
    .slice(0, 16);

  const label = sanitizeFilename(searchRoot).slice(0, 40) || "root";
  const prefix = `fd-index-v${indexVersion}-${label}-${key}`;

  return {
    key,
    dataPath: path.join(indexDirectory, `${prefix}.txt`),
    metadataPath: path.join(indexDirectory, `${prefix}.json`),
  };
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

export function encodeIndexRecord(entry: SearchResult) {
  return `${entry.name}${indexFieldSeparator}${entry.path}${indexFieldSeparator}${entry.isDirectory ? "d" : "f"}${indexFieldSeparator}${entry.isHidden ? "1" : "0"}\0`;
}

export function parseIndexRecord(record: string): SearchResult | null {
  const [name, filePath, type, hidden] = record.split(indexFieldSeparator, 4);

  if (!name || !filePath || !type) {
    return null;
  }

  return {
    path: filePath,
    name,
    isDirectory: type === "d",
    isHidden: hidden === "1",
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
      typeof metadata.searchRoot !== "string" ||
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
