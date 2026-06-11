# Epic: Reimplement advanced craftdocs feature/UI intent changes

## Metadata
- Objective: Recreate and consolidate all intentional experimental improvements from
  - `/Users/sko/Code/Craft Docs Raycast Extension Project/craftdocs` (`craftdocs/cw3325`, `craftdocs/cw3325-refactor`, `craftdocs/update2`)
- Work branch: `ext/craftdocs-intent-refactor-execution-v2`
- Start date: 2026-06-09
- Source-of-truth status: living

## Scope
- search relevance/performance and query expansion
- result rendering and item consistency
- navigation/open/create URL policy
- daily notes workflow reliability
- primary-space and target resolution policy
- result actions and fast workflows
- date parsing and daily note intent
- diagnostics and error hardening
- utility refactor and shared helper extraction
- UX feedback/interaction consistency

## Progress map

- Session objective: keep intent implementations current for session compaction safety and continue implementation until every intentional diff from experimental branches is implemented + validated.
- Last tracker update: 2026-06-11
- Last milestone: implementation validated with tests, build, lint, URL scan, and experimental parity audit.

## Validation evidence
- 2026-06-11: `npx npm@10 run test` passed: 11 test files, 43 tests.
- 2026-06-11: `npx npm@10 run build` passed: Raycast compiled `search`, `dailyNotes`, `addToDailyNote`, `manageSpaces`, and `open-daily-note`; TypeScript checked.
- 2026-06-11: `npx npm@10 run lint` passed: package metadata, icons, ESLint, Prettier.
- 2026-06-11: URL scan shows runtime deep links are centralized in `src/utils/craftUrls.ts`; remaining literals are tests/tutorial examples.
- 2026-06-11: second experimental path `/Users/sko/Code/Craft Docs Raycast Extension Project/craft-extension-migration/craftdocs` contains only `main`, `migration-antigravity`, `migration-cursor`, `migration-roo`; those branches have no `extensions/craftdocs/src` or `package.json` diffs against their `main`.

### INTENT-001 Search relevance + performance and live-query behavior
- Status: Validated
- Files
  - `src/hooks/useSearch.ts`
  - `src/hooks/useDocumentSearch.ts`
  - `src/hooks/useExpandedSearch.ts`
  - `src/lib/search.ts`
  - `src/utils/searchHelpers.ts`
  - `src/utils/dateParsing.ts`
  - `src/search.tsx`
- State log
  - 2026-06-09: baseline mapping to experimental branches done.
  - in_progress: wire `useDeferredValue` + parsed-date path + task expansion + deterministic merge.
  - 2026-06-11: added `useExpandedSearch`, fixed-count expansion hooks, disabled empty expansion queries, deterministic combine/dedupe, task consolidation, date fallback queries.
- Planned completion evidence
  - [x] Query string normalization is centralized and stable.
  - [x] `useDeferredValue` used around search text before expensive DB work.
  - [x] Task-like queries expand to matching search paths without duplicate queries.
  - [x] Result merging and de-duplication is deterministic.
  - [x] Daily-note/date-like queries are prioritized in a documented order.

### INTENT-002 Result list rendering and item presentation consistency
- Status: Validated
- Files
  - `src/components/ListBlocks.tsx`
  - `src/components/ListDocBlocks.tsx`
  - `src/components/ResultActions.tsx`
  - `src/components/CreateDocumentItem.tsx`
  - `src/utils/resultFormatters.ts`
  - `src/search.tsx`
- State log
  - 2026-06-09: list/component scaffolding present and partially updated.
  - in_progress: unify result formatting + shared action surface.
  - 2026-06-11: added shared `resultFormatters`; block/detail list views now use formatted titles, daily-note titles, task icons, custom-entry rows, and shared actions.
- Planned completion evidence
  - [x] Single title/subtitle/icon path for block/custom/document rows.
  - [x] Empty/loading/error states are shared.
  - [x] Quick workflow actions are consistently available.

### INTENT-003 Navigation and open/create flow consistency
- Status: Validated
- Files
  - `src/utils/craftUrls.ts`
  - `src/search.tsx`
  - `src/components/DailyNoteRef.tsx`
  - `src/components/Shortcut.tsx`
  - `src/open-daily-note.ts`
  - `src/components/CreateDocumentItem.tsx`
  - `src/lib/dailyNotes.ts`
- State log
  - 2026-06-09: no `src/open-daily-note.ts` in working tree.
  - in_progress: add command and route all deep-link construction through helpers.
  - 2026-06-11: added current-architecture `open-daily-note.ts`, command registration, and URL-helper use in create/open/query/folder flows.
- Planned completion evidence
  - [x] All deep links come from `craftUrls` constructors.
  - [x] Navigation fallback order is explicit and deterministic.
  - [x] no ad-hoc URL assembly in UI rows.

### INTENT-004 Daily notes workflow reliability
- Status: Validated
- Files
  - `src/dailyNotes.tsx`
  - `src/components/DailyNotes.tsx`
  - `src/components/Shortcut.tsx`
  - `src/lib/dailyNotes.ts`
  - `src/addToDailyNote.tsx`
  - `src/hooks/useCraftCommandContext.ts`
- State log
  - 2026-06-09: parsing and fallback paths exist but are not fully bounded.
  - in_progress: stabilize parse behavior and fallback paths.
  - 2026-06-11: daily-note URL helper now uses `craftUrls`; direct command resolves primary Space through current config loader.
- Planned completion evidence
  - [x] malformed/ambiguous date input does not crash and stays actionable.
  - [x] space target is resolved with explicit policy and fallback.
  - [x] direct daily-note command opens with deterministic behavior.

### INTENT-005 Primary space and target-resolution policy
- Status: Validated
- Files
  - `src/Config.ts`
  - `src/hooks/usePersistedSpaceSelection.ts`
  - `src/search.tsx`
  - `src/dailyNotes.tsx`
  - `src/lib/search.ts`
- State log
  - 2026-06-09: resolveCreateDocumentSpaceId already uses primary fallback.
  - in_progress: make policy explicit in all affected commands.
  - 2026-06-11: search/create uses selected non-all Space before primary; daily-note command requires enabled primary Space; persisted selection self-heal kept via existing hook.
- Planned completion evidence
  - [x] explicit override -> persisted -> primary -> empty fallback order documented and implemented.
  - [x] invalid persisted value self-heals on next render.
  - [x] missing primary space surfaces user feedback.

### INTENT-006 Enhanced result actions and quick workflows
- Status: Validated
- Files
  - `src/components/ResultActions.tsx`
  - `src/components/ListBlocks.tsx`
  - `src/components/ListDocBlocks.tsx`
  - `src/components/CreateDocumentItem.tsx`
  - `src/addToDailyNote.tsx`
- State log
  - 2026-06-09: shared `ResultActions` exists but only basic actions.
  - in_progress: consolidate open/copy/create actions.
  - 2026-06-11: `SearchResultActionPanel` centralizes open/copy/create-results actions for block, custom, and document rows.
- Planned completion evidence
  - [x] actions are shared across blocks/custom entries.
  - [x] open + copy URL actions always present when a target exists.
  - [x] create-from-results/document actions are consistently reachable.

### INTENT-007 Date and natural-language parsing improvements
- Status: Validated
- Files
  - `src/utils/dateParsing.ts`
  - `src/dailyNotes.tsx`
  - `src/lib/dailyNotes.ts`
  - `src/search.tsx`
- State log
  - 2026-06-09: existing parser is permissive.
  - in_progress: add stricter/focused parse intent and bounds.
  - 2026-06-11: parser now handles Craft internal dates, rejects invalid date parts, and requires date signals before chrono parsing.
- Planned completion evidence
  - [x] parse helper returns undefined for non-parseable text.
  - [x] parse is bounded to avoid accidental free-text capture.
  - [x] date query targets are generated from normalized date.

### INTENT-008 Error handling and diagnostics hardening
- Status: Validated
- Files
  - `src/hooks/useSearch.ts`
  - `src/hooks/useDocumentSearch.ts`
  - `src/hooks/useExpandedSearch.ts`
  - `src/utils/craftUrls.ts`
  - `src/utils/customEntries.ts`
  - `src/search.tsx`
  - `src/dailyNotes.tsx`
- State log
  - 2026-06-09: no new hardening layer for malformed deep links and empty states.
  - in_progress: fail-safe fallbacks in new helper paths.
  - 2026-06-11: URL constructors validate required values; disabled expansion hooks avoid accidental empty-query searches; open command surfaces toast failures.
- Planned completion evidence
  - [x] invalid URL construction cannot crash command.
  - [x] malformed query/state shows actionable fallback list states.
  - [x] DB/search failures remain recoverable.

### INTENT-009 Utility and shared-helper refactor
- Status: Validated
- Files
  - `src/utils/craftUrls.ts`
  - `src/utils/customEntries.ts`
  - `src/utils/searchHelpers.ts`
  - `src/utils/resultFormatters.ts`
  - `src/lib/search.ts`
- State log
  - 2026-06-09: utility migration started.
  - in_progress: complete helper extraction + tests.
  - 2026-06-11: added `searchHelpers`, `resultFormatters`, `craftUrls` tests, `dateParsing` tests; validation still pending.
- Planned completion evidence
  - [x] duplicated behavior is centralized.
  - [x] contracts for helper files have targeted tests.
  - [x] behavioral parity with experimental branch diff for mapped files.

### INTENT-010 UX feedback and performance consistency
- Status: Validated
- Files
  - `src/components/ListBlocks.tsx`
  - `src/components/ListDocBlocks.tsx`
  - `src/search.tsx`
  - `src/dailyNotes.tsx`
  - `src/addToDailyNote.tsx`
- State log
  - 2026-06-09: basic loading states present.
  - in_progress: harmonize loading/empty/no-space states and minimize flicker.
  - 2026-06-11: loading state now aggregates main, task-expanded, and date-expanded searches; query/space selections remain independently persisted.
- Planned completion evidence
  - [x] consistent loading and empty state patterns.
  - [x] no stale results when space/filter changes.
  - [x] query changes do not reset unrelated persisted selections.

## Implementation discipline
- Update per-intent status only after: code implemented + tests passing + intent evidence validated against source diffs.
- Every intent maps to a short changelog entry in this branch when landed.
- Rebase/merge only when all in-scope intents are green.
