import { useState } from "react";
import { Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { Input } from "@/components/ui/input";

const PurchaseReturnList = () => {
  const returns = store.getPurchaseReturns();
  const [search, setSearch] = useState("");

  const filtered = returns.filter(r =>
    r.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    r.returnInvoiceNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Purchase Returns" />
      <div className="px-4 py-3">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
        </div>
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{r.supplierName}</p>
                  <p className="text-[11px] text-muted-foreground">Original: {r.invoiceNo}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-primary font-bold">{r.returnInvoiceNo}</p>
                  <p className="text-[11px] text-muted-foreground">{r.date}</p>
                </div>
              </div>
              <div className="border-t border-border pt-2 space-y-1">
                {r.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground"><span>{item.name} × {item.quantity}</span><span>$ {(item.quantity * item.unitPrice).toLocaleString()}</span></div>
                ))}
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-border font-bold text-sm"><span>Total</span><span className="text-primary">$ {r.total.toLocaleString()}</span></div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">No purchase returns</p>}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default PurchaseReturnList;
