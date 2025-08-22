# Craftdocs Changelog

## [UX improvements] - {PR_MERGE_DATE}

- ⭐ `Open Daily Note` Added new command to quickly open today's Daily Note of the "Primary" Space. Perfect for a keyboard shortcut!
- ⭐ `Blocks Search` Added new "Create Document with Search Results" option to create a new document with all search results from the current query. Find it in the Actions Menu via ⌘+K or directly with ⇧+⌘+⏎ on any result.
- `Blocks Search` Added new "Copy Deeplink to Clipboard" option to quickly copy the deeplink of an entry in the Actions Menu via ⌘+K or directly with ⌘+L on any result.
- `Blocks Search` Hide (redundant) subtitles for documents in results; show subtitles only for blocks.
- `Blocks Search` Swap the display of title and subtitle for block entries to reflect user intent; title=query occurrence, subtitle=parent-document.
- `Blocks Search` Queries for date-like patterns prioritize Daily Note results.
- `Blocks Search` Enhanced standard and natural language date parsing; date parsing now understands many LTR - languages.
- `Blocks Search` Added natural language date parsing.
- `Blocks Search` Added ability to create non-existing Daily Notes.
- `Blocks Search` Improved visibility of Tasks from the Task Inbox in results with a dedicated icon.
- `Blocks Search` Improved visibility of Daily Notes in results with a dedicated icon.
- `Blocks Search` Added several of Craft's navigational entries that can be queried: "Starred Documents", "All Tags", "All Docs", "Organize", "Unsorted", "Recently Deleted", "Shared with Me".
- `Blocks Search` Added a preference option to exclude Craft's navigational entries from search results.
- `Blocks Search` Consolidated some known duplicate database entries.
- `Blocks Search` Enhanced searchability for craft navigational entries ensures that nearly any combination of search terms will surface them in search results.
- `Blocks Search` Added support to query tasks from "Task Inbox" or "Task Logbook" using "todo" or "task"; e.g. searching "todo Nadine" returns "Buy Nadine a present".
- `Manage Spaces` Fixed tutorial command on first-time open.
- `Manage Spaces` Added the ability to change the "Primary" Space. This gives users the ability to change the behavior of other commands.
- `Add to Daily Note` Added "Temporary Formatting Options" to alter the command's behavior for one execution.
- `General` Improved descriptions for better conciseness.

## [Feature] - 2025-08-11

- Added a new `Add to Daily Note` command with intelligent daily note detection and configurable append/prepend position.
- Added timestamp toggle and customizable prefix/suffix options for flexible content formatting.
- Added Space Management functionality with new `Manage Spaces` command
- Added ability to rename Spaces with custom names instead of Space IDs
- Added space enable/disable functionality to hide unused Spaces extension-wide
- Added space filtering dropdowns in Blocks Search and Daily Notes commands
- Added persistent Space settings that sync across all commands
- Improved visual distinction between documents and blocks with better icons (Document vs Text)
- Fixed React key conflicts when multiple Spaces contain blocks with identical names
- Enhanced user experience with consistent Space naming throughout the extension
- Updated dependencies via `npm audit fix`

## [Security] - 2024-11-12

- Updated dependencies via `npm audit fix` to address 4 vulnerabilities (2 moderate, 2 high).

## [Update] - 2023-02-11

- Added support for setapp version.

## [Update] - 2022-07-12

- Added a new `Daily Notes` command.

## [Update] - 2022-07-09

- Updated icons in the list.

## [Bug fix] - 2022-05-27

- Narrow the scope for opened SQLite databases;
- Catch exceptions from SQLite if such happens.

## [Initial Version] - 2022-05-23
