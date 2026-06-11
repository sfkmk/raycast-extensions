import { open, showToast, Toast } from "@raycast/api";
import { buildCraftConfig, loadCraftConfigSnapshot } from "./Config";
import { getCraftEnvironment, CraftPreference } from "./lib/craftEnvironment";
import { getPreferences } from "./preferences";
import { createQueryUrl } from "./utils/craftUrls";

// noinspection JSUnusedGlobalSymbols
export default async function openDailyNote() {
  try {
    const preferences = getPreferences();
    const environment = await getCraftEnvironment(preferences.application as unknown as CraftPreference);

    if (environment.status !== "ready") {
      await showToast({
        title: "Craft is not ready",
        message: "Open Craft and let it finish syncing before opening the Daily Note.",
        style: Toast.Style.Failure,
      });
      return;
    }

    const config = buildCraftConfig(loadCraftConfigSnapshot(environment));
    const primarySpace = config.primarySpace;

    if (!primarySpace) {
      await showToast({
        title: "No Craft Spaces found",
        message: "Open Craft and let it finish syncing before opening the Daily Note.",
        style: Toast.Style.Failure,
      });
      return;
    }

    if (!primarySpace.isEnabled) {
      await showToast({
        title: "Primary Space is disabled",
        message: "Enable it in Manage Spaces before opening the Daily Note.",
        style: Toast.Style.Failure,
      });
      return;
    }

    await open(createQueryUrl("today", primarySpace.spaceID));
    await showToast({
      title: "Opening Daily Note",
      message: `Opening today's note in ${config.getSpaceDisplayName(primarySpace.spaceID)}.`,
      style: Toast.Style.Success,
    });
  } catch (error) {
    await showToast({
      title: "Failed to open Daily Note",
      message: error instanceof Error ? error.message : "Make sure Craft is installed and running.",
      style: Toast.Style.Failure,
    });
  }
}
