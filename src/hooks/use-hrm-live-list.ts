import { useEffect, useState } from "react";
import { apiListHrmResource } from "@/lib/api";
import { store } from "@/lib/store";

interface UseHrmLiveListOptions<T> {
  resource: string;
  localGet: () => T[];
  localSave: (items: T[]) => void;
}

/**
 * Loads HRM list data from live API when Online mode is enabled.
 * Falls back to local store for Offline mode or API failures.
 */
export function useHrmLiveList<T extends { id: string }>({
  resource,
  localGet,
  localSave,
}: UseHrmLiveListOptions<T>) {
  const [items, setItems] = useState<T[]>(localGet());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const isOnline = store.getBusinessProfile().isOnline;
      if (!isOnline) {
        if (mounted) setItems(localGet());
        return;
      }

      setLoading(true);
      try {
        const remote = await apiListHrmResource<T>(resource);
        if (!mounted) return;

        if (remote.length > 0) {
          setItems(remote);
          localSave(remote);
        } else {
          // If API returns empty payload shape, keep local data.
          setItems(localGet());
        }
      } catch {
        if (!mounted) return;
        // Graceful fallback until HRM API routes are fully available.
        setItems(localGet());
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [resource, localGet, localSave]);

  const saveItems = (next: T[]) => {
    setItems(next);
    localSave(next);
  };

  return { items, saveItems, loading };
}
