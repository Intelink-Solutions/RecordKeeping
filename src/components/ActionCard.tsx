import { ChevronRight, LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ActionCardProps {
  icon: LucideIcon;
  label: string;
  path: string;
  color: string;
}

/** Larger, color-tinted "primary action" card — used for Sales/Purchase
 * quick actions, distinct from the plain MenuCard grid used elsewhere. */
const ActionCard = ({ icon: Icon, label, path, color }: ActionCardProps) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(path)}
      className="flex flex-col items-start gap-3 rounded-2xl p-3.5 text-left active:scale-[0.97] transition-transform"
      style={{ backgroundColor: `${color}14` }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${color}22`, color }}
      >
        <Icon size={19} />
      </div>
      <div className="flex items-center justify-between w-full gap-1">
        <span className="text-[12.5px] font-bold text-foreground leading-tight">{label}</span>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: color, color: "#fff" }}
        >
          <ChevronRight size={13} strokeWidth={3} />
        </div>
      </div>
    </button>
  );
};

export default ActionCard;
