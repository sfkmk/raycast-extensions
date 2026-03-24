export type Prefs = {
  includeDirectories: boolean;
  includeHidden: boolean;
  ignoreSpacesInSearch: boolean;
  followSymlinks: boolean;
  customSearchDirs: string;
  matchFullPath: boolean;
};

export type SearchScope = "home" | "everything" | "custom";

export type SearchResult = {
  path: string;
  name: string;
  isDirectory: boolean;
  isHidden: boolean;
};

export type IndexMetadata = {
  version: number;
  hash: string;
  entryCount: number;
  builtAt: string;
  searchRoot: string;
  followSymlinks: boolean;
};

export type IndexState = {
  indexPath?: string;
  revision?: string;
  isLoading: boolean;
  isRefreshing: boolean;
};
