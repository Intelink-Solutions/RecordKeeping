import { ArrowLeft, GitBranch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { store } from "@/lib/store";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

const PageHeader = ({ title, showBack = true, rightAction }: PageHeaderProps) => {
  const navigate = useNavigate();
  const activeBranchId = store.getActiveBranchId();
  const branches = store.getBranches();
  const activeBranch = branches.find((b) => b.id === activeBranchId);

  return (
    <header
      className="sticky top-0 z-40 safe-top"
      style={{
        background: "linear-gradient(180deg, #111111 0%, #0d0d0d 100%)",
        boxShadow: "0 1px 0 rgba(242,197,0,0.18), 0 4px 20px rgba(0,0,0,0.35)",
      }}
    >
      {/* 3px gold brand stripe — the same accent language as the bottom nav */}
      <div
        className="h-[3px] w-full"
        style={{
          background: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(49 100% 62%) 60%, transparent 100%)",
        }}
      />

      <div className="flex items-center gap-2 px-4 h-14">
        {showBack ? (
          /* Back button — circular touch target */
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 -ml-1 transition-all duration-150"
            style={{ color: "rgba(255,255,255,0.75)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--primary))";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.75)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
        ) : (
          /* Accent pill — brand marker on root/tab pages instead of back arrow */
          <div
            className="shrink-0 w-1 h-7 rounded-full"
            style={{ background: "hsl(var(--primary))", opacity: 0.9 }}
          />
        )}

        {/* Title + branch context */}
        <div className="flex-1 min-w-0">
          <h1
            className="font-bold leading-tight tracking-tight truncate"
            style={{
              color: "#ffffff",
              fontSize: "15px",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h1>

          {/* Active branch indicator — only shown when a branch is selected */}
          {activeBranch && (
            <div className="flex items-center gap-1.5 mt-[3px]">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: "#22c55e",
                  boxShadow: "0 0 4px rgba(34,197,94,0.7)",
                }}
              />
              <GitBranch
                size={9}
                style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }}
              />
              <span
                className="text-[10px] font-medium truncate tracking-wide"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                {activeBranch.name}
              </span>
            </div>
          )}
        </div>

        {/* Right action slot */}
        {rightAction && (
          <div className="shrink-0 flex items-center">{rightAction}</div>
        )}
      </div>
    </header>
  );
};

export default PageHeader;
