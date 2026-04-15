import { useState, useEffect } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * of inactivity. Use it for search inputs so filtering happens immediately
 * on every keystroke but the filtered list re-renders are batched.
 *
 * @example
 *   const debouncedSearch = useDebounce(search, 200);
 *   const filtered = items.filter(i => i.name.includes(debouncedSearch));
 */
export function useDebounce<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
