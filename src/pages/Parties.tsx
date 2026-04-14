import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Users, UserCheck, ChevronRight } from "lucide-react";

const Parties = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Parties" />
      <div className="px-4 py-4 space-y-3">
        <button onClick={() => navigate("/customers")} className="w-full bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3 active:scale-[0.98] transition-transform">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Users size={20} /></div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-sm">Customers</p>
            <p className="text-[11px] text-muted-foreground">Manage your customers</p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>
        <button onClick={() => navigate("/suppliers")} className="w-full bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3 active:scale-[0.98] transition-transform">
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center text-info"><UserCheck size={20} /></div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-sm">Suppliers</p>
            <p className="text-[11px] text-muted-foreground">Manage your suppliers</p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default Parties;
