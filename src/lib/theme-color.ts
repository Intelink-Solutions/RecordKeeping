// ─────────────────────────────────────────────────────────────────────────────
// Theme color — lets a shop owner pick any brand/primary color for the app.
// Overrides the same CSS custom properties `index.css` defines on `:root`, so
// every component already using `bg-primary`/`text-primary`/etc. (and the
// handful of places that read `hsl(var(--nav-active))` etc. directly) picks
// it up with no further changes.
// ─────────────────────────────────────────────────────────────────────────────

export const THEME_COLOR_KEY = "pos_theme_color";

export interface ThemePreset {
  name: string;
  hex: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: "Gold", hex: "#F2C500" },
  { name: "Teal", hex: "#0D9488" },
  { name: "Emerald", hex: "#059669" },
  { name: "Blue", hex: "#2563EB" },
  { name: "Indigo", hex: "#4F46E5" },
  { name: "Purple", hex: "#7C3AED" },
  { name: "Pink", hex: "#DB2777" },
  { name: "Red", hex: "#DC2626" },
  { name: "Orange", hex: "#EA580C" },
];

export const DEFAULT_THEME_HEX = THEME_PRESETS[0].hex;

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4;
    }
    h *= 60;
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Relative luminance (WCAG) to decide whether black or white text reads better. */
function relativeLuminance(r: number, g: number, b: number): number {
  const chan = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

export function isValidHexColor(hex: string): boolean {
  return hexToRgb(hex) !== null;
}

/**
 * Computes and applies every CSS custom property derived from a single brand
 * color: the primary color itself, a readable foreground for it, a light
 * tint for `--accent`, a dark shade for `--accent-foreground`, and the nav
 * bar's active-state colors (which mirror `--primary` in the default theme).
 */
export function applyThemeColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const luminance = relativeLuminance(rgb.r, rgb.g, rgb.b);
  const dark = "4 15% 8%";
  const light = "0 0% 100%";
  const foreground = luminance > 0.45 ? dark : light;

  const root = document.documentElement.style;
  root.setProperty("--primary", `${h} ${s}% ${l}%`);
  root.setProperty("--primary-foreground", foreground);
  root.setProperty("--ring", `${h} ${s}% ${l}%`);
  root.setProperty("--accent", `${h} ${Math.min(s, 100)}% 94%`);
  root.setProperty("--accent-foreground", `${h} ${Math.min(s, 100)}% 24%`);
  root.setProperty("--nav-active", `${h} ${s}% ${l}%`);
  root.setProperty("--nav-active-foreground", foreground);

  return true;
}

export function saveThemeColor(hex: string): void {
  localStorage.setItem(THEME_COLOR_KEY, hex);
}

export function loadThemeColor(): string | null {
  return localStorage.getItem(THEME_COLOR_KEY);
}

/** Reset to the built-in default (gold) theme. */
export function clearThemeColor(): void {
  localStorage.removeItem(THEME_COLOR_KEY);
  const root = document.documentElement.style;
  for (const prop of ["--primary", "--primary-foreground", "--ring", "--accent", "--accent-foreground", "--nav-active", "--nav-active-foreground"]) {
    root.removeProperty(prop);
  }
}

/** Call once at app boot (before first paint) to apply any persisted color. */
export function initThemeColor(): void {
  const saved = loadThemeColor();
  if (saved) applyThemeColor(saved);
}
