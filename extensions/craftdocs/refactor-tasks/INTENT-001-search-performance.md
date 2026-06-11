# INTENT-001: Search relevance + performance and live-query behavior

Goal: Search remains responsive on typing, relevance is deterministic, and query cost is reduced.

State: Validated

Progress:
- 2026-06-11: Added `useExpandedSearch`, fixed-count expansion hooks, disabled empty expansion DB queries, deterministic combine/dedupe helpers, task consolidation, and date fallback queries.
- 2026-06-11: Validated by `npx npm@10 run test`, `npx npm@10 run build`, and `npx npm@10 run lint`.

Acceptance checklist:
- [x] Query string normalization is centralized and stable.
- [x] `useDeferredValue` used around search text before expensive DB work.
- [x] Task-like queries can expand to additional matching search paths without duplicate queries in same frame.
- [x] Result merging and de-duplication is deterministic.
- [x] Daily-note/date-like queries are prioritized in a documented order.

Tracked files:
- `src/lib/search.ts`
- `src/hooks/useSearch.ts`
- `src/hooks/useDocumentSearch.ts`
- `src/hooks/useExpandedSearch.ts`
- `src/utils/searchHelpers.ts`
- `src/utils/dateParsing.ts`
