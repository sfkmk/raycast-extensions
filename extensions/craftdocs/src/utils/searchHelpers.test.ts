import { describe, expect, it } from "vitest";
import type { Block } from "../lib/search";
import { buildDateSearchQueries, combineBlockResults, consolidateTaskBlocks, expandTaskQuery } from "./searchHelpers";

const makeBlock = (overrides: Partial<Block> = {}): Block => ({
  id: overrides.id ?? "block-1",
  spaceID: overrides.spaceID ?? "space-1",
  content: overrides.content ?? "Block content",
  type: overrides.type ?? "text",
  entityType: overrides.entityType ?? "block",
  documentID: overrides.documentID ?? "doc-1",
  documentName: overrides.documentName ?? "",
});

describe("searchHelpers", () => {
  it("expands task-like queries to Craft task documents", () => {
    expect(expandTaskQuery("todo work")).toEqual(["Task Inbox work", "Task Logbook work", "Tasks work"]);
  });

  it("does not expand unrelated text", () => {
    expect(expandTaskQuery("project notes")).toEqual([]);
  });

  it("combines block results deterministically without duplicates", () => {
    const first = makeBlock({ id: "a" });
    const duplicate = makeBlock({ id: "a" });
    const second = makeBlock({ id: "b" });

    expect(combineBlockResults([first], [duplicate, second])).toEqual([first, second]);
  });

  it("keeps Task Logbook instead of duplicate Task Inbox in the same Space", () => {
    const taskInbox = makeBlock({ id: "inbox", content: "Task Inbox", entityType: "document" });
    const taskLogbook = makeBlock({ id: "logbook", content: "Task Logbook", entityType: "document" });
    const normal = makeBlock({ id: "normal", content: "Normal", entityType: "document" });

    expect(consolidateTaskBlocks([taskInbox, taskLogbook, normal])).toEqual([taskLogbook, normal]);
  });

  it("builds Craft and ISO date fallback queries", () => {
    expect(buildDateSearchQueries(new Date(2026, 5, 11), "today")).toEqual(["2026.06.11", "2026-06-11"]);
  });
});
