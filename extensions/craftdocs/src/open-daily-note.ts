import { open, showToast, Toast } from "@raycast/api";
import Config from "./Config";
import { createQueryUrl } from "./utils/craftUrls";

export default async function Command() {
  try {
    const config = new Config();

    if (config.spaces.length === 0) {
      await showToast({
        title: "No Craft Spaces found",
        message: "Make sure Craft is installed and configured properly",
        style: Toast.Style.Failure,
      });
      return;
    }

    const primarySpace = config.primarySpace();
    if (!primarySpace) {
      await showToast({
        title: "No primary Space found",
        message: "Use Manage Spaces command to set up your primary Space",
        style: Toast.Style.Failure,
      });
      return;
    }

    if (!primarySpace.isEnabled) {
      await showToast({
        title: "Primary Space is disabled",
        message: "Enable your primary Space in Manage Spaces command",
        style: Toast.Style.Failure,
      });
      return;
    }

    const url = createQueryUrl("today", primarySpace.spaceID);
    await open(url);

    await showToast({
      title: "Opening Daily Note",
      message: `Opening today's note in ${config.getSpaceDisplayName(primarySpace.spaceID)}`,
      style: Toast.Style.Success,
    });
  } catch (error) {
    await showToast({
      title: "Failed to open Daily Note",
      message: error instanceof Error ? error.message : "Make sure Craft is installed and running",
      style: Toast.Style.Failure,
    });
  }
}
