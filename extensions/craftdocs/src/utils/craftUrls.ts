/**
 * Craft URL building utilities for creating deep links to Craft app
 */

/**
 * Creates a Craft Document URL with the given parameters
 *
 * @param spaceID - The Space ID where the Document should be created
 * @param title - The Document title
 * @param content - The markdown content for the Document
 * @param folderId - Optional folder ID (defaults to empty string for root)
 * @returns Complete Craft URL for Document creation
 */
export function createDocumentUrl(spaceID: string, title: string, content: string, folderId = ""): string {
  if (!spaceID?.trim()) {
    throw new Error("createDocumentUrl: spaceID is required and cannot be empty");
  }
  if (!title?.trim()) {
    throw new Error("createDocumentUrl: title is required and cannot be empty");
  }
  if (content === null || content === undefined) {
    throw new Error("createDocumentUrl: content cannot be null or undefined");
  }

  return `craftdocs://createdocument?spaceId=${spaceID}&title=${encodeURIComponent(title)}&content=${encodeURIComponent(
    content
  )}&folderId=${folderId}`;
}

/**
 * Creates a Craft URL to open a specific Block
 *
 * @param blockId - The Block ID to open
 * @param spaceId - The Space ID containing the Block
 * @returns Complete Craft URL for opening the Block
 */
export function createBlockUrl(blockId: string, spaceId: string): string {
  if (!blockId?.trim()) {
    throw new Error("createBlockUrl: blockId is required and cannot be empty");
  }
  if (!spaceId?.trim()) {
    throw new Error("createBlockUrl: spaceId is required and cannot be empty");
  }

  return `craftdocs://open?blockId=${blockId}&spaceId=${spaceId}`;
}

/**
 * Creates a Craft URL to open by query (e.g., for Daily Notes)
 *
 * @param query - The query to search for (e.g., "today", date string)
 * @param spaceId - The Space ID to search in
 * @returns Complete Craft URL for query-based opening
 */
export function createQueryUrl(query: string, spaceId: string): string {
  if (!query?.trim()) {
    throw new Error("createQueryUrl: query is required and cannot be empty");
  }
  if (!spaceId?.trim()) {
    throw new Error("createQueryUrl: spaceId is required and cannot be empty");
  }

  return `craftdocs://openByQuery?query=${encodeURIComponent(query)}&spaceId=${spaceId}`;
}

/**
 * Creates a Craft URL to create a new Block in a specific parent
 *
 * @param parentBlockId - The parent Block ID
 * @param spaceId - The Space ID
 * @param content - The content for the new Block
 * @param index - Position index for the new Block
 * @returns Complete Craft URL for creating a Block
 */
export function createBlockInParentUrl(parentBlockId: string, spaceId: string, content: string, index: number): string {
  if (!parentBlockId?.trim()) {
    throw new Error("createBlockInParentUrl: parentBlockId is required and cannot be empty");
  }
  if (!spaceId?.trim()) {
    throw new Error("createBlockInParentUrl: spaceId is required and cannot be empty");
  }
  if (content === null || content === undefined) {
    throw new Error("createBlockInParentUrl: content cannot be null or undefined");
  }
  if (typeof index !== "number" || index < 0) {
    throw new Error("createBlockInParentUrl: index must be a non-negative number");
  }

  return `craftdocs://createblock?parentBlockId=${parentBlockId}&spaceId=${spaceId}&content=${encodeURIComponent(
    content
  )}&index=${index}`;
}
