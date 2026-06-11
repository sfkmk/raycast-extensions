# INTENT-006: Enhanced result actions and quick workflows

Goal: Reduce command hops and duplicate action definitions.

State: Validated

Progress:
- 2026-06-11: `SearchResultActionPanel` centralizes open, copy URL, and create-results-document actions for standard, custom, and detail rows.
- 2026-06-11: Validated by Raycast build/typecheck and lint.

Acceptance checklist:
- [x] Shared action component used by block/doc/custom rows.
- [x] Open + copy URL + create-doc actions included where expected.
- [x] Submit paths for daily notes remain stable after action changes.

Tracked files:
- `src/components/ResultActions.tsx`
- `src/components/ListBlocks.tsx`
- `src/components/ListDocBlocks.tsx`
- `src/components/CreateDocumentItem.tsx`
- `src/addToDailyNote.tsx`
