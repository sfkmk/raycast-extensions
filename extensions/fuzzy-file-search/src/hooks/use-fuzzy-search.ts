import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { useEffect, useMemo, useRef, useState } from "react";
import readline from "readline";
import Stream from "stream";
import { pipeline } from "stream/promises";
import { indexFieldSeparator, parseIndexRecord } from "../lib/cache";
import type { Prefs, SearchResult } from "../lib/types";
import type { LocationIndexInfo } from "./use-file-index";

type UseFuzzySearchOptions = {
  fzfPath?: string;
  indexPaths?: string[];
  revision?: string;
  searchText: string;
  prefs: Prefs;
  locationInfos?: LocationIndexInfo[];
};

export function useFuzzySearch({
  fzfPath,
  indexPaths,
  revision,
  searchText,
  prefs,
  locationInfos,
}: UseFuzzySearchOptions) {
  const { includeDirectories, includeHidden, ignoreSpacesInSearch, matchFullPath } = prefs;
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRunId = useRef(0);

  const locationInfosKey = useMemo(
    () => (locationInfos ? JSON.stringify(locationInfos.map((l) => l.locationId)) : undefined),
    [locationInfos],
  );

  useEffect(() => {
    if (!fzfPath || !indexPaths || indexPaths.length === 0 || !revision) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();
    const currentRunId = ++searchRunId.current;
    setIsLoading(true);

    runFuzzySearch({
      fzfPath,
      indexPaths,
      searchText,
      prefs,
      signal: abortController.signal,
      locationInfos,
    })
      .then((nextResults) => {
        if (abortController.signal.aborted || currentRunId !== searchRunId.current) {
          return;
        }

        setResults(nextResults);
        setIsLoading(false);
      })
      .catch((error) => {
        if (abortController.signal.aborted || currentRunId !== searchRunId.current) {
          return;
        }

        console.error("Fuzzy search failed", error);
        setIsLoading(false);
      });

    return () => {
      abortController.abort();
    };
  }, [
    fzfPath,
    includeDirectories,
    includeHidden,
    ignoreSpacesInSearch,
    indexPaths,
    matchFullPath,
    revision,
    searchText,
    locationInfosKey,
    locationInfos,
  ]);

  return { results, isLoading };
}

type RunFuzzySearchOptions = {
  fzfPath: string;
  indexPaths: string[];
  searchText: string;
  prefs: Prefs;
  signal: AbortSignal;
  locationInfos?: LocationIndexInfo[];
};

async function runFuzzySearch({
  fzfPath,
  indexPaths,
  searchText,
  prefs,
  signal,
  locationInfos,
}: RunFuzzySearchOptions) {
  let searchTerm = searchText;
  if (prefs.ignoreSpacesInSearch) {
    searchTerm = searchTerm.replaceAll(" ", "");
  }
  searchTerm = searchTerm.replaceAll("~", os.homedir());

  const fzf = spawn(
    fzfPath,
    ["--read0", "--filter", searchTerm, "--delimiter", indexFieldSeparator, "--nth", prefs.matchFullPath ? "2" : "1"],
    {
      stdio: ["pipe", "pipe", "pipe"],
      signal,
    },
  );

  const filteredResults: SearchResult[] = [];
  let filterBuffer = Buffer.alloc(0);
  let stoppedEarly = false;
  let stderr = "";

  const filterTransform = new Stream.Transform({
    transform(chunk: Buffer, _encoding, callback) {
      filterBuffer = Buffer.concat([filterBuffer, chunk]);
      let offset = 0;

      try {
        while (true) {
          const nullIndex = filterBuffer.indexOf(0, offset);
          if (nullIndex === -1) {
            break;
          }

          const record = filterBuffer.subarray(offset, nullIndex).toString("utf8");
          if (shouldIncludeRecord(record, prefs)) {
            this.push(`${record}\0`);
          }

          offset = nullIndex + 1;
        }

        filterBuffer = filterBuffer.subarray(offset);
        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
    flush(callback) {
      try {
        if (filterBuffer.length > 0) {
          const record = filterBuffer.toString("utf8");
          if (shouldIncludeRecord(record, prefs)) {
            this.push(`${record}\0`);
          }
        }

        callback();
      } catch (error) {
        callback(error as Error);
      }
    },
  });

  fzf.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const outputPromise = new Promise<void>((resolve, reject) => {
    const rl = readline.createInterface({ input: fzf.stdout as Stream.Readable });

    rl.on("line", (line) => {
      const parsed = parseIndexRecord(line);
      if (!parsed) {
        return;
      }

      const hydratedResult = hydrateSearchResult(parsed, locationInfos);
      if (!hydratedResult) {
        return;
      }

      if (filteredResults.length >= 1000) {
        stoppedEarly = true;
        fzf.stdin?.destroy();
        fzf.kill();
        return;
      }

      filteredResults.push(hydratedResult);
    });

    rl.on("close", resolve);
    rl.on("error", reject);
  });

  const closePromise = new Promise<void>((resolve, reject) => {
    fzf.on("error", (error) => {
      if (signal.aborted) {
        resolve();
        return;
      }

      reject(error);
    });

    fzf.on("close", (code) => {
      if (signal.aborted || stoppedEarly) {
        resolve();
        return;
      }

      if (code === 0 || (code === 1 && stderr.length === 0)) {
        resolve();
        return;
      }

      reject(new Error(`Exit code of 'fzf' = ${code}:\n${stderr}`));
    });
  });

  const streamPromise = pipeline(
    Stream.Readable.from(streamIndexFiles(indexPaths, signal, () => stoppedEarly)),
    filterTransform,
    fzf.stdin as Stream.Writable,
  ).catch((error) => {
    if (signal.aborted || stoppedEarly || isBrokenPipeError(error)) {
      return;
    }

    throw error;
  });

  try {
    await Promise.all([outputPromise, closePromise, streamPromise]);
  } finally {
    fzf.stdin?.destroy();
  }

  return dedupeResults(filteredResults);
}

function hydrateSearchResult(
  result: SearchResult,
  locationInfos: LocationIndexInfo[] | undefined,
): SearchResult | null {
  const sourceLocation = result.sourceLocationId
    ? locationInfos?.find((locationInfo) => locationInfo.locationId === result.sourceLocationId)
    : undefined;
  const isSourceAvailable = sourceLocation ? sourceLocation.isAvailable : true;

  try {
    const stats = fs.lstatSync(result.path);

    if (!stats.isSymbolicLink()) {
      return {
        ...result,
        isDirectory: stats.isDirectory(),
        isSymbolicLink: false,
        sourceAvailable: isSourceAvailable,
      };
    }

    try {
      return {
        ...result,
        isDirectory: fs.statSync(result.path).isDirectory(),
        isSymbolicLink: true,
        sourceAvailable: isSourceAvailable,
      };
    } catch {
      return {
        ...result,
        isDirectory: false,
        isSymbolicLink: true,
        sourceAvailable: isSourceAvailable,
      };
    }
  } catch {
    if (!isSourceAvailable) {
      return {
        ...result,
        sourceAvailable: false,
      };
    }
    return null;
  }
}

function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Map<string, SearchResult>();

  for (const result of results) {
    const key = path.normalize(result.path);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, result);
    }
  }

  return Array.from(seen.values());
}

async function* streamIndexFiles(indexPaths: string[], signal: AbortSignal, shouldStop: () => boolean) {
  for (const indexPath of indexPaths) {
    if (signal.aborted || shouldStop() || !fs.existsSync(indexPath)) {
      continue;
    }

    const readStream = fs.createReadStream(indexPath);

    try {
      for await (const chunk of readStream) {
        if (signal.aborted || shouldStop()) {
          readStream.destroy();
          return;
        }

        yield chunk;
      }
    } finally {
      readStream.destroy();
    }
  }
}

function shouldIncludeRecord(record: string, prefs: Prefs) {
  const parsed = parseIndexRecord(record);
  if (!parsed) {
    return false;
  }

  if (!prefs.includeDirectories && parsed.isDirectory) {
    return false;
  }

  if (!prefs.includeHidden && parsed.isHidden) {
    return false;
  }

  return true;
}

function isBrokenPipeError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "EPIPE";
}
