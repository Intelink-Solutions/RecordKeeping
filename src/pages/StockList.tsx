import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { Search } from "lucide-react";
import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";
import { useLiveData } from "@/hooks/use-live-data";
import { getImageUrl } from "@/lib/image-utils";

const StockList = () => {
  const products = useLiveData(() => store.getProducts());
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [view, setView] = useState("all");

  const filtered = products.filter(p => {
    const matchSearch = !debouncedSearch || p.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    if (view === "low") return matchSearch && p.stock <= p.alertQty;
    if (view === "expired") return matchSearch && p.expiryDate && new Date(p.expiryDate) < new Date();
    return matchSearch;
  });

  const totalQty = filtered.reduce((s, p) => s + p.stock, 0);
  const totalValue = filtered.reduce((s, p) => s + p.costPrice * p.stock, 0);

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="Stock" />
      <div className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-xs text-muted-foreground">Total Quantity</p>
            <p className="font-bold text-lg">{totalQty.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-xs text-muted-foreground">Stock Value</p>
            <p className="font-bold text-lg">{formatCurrency(totalValue)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={view} onValueChange={setView}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="low">Low Stock</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent>
          </Select>
        </div>
        {filtered.map(p => (
          <div key={p.id} className="bg-card rounded-xl p-3.5 border border-border flex items-center gap-3">
            {(() => { const img = getImageUrl(p.image); return img ? <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">{p.name.slice(0,2).toUpperCase()}</div>; })()}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.code}</p>
            </div>
            <div className="text-right">
              <p className={`font-bold text-sm ${p.stock <= p.alertQty ? "text-destructive" : ""}`}>{p.stock}</p>
              <p className="text-[11px] text-muted-foreground">{formatCurrency(p.costPrice * p.stock)}</p>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
};

export default StockList;
