/**
 * Craft URL building utilities for creating deep links to Craft app
 */

/**
 * Creates a Craft document URL with the given parameters
 *
 * @param spaceID - The space ID where the document should be created
 * @param title - The document title
 * @param content - The markdown content for the document
 * @param folderId - Optional folder ID (defaults to empty string for root)
 * @returns Complete Craft URL for document creation
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
    content,
  )}&folderId=${folderId}`;
}

/**
 * Creates a Craft URL to open a specific block
 *
 * @param blockId - The block ID to open
 * @param spaceId - The space ID containing the block
 * @returns Complete Craft URL for opening the block
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
 * Creates a Craft URL to open by query (e.g., for daily notes)
 *
 * @param query - The query to search for (e.g., "today", date string)
 * @param spaceId - The space ID to search in
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
 * Creates a Craft URL to create a new block in a specific parent
 *
 * @param parentBlockId - The parent block ID
 * @param spaceId - The space ID
 * @param content - The content for the new block
 * @param index - Position index for the new block
 * @returns Complete Craft URL for creating a block
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
    content,
  )}&index=${index}`;
}
