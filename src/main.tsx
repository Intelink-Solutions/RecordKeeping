import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initThemeColor } from "./lib/theme-color";
import { applyDynamicBranding } from "./lib/app-branding";

// Apply dark mode + the shop's own app name/icon (if already set up) before
// first paint, so there's no flash of the default look.
try {
  const bp = localStorage.getItem("pos_business_profile");
  if (bp) {
    const parsed = JSON.parse(bp);
    if (parsed.darkMode) document.documentElement.classList.add("dark");
    applyDynamicBranding(parsed);
  }
} catch {
  // Ignore invalid persisted profile payload.
}

// Apply any shop-owner-chosen brand color before first paint to avoid a
// flash of the default gold theme.
initThemeColor();

createRoot(document.getElementById("root")!).render(<App />);
