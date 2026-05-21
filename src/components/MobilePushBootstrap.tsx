import { useEffect } from "react";
import { initializeMobilePush } from "@/lib/mobile-push";
import { loadAlertPrefs } from "@/lib/alert-notifications";

const MobilePushBootstrap = () => {
  useEffect(() => {
    const prefs = loadAlertPrefs();
    void initializeMobilePush(prefs.pushEnabled).catch(() => undefined);
  }, []);

  return null;
};

export default MobilePushBootstrap;