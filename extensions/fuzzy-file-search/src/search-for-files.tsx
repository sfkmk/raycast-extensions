import { ActionPanel, Action, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { basename } from "path";
import { useMemo, useState } from "react";
import { ensureFdCLI } from "./lib/fd-downloader";
import os from "os";
import path from "path";
import { ensureFzfCLI } from "./lib/fzf-downloader";
import { useFileIndex } from "./hooks/use-file-index";
import { useFuzzySearch } from "./hooks/use-fuzzy-search";
import type { Prefs, SearchScope } from "./lib/types";

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();

  const [searchText, setSearchText] = useState("");
  const [searchScope, setSearchScope] = useCachedState<SearchScope>("searchScopeKey", "home");
  const searchRoot = useMemo(() => {
    switch (searchScope) {
      case "everything":
        return "/";
      case "custom":
        return normalizeSearchRoots(prefs.customSearchDirs) || os.homedir();
      case "home":
      default:
        return os.homedir();
    }
  }, [prefs.customSearchDirs, searchScope]);

  const { data: fdPath, isLoading: isFdLoading } = useCachedPromise(async () => {
    try {
      return await ensureFdCLI();
    } catch (error) {
      throw new Error(`Couldn't load the fd CLI: ${error}`);
    }
  });

  const { data: fzfPath, isLoading: isFzfCliLoading } = useCachedPromise(async () => {
    try {
      return await ensureFzfCLI();
    } catch (error) {
      throw new Error(`Couldn't load the fzf CLI: ${error}`);
    }
  });

  const indexState = useFileIndex({
    fdPath,
    searchRoot,
    followSymlinks: prefs.followSymlinks,
  });

  const { results, isLoading: isSearchLoading } = useFuzzySearch({
    fzfPath,
    indexPath: indexState.indexPath,
    revision: indexState.revision,
    searchText,
    prefs,
  });

  const isListLoading =
    isFdLoading ||
    isFzfCliLoading ||
    (!indexState.indexPath && indexState.isLoading) ||
    (!results.length && isSearchLoading);

  return (
    <List
      isLoading={isListLoading}
      searchBarPlaceholder={"Search for your files"}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Search" value={searchScope} onChange={(value) => setSearchScope(value as SearchScope)}>
          <List.Dropdown.Item title="Home (~)" value="home" />
          <List.Dropdown.Item title="Everything (/)" value="everything" />
          <List.Dropdown.Item title="Custom Directories" value="custom" />
        </List.Dropdown>
      }
    >
      {results.map((result) => {
        const filepath = result.path;
        const filename = result.name || basename(filepath);
        const displayPath = filepath.startsWith(os.homedir()) ? filepath.replace(os.homedir(), "~") : filepath;

        return (
          <List.Item
            key={filepath}
            icon={result.isDirectory ? Icon.Folder : Icon.Document}
            title={filename}
            subtitle={displayPath}
            quickLook={{ path: filepath, name: filename }}
            actions={
              <ActionPanel>
                <Action.Open title="Open" target={filepath} />
                <Action.ShowInFinder title="Show in Finder" path={filepath} />
                <Action.OpenWith path={filepath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                <Action.CopyToClipboard
                  title="Copy Path to Clipboard"
                  content={filepath}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function normalizeSearchRoots(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((entry) => {
      if (entry === "~") {
        return os.homedir();
      }

      if (entry.startsWith("~/")) {
        return path.join(os.homedir(), entry.slice(2));
      }

      return path.normalize(entry);
    })
    .join(" ");
}
