# Fuzzy File Search Changelog

## [Matching and UX Improvements] - {PR_MERGE_DATE}

- Add a `Match Full Path` preference and make filename-only matching the default, so searches focus on file and folder names unless full-path matching is explicitly enabled.
- Fix filename-only matching for folders and make search results behave consistently in both matching modes.
- Improve result readability by showing distinct folder and file icons, moving the result name to the primary line, and keeping the full path as secondary context.
- Make `Show in Finder` the secondary action so it is available with `Cmd+Return`.
- Rework indexing to reuse the last cache immediately, refresh in the background, and update active searches automatically when new matches arrive.

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
