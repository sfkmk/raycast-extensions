/**
 * Craft URL helpers for extension deep links.
 */

type NullableString = string | undefined | null;

const requireValue = (value: NullableString, message: string): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(message);
  }

  return value;
};

const sanitizeOptionalValue = (value?: string): string => encodeURIComponent(value ?? "");

const sanitizeValue = (value: string): string => encodeURIComponent(value);

export const createDocumentUrl = (spaceID: string, title: string, content: string, folderId = "") => {
  const safeSpaceID = requireValue(spaceID, "createDocumentUrl: spaceID is required");
  const safeTitle = requireValue(title, "createDocumentUrl: title is required");
  if (content === null || content === undefined) {
    throw new Error("createDocumentUrl: content is required");
  }

  return `craftdocs://createdocument?spaceId=${sanitizeValue(safeSpaceID)}&title=${sanitizeValue(
    safeTitle,
  )}&content=${sanitizeValue(content)}&folderId=${sanitizeOptionalValue(folderId)}`;
};

export const createBlockUrl = (blockId: string, spaceId: string): string => {
  const safeBlockId = requireValue(blockId, "createBlockUrl: blockId is required");
  const safeSpaceId = requireValue(spaceId, "createBlockUrl: spaceId is required");

  return `craftdocs://open?blockId=${sanitizeValue(safeBlockId)}&spaceId=${sanitizeValue(safeSpaceId)}`;
};

export const createQueryUrl = (query: string, spaceId: string): string => {
  const safeQuery = requireValue(query, "createQueryUrl: query is required");
  const safeSpaceId = requireValue(spaceId, "createQueryUrl: spaceId is required");

  return `craftdocs://openByQuery?query=${sanitizeValue(safeQuery)}&spaceId=${sanitizeValue(safeSpaceId)}`;
};

export const createBlockInParentUrl = (
  parentBlockId: string,
  spaceId: string,
  content: string,
  index: number | string,
): string => {
  const safeParentBlockId = requireValue(parentBlockId, "createBlockInParentUrl: parentBlockId is required");
  const safeSpaceId = requireValue(spaceId, "createBlockInParentUrl: spaceId is required");
  const safeContent = requireValue(content, "createBlockInParentUrl: content is required");

  const safeIndex = typeof index === "number" ? index : Number.parseInt(index, 10);
  if (Number.isNaN(safeIndex) || safeIndex < 0) {
    throw new Error("createBlockInParentUrl: index must be a non-negative number");
  }

  return `craftdocs://createblock?parentBlockId=${sanitizeValue(safeParentBlockId)}&spaceId=${sanitizeValue(
    safeSpaceId,
  )}&content=${sanitizeValue(safeContent)}&index=${safeIndex}`;
};

export const createFolderUrl = (spaceId: string, folderId: string, title?: string): string => {
  const safeSpaceId = requireValue(spaceId, "createFolderUrl: spaceId is required");
  const safeFolderId = requireValue(folderId, "createFolderUrl: folderId is required");

  const titleQuery = title ? `&title=${sanitizeValue(title)}` : "";

  return `craftdocs://openfolder?folderId=${sanitizeValue(safeFolderId)}&spaceId=${sanitizeValue(safeSpaceId)}${titleQuery}`;
};
