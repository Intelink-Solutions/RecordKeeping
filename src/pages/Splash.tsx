import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tokenStorage } from "@/lib/api";
import { syncLiveBusinessData } from "@/lib/live-sync";
import logo from "@/assets/logo.png";

const REDIRECT_DELAY_MS = 2600;

const Splash = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(false);

  useEffect(() => {
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
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-primary overflow-hidden select-none">
      {/* Decorative rings */}
      <div
        className="absolute rounded-full border-2 border-primary-foreground/10"
        style={{ width: 420, height: 420, top: -130, right: -130 }}
      />
      <div
        className="absolute rounded-full border-2 border-primary-foreground/10"
        style={{ width: 280, height: 280, bottom: -90, left: -90 }}
      />
      <div
        className="absolute rounded-full border border-primary-foreground/5"
        style={{ width: 180, height: 180, top: "30%", left: -60 }}
      />

      {/* Logo + branding */}
      <div
        className="flex flex-col items-center gap-5"
        style={{
          transition: "opacity 0.6s ease, transform 0.6s ease",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(18px) scale(0.88)",
        }}
      >
        {/* Logo card */}
        <div className="w-28 h-28 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-3">
          <img
            src={logo}
            alt="Key Doctors POS"
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>

        {/* Text */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-primary-foreground tracking-tight leading-none">
            Key Doctors
          </h1>
          <p className="text-sm font-medium text-primary-foreground/65 mt-1.5 tracking-wide uppercase">
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
        <div className="w-40 h-1 bg-primary-foreground/20 rounded-full overflow-hidden">
          {/* Fill */}
          <div
            className="h-full bg-primary-foreground rounded-full"
            style={{
              transition: progress
                ? `width ${REDIRECT_DELAY_MS - 200}ms linear`
                : "none",
              width: progress ? "100%" : "0%",
            }}
          />
        </div>
        <p className="text-[11px] text-primary-foreground/45 tracking-wide">
          Loading...
        </p>
      </div>

      {/* Version */}
      <p
        className="absolute bottom-5 text-[10px] text-primary-foreground/30"
        style={{
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
