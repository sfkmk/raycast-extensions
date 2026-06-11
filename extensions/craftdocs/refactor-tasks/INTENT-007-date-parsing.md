# INTENT-007: Date and natural-language parsing improvements

Goal: Reliable date intent across search and daily-note commands.

State: Validated

Progress:
- 2026-06-11: Parser supports Craft internal dates, validates calendar parts, gates chrono parsing by date signals, and feeds normalized fallback queries into search.
- 2026-06-11: Ported multilingual intent via configurable `supportedLanguages` preference using `chrono-node` locales; validated by parser tests.

Acceptance checklist:
- [x] Natural date parsing helper returns `undefined` for non-parseable input.
- [x] Parsing is bounded to avoid accidental mis-parsing of free-form text.
- [x] Daily note target query strings are generated from normalized date values.

Tracked files:
- `src/utils/dateParsing.ts`
- `src/dailyNotes.tsx`
- `src/components/Shortcut.tsx`
- `src/lib/dailyNotes.ts`
- `src/search.tsx`
- `src/utils/searchHelpers.ts`
