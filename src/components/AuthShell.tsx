import { ReactNode } from "react";
import { ShieldCheck, Store } from "lucide-react";
import { store } from "@/lib/store";
import BrandWordmark from "@/components/BrandWordmark";

interface AuthShellProps {
  subtitle: string;
  children: ReactNode;
}

/**
 * Shared visual frame for public auth screens (Login, Forgot Password):
 * decorative wave background, the shop's own logo (falls back to a generic
 * icon when none is uploaded yet), and the brand wordmark — "RecordKEEPING"
 * by default, or the shop's own short name once they've set it up. The waves
 * use `hsl(var(--primary))` so a shop owner's chosen theme color (Settings →
 * Theme Color) carries through here too, not just the in-app screens.
 */
const AuthShell = ({ subtitle, children }: AuthShellProps) => {
  const profile = store.getBusinessProfile();
  const businessLogo = profile.logo;

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(160deg, #eafaf5 0%, #f4fbf9 45%, #eef5f2 100%)" }}
    >
      {/* Decorative waves */}
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

      <div className="relative z-10 flex-1 flex flex-col items-center px-6 pt-14 pb-6">
        {/* Logo card */}
        <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center p-3 mb-5 shrink-0">
          {businessLogo ? (
            <img src={businessLogo} alt="Business logo" className="w-full h-full object-contain" draggable={false} />
          ) : (
            <Store size={38} style={{ color: "hsl(var(--primary))" }} />
          )}
        </div>

        {/* Wordmark */}
        <h1 className="text-4xl font-extrabold tracking-tight leading-none">
          <BrandWordmark shortName={profile.shortName} />
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "#64748b" }}>{subtitle}</p>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 mt-7">
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex flex-col items-center gap-1.5 pb-8 px-6">
        <ShieldCheck size={18} style={{ color: "#94a3b8" }} />
        <p className="text-xs" style={{ color: "#94a3b8" }}>Secure. Fast. Reliable.</p>
        <p className="text-[11px]" style={{ color: "#64748b" }}>
          © {new Date().getFullYear()}{" "}
          <span style={{ color: "hsl(var(--primary))" }} className="font-medium">Intelink Solutions</span>. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AuthShell;
