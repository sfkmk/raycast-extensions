# INTENT-010: UX feedback polish and performance consistency

Goal: Predictable loading/empty states and low visual/interaction noise.

State: Validated

Progress:
- 2026-06-11: Search loading aggregates main, task-expanded, and date-expanded states; rows expose consistent icons/actions/create affordances.
- 2026-06-11: Validated by Raycast build/typecheck and lint.

Acceptance checklist:
- [x] Shared loading state patterns in search and daily notes.
- [x] Empty-state and fallback actions are explicit.
- [x] Query updates do not reset unrelated UI state unexpectedly.

Tracked files:
- `src/search.tsx`
- `src/dailyNotes.tsx`
- `src/components/ListBlocks.tsx`
- `src/components/ListDocBlocks.tsx`
- `src/addToDailyNote.tsx`
