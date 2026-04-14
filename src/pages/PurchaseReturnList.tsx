import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const PurchaseReturnList = () => {
  const returns = store.getPurchaseReturns();
  const [search, setSearch] = useState("");
  const filtered = returns.filter(r => r.supplierName.toLowerCase().includes(search.toLowerCase()) || r.invoiceNo.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Purchase Returns" />
      <div className="px-4 py-3">
        <div className="relative mb-3"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex justify-between mb-1"><p className="font-semibold text-sm">{r.supplierName}</p><p className="text-xs text-muted-foreground">#{r.invoiceNo}</p></div>
              <p className="text-xs text-muted-foreground">{r.date}</p>
              <div className="mt-2 flex justify-between"><p className="text-xs text-muted-foreground">{r.items.length} item(s)</p><p className="font-bold text-sm text-destructive">$ {r.total.toFixed(2)}</p></div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No returns found</p>}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default PurchaseReturnList;
