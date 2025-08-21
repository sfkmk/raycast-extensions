import { homedir } from "os";
import { readdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { BUNDLE_IDS } from "./constants";
import { ensureCraftPath, ensureSafeRegex } from "./utils/safety";

const [craftDataRoot] = BUNDLE_IDS.map((id) =>
  path.join(homedir(), `/Library/Containers/${id}/Data/Library/Application Support/${id}`)
).filter(existsSync);
const searchPath = ensureCraftPath(craftDataRoot, "Search");
const SPACES_CONFIG_FILE = ensureCraftPath(craftDataRoot, "raycast-spaces-config.json");

type SpaceSQLite = {
  path: string;
  spaceID: string;
  primary: boolean;
  customName: string | null;
  isEnabled: boolean;
};

type SpaceSettings = {
  [spaceID: string]: {
    customName: string | null;
    isEnabled: boolean;
  };
};

export default class Config {
  spaces: SpaceSQLite[];
  private spaceSettings: SpaceSettings = {};

  constructor() {
    try {
      // Early return if Craft is not installed or directories don't exist
      if (!searchPath) {
        this.spaces = [];
        this.spaceSettings = {};
        return;
      }

      const pathToIndexDatabases = searchPath.replace("~", homedir());
      const databasesForExistingRealms = this.buildFilterRegexForExistingRealms();

      // Load settings first before creating spaces
      this.loadSpaceSettings();

      this.spaces = readdirSync(pathToIndexDatabases)
        .filter((str) => str.match(databasesForExistingRealms))
        .map((str) => this.makeSpaceFromStr(pathToIndexDatabases, str));
    } catch (e) {
      this.spaces = [];
    }
  }

  primarySpace = () => this.spaces.find((space) => space.primary);

  private buildFilterRegexForExistingRealms = (): RegExp => {
    // Handle case where Craft is not installed
    if (!craftDataRoot) {
      return ensureSafeRegex("");
    }

    const root = craftDataRoot.replace("~", homedir());

    const regexIDsPart = readdirSync(root)
      .filter(this.selectRealmFiles)
      .map(this.extractSpaceIDs)
      .filter((str) => str)
      .join("|");

    return ensureSafeRegex(`(?:${regexIDsPart})[^.]*.sqlite$`);
  };

  private selectRealmFiles = (str: string): boolean => str.match(/\.realm$/) !== null;

  // Main Realm file is named in this way:
  // LukiMain_e95db95e-286c-e7c9-276e-c61b378d1e1c_2E3178A2-26CD-4991-BBCB-67F097040B59.realm
  //          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //          ID of the main space
  //
  // Additional spaces are named like this:
  // LukiMain_e95db95e-286c-e7c9-276e-c61b378d1e1c||b3fccbd6-1e8e-a73f-16d5-9d14a9f17793_2E3178A2-26CD-4991-BBCB-67F097040B59.realm
  //                                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                                                ID of secondary spaces
  //
  // With the provided string, this function selects ID or returns undefined.
  private extractSpaceIDs = (str: string): string | undefined => {
    const split = str.split("_");
    if (split.length !== 3) {
      return;
    }

    return split[1].split("||").pop();
  };

  private makeSpaceFromStr = (pwd: string, str: string): SpaceSQLite => {
    const spaceID = str.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/g)?.pop() || "";
    const settings = this.spaceSettings[spaceID];

    return {
      primary: !str.includes("||"),
      path: path.join(pwd, str),
      spaceID,
      customName: settings?.customName || null,
      isEnabled: settings?.isEnabled ?? true,
    };
  };

  // Space Management Methods
  getSpaceDisplayName = (spaceID: string): string => {
    const space = this.spaces.find((s) => s.spaceID === spaceID);

    if (!space) return spaceID;

    if (space.customName) {
      return space.primary ? `${space.customName} (Primary)` : space.customName;
    }

    return space.primary ? `${spaceID} (Primary)` : spaceID;
  };

  setSpaceCustomName = (spaceID: string, customName: string | null): void => {
    // Update in memory
    const space = this.spaces.find((s) => s.spaceID === spaceID);
    if (space) {
      space.customName = customName;
    }

    // Update settings
    if (!this.spaceSettings[spaceID]) {
      this.spaceSettings[spaceID] = { customName: null, isEnabled: true };
    }
    this.spaceSettings[spaceID].customName = customName;

    this.saveSpaceSettings();
  };

  toggleSpaceEnabled = (spaceID: string): void => {
    // Update in memory
    const space = this.spaces.find((s) => s.spaceID === spaceID);
    if (space) {
      space.isEnabled = !space.isEnabled;
    }

    // Update settings
    if (!this.spaceSettings[spaceID]) {
      this.spaceSettings[spaceID] = { customName: null, isEnabled: true };
    }
    this.spaceSettings[spaceID].isEnabled = space?.isEnabled ?? true;

    this.saveSpaceSettings();
  };

  getEnabledSpaces = (): SpaceSQLite[] => {
    return this.spaces.filter((space) => space.isEnabled);
  };

  getAllSpacesForDropdown = (): Array<{ id: string; title: string }> => {
    return this.getEnabledSpaces().map((space) => ({
      id: space.spaceID,
      title: this.getSpaceDisplayName(space.spaceID),
    }));
  };

  private loadSpaceSettings = (): void => {
    try {
      // Handle case where Craft is not installed
      if (!SPACES_CONFIG_FILE) {
        this.spaceSettings = {};
        return;
      }

      if (existsSync(SPACES_CONFIG_FILE)) {
        const data = readFileSync(SPACES_CONFIG_FILE, "utf-8");
        this.spaceSettings = JSON.parse(data);
      } else {
        this.spaceSettings = {};
      }
    } catch (e) {
      // Failed to load space settings, using defaults
      this.spaceSettings = {};
    }
  };

  private saveSpaceSettings = (): void => {
    try {
      // Handle case where Craft is not installed
      if (!SPACES_CONFIG_FILE) {
        return;
      }

      writeFileSync(SPACES_CONFIG_FILE, JSON.stringify(this.spaceSettings, null, 2));
    } catch (e) {
      // Failed to save space settings
    }
  };
}
