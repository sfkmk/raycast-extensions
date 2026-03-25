export type Prefs = {
  includeDirectories: boolean;
  includeHidden: boolean;
  ignoreSpacesInSearch: boolean;
  followSymlinks: boolean;
  matchFullPath: boolean;
  showResultTypeBreakdown: boolean;
};

export type SearchScopeId = string;

export type SearchScopeRootColor = "blue" | "green" | "magenta" | "orange" | "purple" | "red" | "yellow";

export type SearchScopeRoot = {
  path: string;
  label: string;
  color: SearchScopeRootColor;
};

export type SearchScope = {
  id: SearchScopeId;
  name: string;
  roots: SearchScopeRoot[];
  isBuiltin: boolean;
};

export type SavedSearchScope = SearchScope & {
  isBuiltin: false;
  createdAt: string;
  updatedAt: string;
};

export type SearchResult = {
  path: string;
  name: string;
  isDirectory: boolean;
  isHidden: boolean;
  isSymbolicLink: boolean;
};

export type IndexMetadata = {
  version: number;
  hash: string;
  entryCount: number;
  builtAt: string;
  searchRoots: string[];
  followSymlinks: boolean;
};

export type SearchScopeIndexVariant = {
  followSymlinks: boolean;
  metadata: IndexMetadata | null;
};

export type SearchScopeInsights = {
  latest: SearchScopeIndexVariant | null;
  variants: SearchScopeIndexVariant[];
};

export type SearchFilesLaunchContext = {
  scopeId?: SearchScopeId;
};

export type ManageSearchScopesLaunchContext = {
  scopeId?: SearchScopeId;
};

export type IndexState = {
  indexPath?: string;
  revision?: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error?: string;
};
