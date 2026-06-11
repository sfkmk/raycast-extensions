import { describe, expect, it } from "vitest";
import { buildSearchQueryPlan, MAX_SEARCH_QUERY_COUNT } from "./sqliteSearchProvider";

describe("sqliteSearchProvider query planning", () => {
  it("keeps empty search as one default query", () => {
    expect(buildSearchQueryPlan({ query: "   " })).toEqual({ queries: [""], includesEmptyQuery: true });
  });

  it("bounds task and date expansion query cost", () => {
    const plan = buildSearchQueryPlan({ query: "task tomorrow", parsedDate: new Date(2026, 5, 11) });

    expect(plan.includesEmptyQuery).toBe(false);
    expect(plan.queries.length).toBeLessThanOrEqual(MAX_SEARCH_QUERY_COUNT);
    expect(plan.queries).toEqual(["task tomorrow", "Task Inbox tomorrow", "Task Logbook tomorrow", "Tasks tomorrow"]);
  });

  it("adds date fallbacks without accidental empty-query work", () => {
    const plan = buildSearchQueryPlan({ query: "tomorrow", parsedDate: new Date(2026, 5, 11) });

    expect(plan.includesEmptyQuery).toBe(false);
    expect(plan.queries).toEqual(["tomorrow", "2026.06.11", "2026-06-11"]);
    expect(plan.queries).not.toContain("");
  });

  it("can disable optional expansions for provider swapping", () => {
    expect(
      buildSearchQueryPlan({
        query: "task tomorrow",
        parsedDate: new Date(2026, 5, 11),
        includeTaskExpansion: false,
        includeDateFallback: false,
      }).queries,
    ).toEqual(["task tomorrow"]);
  });
});
