import { useEffect, useRef, useState } from "react";
import { apiListHrmResource, tokenStorage } from "@/lib/api";
import { store } from "@/lib/store";

interface UseHrmLiveListOptions<T> {
  resource: string;
  localGet: () => T[];
  localSave: (items: T[]) => void;
}

// In-memory cache: resource → { data, fetchedAt }
// Shared across all hook instances so the same resource is only fetched once
// per session (not once per component mount).
const memCache = new Map<string, { data: unknown[]; fetchedAt: number }>();
const CACHE_TTL_MS = 60_000;

// Track in-flight promises so concurrent mounts reuse the same request
const inFlight = new Map<string, Promise<unknown[]>>();

function getCached<T>(resource: string): T[] | null {
  const entry = memCache.get(resource);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    memCache.delete(resource);
    return null;
  }
  return entry.data as T[];
}

function fetchResource<T>(resource: string): Promise<T[]> {
  const existing = inFlight.get(resource);
  if (existing) return existing as Promise<T[]>;

  const promise = apiListHrmResource<T>(resource)
    .then((data) => {
      if (data.length > 0) {
        memCache.set(resource, { data: data as unknown[], fetchedAt: Date.now() });
      }
      inFlight.delete(resource);
      return data;
    })
    .catch((err) => {
      inFlight.delete(resource);
      throw err;
    });

  inFlight.set(resource, promise as Promise<unknown[]>);
  return promise;
}

export function useHrmLiveList<T extends { id: string }>({
  resource,
  localGet,
  localSave,
}: UseHrmLiveListOptions<T>) {
  // Always start from localStorage — instant render, no spinner
  const [items, setItems] = useState<T[]>(() => {
    const cached = getCached<T>(resource);
    return cached ?? localGet();
  });

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Never attempt API calls with an offline/demo token
    if (tokenStorage.isOffline() || !tokenStorage.get()) return;
    if (!store.getBusinessProfile().isOnline) return;

    // Already have fresh in-memory cache — no request needed
    const cached = getCached<T>(resource);
    if (cached) {
      setItems(cached);
      return;
    }

    let active = true;

    // Background fetch — silently update list when done, keep local data on failure
    fetchResource<T>(resource)
      .then((remote) => {
        if (!active || !mountedRef.current) return;
        if (remote.length > 0) {
          setItems(remote);
          localSave(remote);
        }
        // If server returns empty, keep existing local data
      })
      .catch(() => {
        // Network / auth error — stay on local data, no error shown
      });

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  const saveItems = (next: T[]) => {
    memCache.delete(resource);
    setItems(next);
    localSave(next);
  };

  // loading is always false — pages render local data immediately
  return { items, saveItems, loading: false };
}

/** Manually invalidate a resource's cache (call after create/update/delete). */
export function invalidateHrmCache(resource: string) {
  memCache.delete(resource);
}
