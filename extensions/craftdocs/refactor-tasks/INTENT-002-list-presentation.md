# INTENT-002: Result list rendering and item presentation consistency

Goal: Same render contract for both block and document list views.

State: Validated

Progress:
- 2026-06-11: Added `resultFormatters`; block/detail rows now share title/date/task formatting and shared action surfaces.
- 2026-06-11: Validated by Raycast build/typecheck and lint.

Acceptance checklist:
- [x] Shared title/subtitle/icon formatting lives in `resultFormatters`.
- [x] Custom entries and standard blocks render in compatible list rows.
- [x] Empty sections and quick-action rows are consistent in both list/detail views.

Tracked files:
- `src/components/ListBlocks.tsx`
- `src/components/ListDocBlocks.tsx`
- `src/components/ResultActions.tsx`
- `src/components/CreateDocumentItem.tsx`
- `src/utils/resultFormatters.ts`
