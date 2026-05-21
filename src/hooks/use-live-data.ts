import { useState, useEffect, useRef } from "react";

// ── Custom event for store-updated ─────────────────────────────────────────
export const STORE_UPDATED_EVENT = "store-updated";
export const SHOW_SAVED_EVENT = "show-saved";

/** Emit after localStorage store is updated so all pages auto-refresh. */
export function emitStoreUpdate() {
  window.dispatchEvent(new CustomEvent(STORE_UPDATED_EVENT));
}

/**
 * Hook that returns live data from localStorage store.
 * Auto-refreshes whenever `syncLiveBusinessData()` completes.
 */
export function useLiveData<T>(getter: () => T): T {
  const [data, setData] = useState<T>(getter);
  const getterRef = useRef(getter);
  getterRef.current = getter;

  useEffect(() => {
    const handler = () => setData(getterRef.current());
    window.addEventListener(STORE_UPDATED_EVENT, handler);
    return () => window.removeEventListener(STORE_UPDATED_EVENT, handler);
  }, []);

  return data;
}

/**
 * Hook that triggers a re-render whenever the store is updated.
 * Use in pages that read store data with plain consts.
 */
export function useStoreRefresh(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener(STORE_UPDATED_EVENT, handler);
    return () => window.removeEventListener(STORE_UPDATED_EVENT, handler);
  }, []);
}

/** Show a nice animated success overlay. */
export function showSaved(message = "Saved successfully!") {
  window.dispatchEvent(
    new CustomEvent(SHOW_SAVED_EVENT, { detail: { message } })
  );
}
