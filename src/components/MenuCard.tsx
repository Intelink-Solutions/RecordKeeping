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
      className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-shadow active:scale-[0.98]"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: color + "18", color }}
      >
        <Icon size={20} />
      </div>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </button>
  );
};

export default MenuCard;
