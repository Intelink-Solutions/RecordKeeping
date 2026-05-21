import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { SHOW_SAVED_EVENT } from "@/hooks/use-live-data";

const SavedOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("Saved successfully!");
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setMessage(detail?.message || "Saved successfully!");
      setVisible(true);
      setFading(false);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
      fadeTimer = setTimeout(() => setFading(true), 1400);
      hideTimer = setTimeout(() => {
        setVisible(false);
        setFading(false);
      }, 2000);
    };

    window.addEventListener(SHOW_SAVED_EVENT, handler);
    return () => {
      window.removeEventListener(SHOW_SAVED_EVENT, handler);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
      style={{
        transition: "opacity 500ms ease",
        opacity: fading ? 0 : 1,
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-3"
        style={{
          animation: "saved-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
          <CheckCircle2
            className="w-10 h-10 text-emerald-500"
            style={{ animation: "saved-check 0.5s ease 0.15s both" }}
          />
        </div>
        <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {message}
        </p>
      </div>

      <style>{`
        @keyframes saved-pop {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes saved-check {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          60% { transform: scale(1.2) rotate(0deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SavedOverlay;
