import { useEffect, useState } from "react";
import { getApplications } from "@raycast/api";
import { bundleIds, getPreferences } from "../preferences";
import { isValidApplication } from "../utils/safety";

export type UseAppExists = {
  appExistsLoading: boolean;
  appExists: boolean;
};

export default function useAppExists() {
  const [state, setState] = useState<UseAppExists>({ appExistsLoading: true, appExists: false });

  useEffect(() => {
    const check = async () => {
      try {
        const apps = await getApplications();

        // Filter out malformed applications that might cause List.Item errors
        const validApps = apps.filter(isValidApplication);

        const preferredApp = getPreferences().application;
        const found = validApps.find(
          (app) => app.bundleId && bundleIds.includes(app.bundleId as (typeof bundleIds)[number])
        );
        const app = preferredApp || found;

        if (!app) {
          return setState({ appExistsLoading: false, appExists: false });
        }

        setState({ appExistsLoading: false, appExists: true });
      } catch (error) {
        // Handle any errors during app detection
        console.error("[App] Failed to check app existence:", error);
        setState({ appExistsLoading: false, appExists: false });
      }
    };

    check();
  }, []);

  return state;
}
