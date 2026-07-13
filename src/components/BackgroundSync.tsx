import { useEffect } from "react";
import { syncLiveBusinessData } from "@/lib/live-sync";

const INTERVAL_MS = 30_000;

export default function BackgroundSync() {
  useEffect(() => {
    const run = () => syncLiveBusinessData().catch(() => {});

    const id = setInterval(run, INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
