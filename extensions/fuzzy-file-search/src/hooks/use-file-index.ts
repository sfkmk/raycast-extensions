import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { buildIndexPaths } from "../lib/cache";
import { cleanupFileIndexTempFiles, getExistingFileIndexState, rebuildFileIndex } from "../lib/file-index";
import type { IndexState } from "../lib/types";

type UseFileIndexOptions = {
  fdPath?: string;
  searchRoots?: string[];
  followSymlinks: boolean;
};

export function useFileIndex({ fdPath, searchRoots, followSymlinks }: UseFileIndexOptions): IndexState {
  const [state, setState] = useState<IndexState>({ isLoading: true, isRefreshing: false, error: undefined });
  const rootsKey = useMemo(() => (searchRoots ? JSON.stringify(searchRoots) : undefined), [searchRoots]);
  const stableSearchRoots = useMemo(() => searchRoots, [rootsKey]);
  const indexPaths = useMemo(
    () => (stableSearchRoots ? buildIndexPaths({ searchRoots: stableSearchRoots, followSymlinks }) : undefined),
    [followSymlinks, rootsKey, stableSearchRoots],
  );

  useEffect(() => {
    cleanupFileIndexTempFiles().catch((error) => {
      console.error("Failed to clean stale temp files", error);
    });
  }, []);

  useEffect(() => {
    let canceled = false;
    const abortController = new AbortController();
    let refreshToast: Toast | undefined;

    const run = async () => {
      if (!stableSearchRoots || stableSearchRoots.length === 0 || !indexPaths) {
        setState({ isLoading: false, isRefreshing: false, error: undefined });
        return;
      }

      const existingIndex = await getExistingFileIndexState(indexPaths);
      if (canceled) {
        return;
      }

      setState({
        indexPath: existingIndex.exists ? indexPaths.dataPath : undefined,
        revision: existingIndex.revision,
        isLoading: !existingIndex.exists,
        isRefreshing: false,
        error: undefined,
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
        const result = await rebuildFileIndex({
          fdPath,
          searchRoots: stableSearchRoots,
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
          error: undefined,
        });
      } catch (error) {
        refreshToast?.hide();

        if (canceled || abortController.signal.aborted) {
          return;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        setState((current) => ({
          ...current,
          indexPath: existingIndex.exists ? indexPaths.dataPath : undefined,
          revision: existingIndex.revision,
          isLoading: false,
          isRefreshing: false,
          error: existingIndex.exists ? undefined : errorMessage,
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
  }, [fdPath, followSymlinks, indexPaths, rootsKey, stableSearchRoots]);

  return state;
}
