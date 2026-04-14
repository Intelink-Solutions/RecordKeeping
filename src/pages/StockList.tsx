import { useState } from "react";
import { Search, AlertTriangle, Package } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { Input } from "@/components/ui/input";

type View = "all" | "low" | "expired";

const StockList = () => {
  const products = store.getProducts();
  const categories = store.getCategories();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("all");

  const today = new Date().toISOString().split("T")[0];
  const totalQty = products.reduce((s, p) => s + p.stock, 0);
  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const lowStockProducts = products.filter(p => p.stock <= p.alertQty);
  const expiredProducts = products.filter(p => p.expiryDate && p.expiryDate < today);

  const displayProducts = view === "low" ? lowStockProducts : view === "expired" ? expiredProducts : products;
  const filtered = displayProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Stock List" />

      <div className="px-4 py-3 grid grid-cols-2 gap-2">
        <div className="bg-primary/10 rounded-xl p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Total Quantity</p>
          <p className="font-bold text-lg text-primary">{totalQty.toLocaleString()}</p>
        </div>
        <div className="bg-success/10 rounded-xl p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Stock Value</p>
          <p className="font-bold text-lg text-success">$ {totalValue.toLocaleString()}</p>
        </div>
      </div>

      <div className="px-4 flex gap-2 mb-3">
        {([["all", "All Stock"], ["low", "Low Stock"], ["expired", "Expired"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setView(key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold ${view === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 mb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
        </div>
      </div>

      <div className="px-4 space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.stock <= p.alertQty ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              {p.stock <= p.alertQty ? <AlertTriangle size={18} /> : <Package size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.code} • {categories.find(c => c.id === p.categoryId)?.name || "-"}</p>
            </div>
            <div className="text-right">
              <p className={`font-bold text-sm ${p.stock <= p.alertQty ? "text-destructive" : ""}`}>{p.stock}</p>
              <p className="text-[11px] text-muted-foreground">$ {(p.price * p.stock).toLocaleString()}</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">No products found</p>}
      </div>
      <BottomNav />
    </div>
  );
};

export default StockList;
