export type Prefs = {
  includeDirectories: boolean;
  includeHidden: boolean;
  ignoreSpacesInSearch: boolean;
  followSymlinks: boolean;
  matchFullPath: boolean;
  showResultTypeBreakdown: boolean;
};

export type SearchScopeId = string;

export type SearchScopeLocationColor = "blue" | "green" | "magenta" | "orange" | "purple" | "red" | "yellow";

export type SearchScopeLocation = {
  id: string;
  path: string;
  badgeLabelOverride?: string;
  basePathAliasOverride?: string;
  colorOverride?: SearchScopeLocationColor;
  label?: string;
  color?: SearchScopeLocationColor;
};

export type SearchScope = {
  id: SearchScopeId;
  name: string;
  locations: SearchScopeLocation[];
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
  sourceLocationId?: string;
  sourceAvailable?: boolean;
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
  indexPaths?: string[];
  indexPath?: string;
  revision?: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error?: string;
};
