import { describe, expect, it } from "vitest";
import {
  createBlockInParentUrl,
  createBlockUrl,
  createDocumentUrl,
  createFolderUrl,
  createQueryUrl,
} from "./craftUrls";

describe("craftUrls", () => {
  it("builds encoded Craft deep links", () => {
    expect(createBlockUrl("block 1", "space 1")).toBe("craftdocs://open?blockId=block%201&spaceId=space%201");
    expect(createQueryUrl("2026.06.11", "space 1")).toBe("craftdocs://openByQuery?query=2026.06.11&spaceId=space%201");
    expect(createFolderUrl("space 1", "all_tags", "Tags & More")).toBe(
      "craftdocs://openfolder?folderId=all_tags&spaceId=space%201&title=Tags%20%26%20More",
    );
    expect(createDocumentUrl("space 1", "A title", "hello world")).toBe(
      "craftdocs://createdocument?spaceId=space%201&title=A%20title&content=hello%20world&folderId=",
    );
    expect(createBlockInParentUrl("parent 1", "space 1", "hello world", 0)).toBe(
      "craftdocs://createblock?parentBlockId=parent%201&spaceId=space%201&content=hello%20world&index=0",
    );
  });

  it("keeps normal Craft GUID-style ids unchanged after encoding", () => {
    expect(createBlockUrl("ABC123", "1ab23c45-67de-89f0-1g23-hijk456789l0")).toBe(
      "craftdocs://open?blockId=ABC123&spaceId=1ab23c45-67de-89f0-1g23-hijk456789l0",
    );
  });

  it("rejects missing required values", () => {
    expect(() => createQueryUrl("", "space")).toThrow("query is required");
    expect(() => createDocumentUrl("", "title", "")).toThrow("spaceID is required");
  });
});
