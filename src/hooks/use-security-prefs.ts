import { useEffect, useState } from "react";
import {
  loadSecurityPrefs,
  SecurityPrefs,
  SECURITY_PREFS_KEY,
  SECURITY_PREFS_UPDATED_EVENT,
} from "@/lib/security";

export function useSecurityPrefs(): SecurityPrefs {
  const [prefs, setPrefs] = useState<SecurityPrefs>(() => loadSecurityPrefs());

  useEffect(() => {
    const refresh = () => setPrefs(loadSecurityPrefs());
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === SECURITY_PREFS_KEY) refresh();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(SECURITY_PREFS_UPDATED_EVENT, refresh as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SECURITY_PREFS_UPDATED_EVENT, refresh as EventListener);
    };
  }, []);

  return prefs;
}
