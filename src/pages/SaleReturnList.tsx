import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";

const SaleReturnList = () => {
  const returns = store.getSaleReturns();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const filtered = returns.filter(r =>
    r.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()) || r.invoiceNo.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="Sale Returns" />
      <div className="px-4 py-3">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex justify-between mb-1">
                <p className="font-semibold text-sm">{r.customerName}</p>
                <p className="text-xs text-muted-foreground">#{r.invoiceNo}</p>
              </div>
              <p className="text-xs text-muted-foreground">{r.date}</p>
              <div className="mt-2 flex justify-between">
                <p className="text-xs text-muted-foreground">{r.items.length} item(s) returned</p>
                <p className="font-bold text-sm text-destructive">{formatCurrency(r.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No returns found</p>}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default SaleReturnList;
