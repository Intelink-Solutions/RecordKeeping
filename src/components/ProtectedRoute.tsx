import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";
import { emitStoreUpdate } from "@/hooks/use-live-data";
import { tokenStorage } from "@/lib/api";
import { evaluateAlertNotifications } from "@/lib/alert-notifications";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { store } from "@/lib/store";
import { getAutoLockTimeoutMs, hasPinSet, loadSecurityPrefs, SECURITY_PREFS_UPDATED_EVENT, verifyPin } from "@/lib/security";
import PullToRefresh from "@/components/PullToRefresh";

const HIDDEN_AT_KEY = "pos_security_hidden_at";
const UNLOCKED_KEY = "pos_security_unlocked";

/**
 * Wraps protected routes using React Router v6 layout route pattern.
 * Place this as a parent `<Route element={<ProtectedRoute />}>` and nest
 * all authenticated routes inside it.
 *
 * If no token is stored, the user is redirected to /login and their
 * attempted path is preserved in state so we can restore it after login.
 */
const ProtectedRoute = () => {
  const token = tokenStorage.get();
  const [locked, setLocked] = useState(false);
  const [unlockingBiometric, setUnlockingBiometric] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [securityPrefs, setSecurityPrefs] = useState(() => loadSecurityPrefs());
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinVerifying, setPinVerifying] = useState(false);

  useEffect(() => {
    if (!token) return;

    let active = true;

    const runSync = () => {
      if (!active) return;
      // syncLiveBusinessData handles isOffline/isOnline checks and never throws
      void syncLiveBusinessData();
    };

    runSync();
    const syncInterval = window.setInterval(runSync, 30_000);

    return () => {
      active = false;
      window.clearInterval(syncInterval);
    };
  }, [token]);

  useEffect(() => {
    const refreshPrefs = () => {
      setSecurityPrefs(loadSecurityPrefs());
    };

    const onStorage = () => refreshPrefs();

    window.addEventListener("storage", onStorage);
    window.addEventListener(SECURITY_PREFS_UPDATED_EVENT, refreshPrefs as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SECURITY_PREFS_UPDATED_EVENT, refreshPrefs as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    if (!securityPrefs.appLock) {
      setLocked(false);
      sessionStorage.setItem(UNLOCKED_KEY, "1");
      return;
    }

    const unlocked = sessionStorage.getItem(UNLOCKED_KEY) === "1";
    if (!unlocked) {
      setLocked(true);
    }
  }, [token, securityPrefs.appLock]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!securityPrefs.appLock) return;

      if (document.visibilityState === "hidden") {
        sessionStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
        return;
      }

      if (document.visibilityState === "visible") {
        const hiddenAtRaw = sessionStorage.getItem(HIDDEN_AT_KEY);
        if (!hiddenAtRaw) return;

        const hiddenAt = Number(hiddenAtRaw);
        sessionStorage.removeItem(HIDDEN_AT_KEY);
        if (!Number.isFinite(hiddenAt)) return;

        const elapsed = Date.now() - hiddenAt;
        const timeoutMs = getAutoLockTimeoutMs(securityPrefs.autoLock);
        if (timeoutMs === 0 || elapsed >= timeoutMs) {
          setLocked(true);
          sessionStorage.removeItem(UNLOCKED_KEY);
          setUnlockError("");
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [securityPrefs.appLock, securityPrefs.autoLock]);

  useEffect(() => {
    let cancelled = false;

    const detectBiometric = async () => {
      if (!securityPrefs.biometric) {
        if (!cancelled) setBiometricAvailable(false);
        return;
      }

      if (typeof window === "undefined" || !("PublicKeyCredential" in window)) {
        if (!cancelled) setBiometricAvailable(false);
        return;
      }

      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!cancelled) setBiometricAvailable(available);
      } catch {
        if (!cancelled) setBiometricAvailable(false);
      }
    };

    detectBiometric();
    return () => {
      cancelled = true;
    };
  }, [securityPrefs.biometric]);

  useEffect(() => {
    if (!token) return;

    const runAlerts = () => {
      void evaluateAlertNotifications().catch(() => undefined);
    };

    runAlerts();
    const intervalId = window.setInterval(runAlerts, 60_000);
    const onFocus = () => runAlerts();
    const onStoreUpdate = () => emitStoreUpdate();

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStoreUpdate);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStoreUpdate);
    };
  }, [token]);

  const unlockManually = () => {
    setLocked(false);
    setUnlockError("");
    setPinInput("");
    setPinError("");
    sessionStorage.setItem(UNLOCKED_KEY, "1");
  };

  const unlockWithPin = async () => {
    if (pinInput.length < 4) {
      setPinError("Enter at least 4 digits.");
      return;
    }
    setPinVerifying(true);
    try {
      const ok = await verifyPin(pinInput);
      if (ok) {
        unlockManually();
      } else {
        setPinError("Incorrect PIN. Try again.");
        setPinInput("");
      }
    } finally {
      setPinVerifying(false);
    }
  };

  const unlockWithBiometric = async () => {
    if (!biometricAvailable) {
      setUnlockError("Biometric unlock is not available on this device/browser.");
      return;
    }

    try {
      setUnlockingBiometric(true);
      setUnlockError("");

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      await navigator.credentials.get({
        mediation: "optional",
        publicKey: {
          challenge,
          timeout: 60_000,
          userVerification: "required",
        },
      });

      unlockManually();
    } catch {
      setUnlockError("Biometric verification failed. You can still unlock manually.");
    } finally {
      setUnlockingBiometric(false);
    }
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (locked) {
    const pinRequired = hasPinSet();
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Lock size={24} className="text-primary" />
            </div>
            <p className="text-lg font-bold">App Locked</p>
            <p className="text-sm text-muted-foreground">
              {pinRequired ? "Enter your PIN to continue." : "Unlock to continue using the app."}
            </p>
          </div>

          {/* Biometric */}
          {securityPrefs.biometric && biometricAvailable && (
            <button
              onClick={unlockWithBiometric}
              disabled={unlockingBiometric}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-60"
            >
              {unlockingBiometric ? "Verifying biometric..." : "Unlock with Biometrics"}
            </button>
          )}

          {/* PIN entry */}
          {pinRequired && (
            <div className="space-y-3">
              {/* Dot indicators */}
              <div className="flex justify-center gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <span
                    key={i}
                    className={`block w-3 h-3 rounded-full border-2 transition-all duration-150 ${
                      i < pinInput.length
                        ? "bg-primary border-primary scale-110"
                        : "border-muted-foreground/40"
                    }`}
                  />
                ))}
              </div>

              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinInput}
                autoFocus
                autoComplete="off"
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setPinError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pinInput.length >= 4) unlockWithPin();
                }}
                className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-center text-xl tracking-[0.6em] font-mono focus:outline-none focus:ring-2 focus:ring-primary placeholder:tracking-normal placeholder:text-muted-foreground/40"
                placeholder="Enter PIN"
              />

              <button
                onClick={unlockWithPin}
                disabled={pinVerifying || pinInput.length < 4}
                className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {pinVerifying ? "Verifying..." : "Unlock"}
              </button>

              {pinError && <p className="text-xs text-destructive text-center">{pinError}</p>}

              <button
                onClick={() => { tokenStorage.clear(); window.location.replace("/login"); }}
                className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors py-1"
              >
                Forgot PIN? Sign out
              </button>
            </div>
          )}

          {/* No PIN — manual unlock */}
          {!pinRequired && (
            <button
              onClick={unlockManually}
              className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold"
            >
              Unlock App
            </button>
          )}

          {unlockError && <p className="text-xs text-destructive text-center">{unlockError}</p>}
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh>
      <Outlet />
    </PullToRefresh>
  );
};

export default ProtectedRoute;
