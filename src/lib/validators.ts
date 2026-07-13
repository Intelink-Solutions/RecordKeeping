// ─────────────────────────────────────────────────────────────────────────────
// Shared field validators — email/phone format checks used across every form
// that collects contact details (customers, suppliers, staff, branches, etc.)
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Accepts digits with optional leading "+", spaces, dashes, and parens; 7-15 digits. */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!/^[+]?[\d\s()-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/** Returns an error message for an optional email field, or null if valid/empty. */
export function validateOptionalEmail(value: string | undefined | null): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  return isValidEmail(trimmed) ? null : "Enter a valid email address.";
}

/** Returns an error message for an optional phone field, or null if valid/empty. */
export function validateOptionalPhone(value: string | undefined | null): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  return isValidPhone(trimmed) ? null : "Enter a valid phone number (7-15 digits).";
}
