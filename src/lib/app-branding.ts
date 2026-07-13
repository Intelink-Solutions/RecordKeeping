// ─────────────────────────────────────────────────────────────────────────────
// Dynamic app branding — the browser tab title and in-app favicon switch to
// the shop's own short name/logo once they've set it up (via the first-login
// setup wizard). This can only change what's shown *inside* the running app
// (tab title, favicon, header wordmark) — it cannot change the icon already
// installed on a phone's home screen, since that's baked into the native
// Android/iOS build at compile time, not something a running web/webview app
// can rewrite. Shipping a different home-screen icon per shop would require a
// separate native build per shop (swap android/app/src/main/res/mipmap-*/
// ic_launcher.png + ios/App/App/Assets.xcassets before running `cap sync`).
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_APP_NAME = "RecordKEEPING";
const DEFAULT_FAVICON = "/icon.png";

/** sessionStorage key for "shop owner dismissed the setup wizard this session".
 * Cleared on every successful login so the wizard reliably reappears next time. */
export const SETUP_WIZARD_SKIP_KEY = "pos_setup_wizard_skipped";

interface BrandableProfile {
  shortName?: string;
  logo?: string;
}

/**
 * Splits a brand word into two halves for two-tone styling — e.g.
 * "RecordKEEPING" -> ["Record", "KEEPING"] — by finding where an uppercase
 * run begins after a lowercase letter. Falls back to putting the whole word
 * in the second half when no such boundary exists (e.g. a shop's own short
 * name, which won't generally follow this casing convention).
 */
export function splitBrandWord(word: string): [string, string] {
  const match = /^([A-Z][a-z]*)([A-Z].*)$/.exec(word);
  if (match) return [match[1], match[2]];
  return ["", word];
}

export function getAppBrandName(profile: BrandableProfile): string {
  return profile.shortName?.trim() || DEFAULT_APP_NAME;
}

/** Call whenever the business profile changes so the tab title/favicon stay in sync. */
export function applyDynamicBranding(profile: BrandableProfile): void {
  if (typeof document === "undefined") return;

  document.title = getAppBrandName(profile);

  const href = profile.logo?.trim() || DEFAULT_FAVICON;
  const iconLinks = document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']");
  if (iconLinks.length > 0) {
    iconLinks.forEach((link) => { link.href = href; });
  } else {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = href;
    document.head.appendChild(link);
  }
}
