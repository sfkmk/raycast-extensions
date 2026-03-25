# Fuzzy File Search Changelog

## [Matching, Indexing, and Scope Improvements] - {PR_MERGE_DATE}

- Add a `Match Full Path` preference and make filename-only matching the default, so searches focus on file and folder names unless full-path matching is explicitly enabled.
- Replace the old TTL-based cache flow with a stale-while-revalidate index, so cached results appear immediately, refresh in the background, and active searches update automatically when indexing finishes.
- Fix filename-only matching for folders, make directory and hidden-file preferences apply correctly from cached indexes, and skip dead paths before they reach the UI.
- Improve result readability by showing distinct folder and file icons, moving the result name to the primary line, and showing scope-relative parent paths like `~`, `~/Folder/`, `./`, or `./Folder/` as secondary context.
- Add a `Manage Search Roots` command with named scopes, directory picking, default scopes, and index insights, replacing the old free-form custom directory preference.
- Support custom root labels and colored badges for multi-root scopes, let the search command jump directly to the active scope in the manager, and simplify saved-scope editing into a single place for renaming scopes, adding locations, and editing location badges.
- Detect symbolic links during indexing so symlinked folders are filtered correctly and rendered with link-style icons instead of looking like plain files.
- Make `Show in Finder` the secondary action so it is available with `Cmd+Return`.

## [Open With Action] - 2026-03-12

- Add `Open With` action to open files with a specific application (Cmd+O).

## [Rework] - 2025-10-05

- Use fzf CLI tool for fuzzy finding.
- Add automatic installation of the fzf CLI tool.
- Improve search performance.
- Add caching of indexed files
- Improve UI/UX with toast notifications.
- Fix issue where the heap memory limit is reached.

## [Initial version] - 2025-09-15
