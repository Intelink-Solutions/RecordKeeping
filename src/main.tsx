import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply dark mode on load
try {
  const bp = localStorage.getItem("pos_business_profile");
  if (bp) {
    const parsed = JSON.parse(bp);
    if (parsed.darkMode) document.documentElement.classList.add("dark");
  }
} catch {}

createRoot(document.getElementById("root")!).render(<App />);
