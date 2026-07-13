import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store } from "lucide-react";
import { tokenStorage } from "@/lib/api";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { store } from "@/lib/store";
import BrandWordmark from "@/components/BrandWordmark";

const REDIRECT_DELAY_MS = 2600;

const Splash = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(false);
  const profile = store.getBusinessProfile();
  const businessLogo = profile.logo;

  useEffect(() => {
    // Only set the default API URL if the user has never configured one — the
    // Settings page owns this value... except it no longer offers an editable
    // field (locked for security), so a device that auto-set the *old*
    // localhost default has no other way to pick up the new one. One-time
    // migration: only the old auto-set values get overwritten, never a real
    // custom override (there's no way to have set one since the field locked).
    const currentBaseUrl = localStorage.getItem("pos_api_base_url");
    const isStaleLocalDefault =
      currentBaseUrl === "http://localhost:8000/api/v1" || currentBaseUrl === "http://127.0.0.1:8000/api/v1";
    if (!currentBaseUrl || isStaleLocalDefault) {
      localStorage.setItem("pos_api_base_url", "https://keydoctors.veewiss.com/api/v1");
    }

    // Kick off background data sync immediately so pages have fresh data on arrival
    if (!tokenStorage.isOffline() && tokenStorage.get()) {
      void syncLiveBusinessData().catch(() => {});
    }

    // Trigger entrance animation on next tick
    const animTimer = setTimeout(() => {
      setVisible(true);
      setProgress(true);
    }, 80);

    // Redirect after delay
    const redirectTimer = setTimeout(() => {
      const token = tokenStorage.get();
      navigate(token ? "/home" : "/login", { replace: true });
    }, REDIRECT_DELAY_MS);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "linear-gradient(160deg, #eafaf5 0%, #f4fbf9 45%, #eef5f2 100%)" }}
    >
      {/* Decorative waves — same language as the login/auth screens */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute rounded-full"
          style={{ width: 420, height: 420, top: -170, right: -150, background: "radial-gradient(circle, hsl(var(--primary) / 0.20), transparent 70%)" }}
        />
        <div
          className="absolute rounded-full"
          style={{ width: 560, height: 560, bottom: -260, left: -240, background: "radial-gradient(circle, hsl(var(--primary) / 0.32), transparent 70%)" }}
        />
        <div
          className="absolute rounded-full"
          style={{ width: 220, height: 220, top: "28%", left: -90, background: "radial-gradient(circle, hsl(var(--primary) / 0.14), transparent 70%)" }}
        />
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: 170, background: "linear-gradient(180deg, transparent 0%, #0b1220 68%)" }}
        />
      </div>

      {/* Logo + branding */}
      <div
        className="relative flex flex-col items-center gap-5"
        style={{
          transition: "opacity 0.6s ease, transform 0.6s ease",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(18px) scale(0.88)",
        }}
      >
        {/* Logo card */}
        <div className="w-28 h-28 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-3">
          {businessLogo ? (
            <img
              src={businessLogo}
              alt="Business logo"
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <Store size={48} style={{ color: "hsl(var(--primary))" }} />
          )}
        </div>

        {/* Text */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight leading-none">
            <BrandWordmark shortName={profile.shortName} />
          </h1>
          <p className="text-sm font-medium mt-1.5 tracking-wide uppercase" style={{ color: "#64748b" }}>
            Point of Sale System
          </p>
        </div>
      </div>

      {/* Bottom: progress bar + label */}
      <div
        className="absolute bottom-14 flex flex-col items-center gap-2.5"
        style={{
          transition: "opacity 0.6s ease 0.3s",
          opacity: visible ? 1 : 0,
        }}
      >
        {/* Track */}
        <div className="w-40 h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--primary) / 0.18)" }}>
          {/* Fill */}
          <div
            className="h-full rounded-full"
            style={{
              background: "hsl(var(--primary))",
              transition: progress
                ? `width ${REDIRECT_DELAY_MS - 200}ms linear`
                : "none",
              width: progress ? "100%" : "0%",
            }}
          />
        </div>
        <p className="text-[11px] tracking-wide" style={{ color: "#94a3b8" }}>
          Loading...
        </p>
      </div>

      {/* Version */}
      <p
        className="absolute bottom-5 text-[10px]"
        style={{
          color: "#94a3b8",
          transition: "opacity 0.6s ease 0.5s",
          opacity: visible ? 1 : 0,
        }}
      >
        v1.0.0
      </p>
    </div>
  );
};

export default Splash;
