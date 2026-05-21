export type SecurityPrefs = {
  appLock: boolean;
  biometric: boolean;
  hideAmounts: boolean;
  autoLock: "immediately" | "1m" | "5m" | "15m";
};

export const SECURITY_PREFS_KEY = "pos_security_prefs";
export const SECURITY_PREFS_UPDATED_EVENT = "pos_security_prefs_updated";

export const defaultSecurityPrefs: SecurityPrefs = {
  appLock: true,
  biometric: true,
  hideAmounts: true,
  autoLock: "5m",
};

export function loadSecurityPrefs(): SecurityPrefs {
  try {
    const raw = localStorage.getItem(SECURITY_PREFS_KEY);
    if (!raw) return defaultSecurityPrefs;
    const parsed = JSON.parse(raw) as Partial<SecurityPrefs>;
    return { ...defaultSecurityPrefs, ...parsed };
  } catch {
    return defaultSecurityPrefs;
  }
}

export function saveSecurityPrefs(value: SecurityPrefs): void {
  localStorage.setItem(SECURITY_PREFS_KEY, JSON.stringify(value));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SECURITY_PREFS_UPDATED_EVENT, { detail: value }));
  }
}

export function getAutoLockTimeoutMs(timeout: SecurityPrefs["autoLock"]): number {
  if (timeout === "immediately") return 0;
  if (timeout === "1m") return 60_000;
  if (timeout === "5m") return 5 * 60_000;
  return 15 * 60_000;
}

export function maskSensitiveValue(value: string, hidden: boolean): string {
  return hidden ? "****" : value;
}

// ─── PIN Lock ─────────────────────────────────────────────────────────────────
export const PIN_HASH_KEY = "pos_security_pin_hash";

async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(pin));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hasPinSet(): boolean {
  return Boolean(localStorage.getItem(PIN_HASH_KEY));
}

export async function savePin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  localStorage.setItem(PIN_HASH_KEY, hash);
}

export function clearPin(): void {
  localStorage.removeItem(PIN_HASH_KEY);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_HASH_KEY);
  if (!stored) return false;
  const hash = await hashPin(pin);
  return hash === stored;
}

// ─── Offline login credential cache ──────────────────────────────────────────
// Stores a SHA-256 hash of the last successful login (email:password).
// Used to verify identity when the server is unreachable so the user can
// still access cached app data.

const OFFLINE_CRED_KEY = "pos_offline_cred";

async function hashCredential(email: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(`${email.toLowerCase()}:${password}`));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Returns true if a cached offline credential exists on this device. */
export function hasOfflineCredential(): boolean {
  return Boolean(localStorage.getItem(OFFLINE_CRED_KEY));
}

/** Hashes and stores the credential after a successful online login. */
export async function saveOfflineCredential(email: string, password: string): Promise<void> {
  const hash = await hashCredential(email, password);
  localStorage.setItem(OFFLINE_CRED_KEY, hash);
}

/** Returns true if the provided credentials match the cached hash. */
export async function verifyOfflineCredential(email: string, password: string): Promise<boolean> {
  const stored = localStorage.getItem(OFFLINE_CRED_KEY);
  if (!stored) return false;
  const hash = await hashCredential(email, password);
  return hash === stored;
}

/** Removes the cached offline credential (e.g., on explicit sign-out). */
export function clearOfflineCredential(): void {
  localStorage.removeItem(OFFLINE_CRED_KEY);
}

/** Sentinel token value stored when the user logs in via offline fallback. */
export const OFFLINE_TOKEN = "__offline__";
