# INTENT-005: Primary space and target-resolution policy

Goal: Single, clear policy for resolving active Space across commands.

State: Validated

Progress:
- 2026-06-11: Search/create keeps selected non-all Space before primary fallback; daily-note command uses primary Space and fails explicitly if disabled.
- 2026-06-11: Validated by existing space-selection/search tests and Raycast build/typecheck.

Acceptance checklist:
- [x] Policy documented as: explicit override -> persisted selection -> primary -> empty.
- [x] Invalid persisted values are corrected automatically.
- [x] Missing primary Space is surfaced with user feedback.

Tracked files:
- `src/search.tsx`
- `src/dailyNotes.tsx`
- `src/hooks/usePersistedSpaceSelection.ts`
- `src/lib/search.ts`
