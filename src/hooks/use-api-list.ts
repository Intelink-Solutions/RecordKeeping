import { useEffect, useRef, useState } from "react";
import { apiGet, tokenStorage } from "@/lib/api";
import { store } from "@/lib/store";

function extractList<T>(payload: unknown): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  if (typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as T[];
  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) return nested.data as T[];
  }
  for (const key of ["branches", "warehouses", "transfers", "roles", "items", "results", "list"]) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }
  return [];
}

function normalizeStatus(val: unknown): "Active" | "Inactive" | unknown {
  if (val === 1 || val === "1" || val === true) return "Active";
  if (val === 0 || val === "0" || val === false) return "Inactive";
  if (typeof val === "string") {
    const lower = val.toLowerCase();
    if (lower === "active") return "Active";
    if (lower === "inactive") return "Inactive";
  }
  return val;
}

function normalizeItem<T>(item: unknown): T {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item as T;
  const obj = item as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    if (value !== null && value !== undefined && (camelKey === "id" || camelKey.endsWith("Id"))) {
      result[camelKey] = String(value);
    } else if (camelKey === "status") {
      result[camelKey] = normalizeStatus(value);
    } else {
      result[camelKey] = value;
    }
  }
  return result as T;
}

const memCache = new Map<string, { data: unknown[]; fetchedAt: number }>();
const CACHE_TTL_MS = 60_000;
const inFlight = new Map<string, Promise<unknown[]>>();

function getCached<T>(cacheKey: string): T[] | null {
  const entry = memCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) { memCache.delete(cacheKey); return null; }
  return entry.data as T[];
}

async function fetchFromPaths<T>(cacheKey: string, paths: string[]): Promise<T[]> {
  const existing = inFlight.get(cacheKey);
  if (existing) return existing as Promise<T[]>;

  const promise = (async (): Promise<T[]> => {
    for (const path of paths) {
      try {
        const payload = await apiGet<unknown>(path);
        const items = extractList<unknown>(payload).map(normalizeItem<T>);
        if (items.length > 0) {
          memCache.set(cacheKey, { data: items as unknown[], fetchedAt: Date.now() });
          inFlight.delete(cacheKey);
          return items;
        }
      } catch {
        // try next path
      }
    }
    inFlight.delete(cacheKey);
    return [];
  })();

  inFlight.set(cacheKey, promise as Promise<unknown[]>);
  return promise;
}

export function invalidateApiListCache(cacheKey: string): void {
  memCache.delete(cacheKey);
}

export function useApiList<T extends { id: string }>({
  cacheKey,
  paths,
  localGet,
  localSave,
}: {
  cacheKey: string;
  paths: string[];
  localGet: () => T[];
  localSave: (items: T[]) => void;
}) {
  const [items, setItems] = useState<T[]>(() => getCached<T>(cacheKey) ?? localGet());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (tokenStorage.isOffline() || !tokenStorage.get()) return;
    if (!store.getBusinessProfile().isOnline) return;

    const cached = getCached<T>(cacheKey);
    if (cached) { setItems(cached); return; }

    let active = true;
    fetchFromPaths<T>(cacheKey, paths)
      .then((remote) => {
        if (!active || !mountedRef.current) return;
        if (remote.length > 0) { setItems(remote); localSave(remote); }
      })
      .catch(() => {});

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const saveItems = (next: T[]) => {
    memCache.delete(cacheKey);
    setItems(next);
    localSave(next);
  };

  return { items, saveItems, loading: false };
}
