# INTENT-009: Utility and shared-helper refactor (navigation/search)

Goal: Reduce duplicated logic and provide reusable utility contracts.

State: Validated

Progress:
- 2026-06-11: Extracted `searchHelpers`, `resultFormatters`, `customEntries`, and `craftUrls` contracts; added focused tests for helper behavior.
- 2026-06-11: Validated by focused helper tests and URL literal audit.

Acceptance checklist:
- [x] Search helpers and formatting logic extracted from components.
- [x] URL constructors are centralized and used by all flows.
- [x] Custom entry expansion logic is standalone and testable.

Tracked files:
- `src/utils/craftUrls.ts`
- `src/utils/customEntries.ts`
- `src/utils/searchHelpers.ts`
- `src/utils/resultFormatters.ts`
- `src/lib/search.ts`
