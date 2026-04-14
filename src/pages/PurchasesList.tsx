import { useState } from "react";
import { Search, Printer, Trash2, RotateCcw, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Purchase } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PurchasesList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>(store.getPurchases());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showInvoice, setShowInvoice] = useState<Purchase | null>(null);

  const filtered = purchases.filter(p =>
    p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    p.invoiceNo.toLowerCase().includes(search.toLowerCase())
  );

  const deletePurchase = (id: string) => {
    const purchase = purchases.find(p => p.id === id);
    if (purchase?.hasReturn) {
      toast({ title: "Cannot delete returned purchase", variant: "destructive" });
      return;
    }
    const updated = purchases.filter(p => p.id !== id);
    setPurchases(updated);
    store.savePurchases(updated);
    toast({ title: "Purchase deleted" });
  };

  const deleteSelected = () => {
    const updated = purchases.filter(p => !selected.has(p.id) || p.hasReturn);
    setPurchases(updated);
    store.savePurchases(updated);
    setSelected(new Set());
    toast({ title: `${purchases.length - updated.length} deleted` });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Purchase List" rightAction={
        <button onClick={() => navigate("/add-purchase")} className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Plus size={16} className="text-primary-foreground" />
        </button>
      } />
      <div className="px-4 py-3 space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
        </div>
        {selected.size > 0 && (
          <button onClick={deleteSelected} className="text-xs bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg font-semibold">Delete Selected ({selected.size})</button>
        )}
      </div>
      <div className="px-4 space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => {
                const next = new Set(selected);
                next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                setSelected(next);
              }} className="mt-1 accent-primary" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold text-sm">{p.supplierName}</p>
                    <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.status === "Paid" ? "bg-success/10 text-success" : p.status === "Due" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"}`}>{p.status}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-muted-foreground">{p.invoiceNo}</p>
                    <p className="text-[11px] text-muted-foreground">{p.date}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-4">
                    <span className="text-xs text-muted-foreground">Total: <strong>$ {p.total.toLocaleString()}</strong></span>
                    {p.due > 0 && <span className="text-xs text-warning">Due: <strong>$ {p.due.toLocaleString()}</strong></span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowInvoice(p)} className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center text-info"><Printer size={14} /></button>
                    {!p.hasReturn && (
                      <>
                        <button onClick={() => navigate(`/purchase-return/${p.id}`)} className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning"><RotateCcw size={14} /></button>
                        <button onClick={() => deletePurchase(p.id)} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">No purchases found</p>}
      </div>

      <Dialog open={!!showInvoice} onOpenChange={() => setShowInvoice(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invoice {showInvoice?.invoiceNo}</DialogTitle></DialogHeader>
          {showInvoice && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Supplier</span><span className="font-semibold">{showInvoice.supplierName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{showInvoice.date}</span></div>
              <div className="border-t border-border pt-2 space-y-1">
                {showInvoice.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs"><span>{item.name} × {item.quantity}</span><span>$ {(item.quantity * item.unitPrice).toLocaleString()}</span></div>
                ))}
              </div>
              <div className="border-t border-border pt-2 space-y-1">
                <div className="flex justify-between font-bold"><span>Total</span><span>$ {showInvoice.total.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Paid</span><span className="text-success">$ {showInvoice.paid.toLocaleString()}</span></div>
                {showInvoice.due > 0 && <div className="flex justify-between"><span>Due</span><span className="text-warning">$ {showInvoice.due.toLocaleString()}</span></div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default PurchasesList;
