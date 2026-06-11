# INTENT-008: Error handling and diagnostics hardening

Goal: Keep errors recoverable and UI stable under malformed inputs/state.

State: Validated

Progress:
- 2026-06-11: URL constructors validate required values; expansion hooks avoid accidental empty-query DB work; open-daily-note reports recoverable failures through Raycast toasts.
- 2026-06-11: Validated by helper tests, existing DB failure tests, build, and lint.

Acceptance checklist:
- [x] URL helper constructors never allow silent malformed strings.
- [x] Search hooks handle DB failures without throwing.
- [x] Empty-space/errors show actionable messages.
- [x] Unavailable DB/space states remain actionable.

Tracked files:
- `src/utils/craftUrls.ts`
- `src/hooks/useSearch.ts`
- `src/hooks/useDocumentSearch.ts`
- `src/utils/customEntries.ts`
- `src/search.tsx`
- `src/lib/search.ts`
