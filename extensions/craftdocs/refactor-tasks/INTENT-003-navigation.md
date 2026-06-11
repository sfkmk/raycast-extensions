# INTENT-003: Navigation and open/create flow consistency

Goal: Uniform navigation links from one policy.

State: Validated

Progress:
- 2026-06-11: Routed block/query/folder/create links through `craftUrls`, added current-architecture `open-daily-note.ts`, and registered no-view command.
- 2026-06-11: Validated by URL literal scan; runtime deep-link construction is centralized except tutorial/test literals.

Acceptance checklist:
- [x] `ResultActions` uses shared URL constructors.
- [x] Search results/daily note entries/open-daily-note command use shared Craft URL helpers.
- [x] Navigation fallback order is documented and deterministic.

Tracked files:
- `src/utils/craftUrls.ts`
- `src/components/ListBlocks.tsx`
- `src/components/DailyNoteRef.tsx`
- `src/components/Shortcut.tsx`
- `src/open-daily-note.ts`
- `src/search.tsx`
