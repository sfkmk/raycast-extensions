# INTENT-004: Daily notes workflow reliability

Goal: Date parsing + create/open actions are reliable and non-ambiguous.

State: Validated

Progress:
- 2026-06-11: Daily-note URL building now uses shared helper; direct command opens today in enabled primary Space with toast failures for missing/disabled state.
- 2026-06-11: Validated by daily-note helper tests and Raycast build/typecheck.

Acceptance checklist:
- [x] Query/date parsing has explicit fallback behavior.
- [x] `selectedSpaceId` resolves safely from persisted state.
- [x] Empty/invalid date and unavailable-space states do not crash.

Tracked files:
- `src/dailyNotes.tsx`
- `src/components/DailyNotes.tsx`
- `src/components/Shortcut.tsx`
- `src/lib/dailyNotes.ts`
- `src/addToDailyNote.tsx`
