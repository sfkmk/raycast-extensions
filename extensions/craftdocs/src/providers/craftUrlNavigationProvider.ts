import {
  createBlockInParentUrl,
  createBlockUrl,
  createDocumentUrl,
  createFolderUrl,
  createQueryUrl,
} from "../utils/craftUrls";
import type { NavigationProvider, NavigationTarget } from "./types";

export const craftUrlNavigationProvider: NavigationProvider = {
  createUrl(target: NavigationTarget): string {
    switch (target.kind) {
      case "block":
        return createBlockUrl(target.blockId, target.spaceId);
      case "block-in-parent":
        return createBlockInParentUrl(target.parentBlockId, target.spaceId, target.content, target.index);
      case "document":
        return createDocumentUrl(target.spaceId, target.title, target.content, target.folderId);
      case "folder":
        return createFolderUrl(target.spaceId, target.folderId, target.title);
      case "query":
        return createQueryUrl(target.query, target.spaceId);
    }
  },
};
