import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MenuCardProps {
  icon: LucideIcon;
  label: string;
  path: string;
  color: string;
}

const MenuCard = ({ icon: Icon, label, path, color }: MenuCardProps) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(path)}
      className="flex flex-col items-center gap-2 bg-card rounded-xl p-3 shadow-sm border border-border hover:shadow-md transition-shadow active:scale-[0.97]"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: color + "18", color }}
      >
        <Icon size={20} />
      </div>
      <span className="text-[11px] font-semibold text-foreground text-center leading-tight">{label}</span>
    </button>
  );
};

export default MenuCard;
