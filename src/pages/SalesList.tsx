import { useState } from "react";
import { Search, Printer, Edit, Trash2, RotateCcw, MoreVertical, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Sale } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SalesList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>(store.getSales());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showInvoice, setShowInvoice] = useState<Sale | null>(null);

  const filtered = sales.filter(s =>
    s.customerName.toLowerCase().includes(search.toLowerCase()) ||
    s.invoiceNo.toLowerCase().includes(search.toLowerCase())
  );

  const deleteSale = (id: string) => {
    const sale = sales.find(s => s.id === id);
    if (sale?.hasReturn) {
      toast({ title: "Cannot delete returned sale", variant: "destructive" });
      return;
    }
    const updated = sales.filter(s => s.id !== id);
    setSales(updated);
    store.saveSales(updated);
    setActiveMenu(null);
    toast({ title: "Sale deleted" });
  };

  const deleteSelected = () => {
    const updated = sales.filter(s => !selected.has(s.id) || s.hasReturn);
    setSales(updated);
    store.saveSales(updated);
    setSelected(new Set());
    toast({ title: `${sales.length - updated.length} sales deleted` });
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Sales List" rightAction={
        <button onClick={() => navigate("/add-sale")} className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Plus size={16} className="text-primary-foreground" />
        </button>
      } />

      {/* Search & Actions */}
      <div className="px-4 py-3 space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or invoice..." className="pl-9" />
        </div>
        {selected.size > 0 && (
          <button onClick={deleteSelected} className="text-xs bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg font-semibold">
            Delete Selected ({selected.size})
          </button>
        )}
      </div>

      <div className="px-4 space-y-2">
        {filtered.map((s) => (
          <div key={s.id} className="bg-card rounded-xl p-4 shadow-sm border border-border relative">
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="mt-1 accent-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{s.customerName}</p>
                    <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      s.status === "Paid" ? "bg-success/10 text-success" :
                      s.status === "Due" ? "bg-warning/10 text-warning" :
                      "bg-info/10 text-info"
                    }`}>{s.status}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-muted-foreground">{s.invoiceNo}</p>
                    <p className="text-[11px] text-muted-foreground">{s.date}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-4">
                    <span className="text-xs text-muted-foreground">Total: <strong>$ {s.total.toLocaleString()}</strong></span>
                    {s.due > 0 && <span className="text-xs text-warning">Due: <strong>$ {s.due.toLocaleString()}</strong></span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowInvoice(s)} className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center text-info"><Printer size={14} /></button>
                    {!s.hasReturn && (
                      <>
                        <button onClick={() => navigate(`/sale-return/${s.id}`)} className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning"><RotateCcw size={14} /></button>
                        <button onClick={() => deleteSale(s.id)} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">No sales found</p>
        )}
      </div>

      {/* Invoice Preview */}
      <Dialog open={!!showInvoice} onOpenChange={() => setShowInvoice(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invoice {showInvoice?.invoiceNo}</DialogTitle></DialogHeader>
          {showInvoice && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-semibold">{showInvoice.customerName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{showInvoice.date}</span></div>
              <div className="border-t border-border pt-2 space-y-1">
                {showInvoice.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{item.name} × {item.quantity}</span>
                    <span>$ {(item.quantity * item.unitPrice).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2 space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>$ {showInvoice.subtotal.toLocaleString()}</span></div>
                {showInvoice.vat > 0 && <div className="flex justify-between"><span>VAT</span><span>$ {showInvoice.vat.toLocaleString()}</span></div>}
                {showInvoice.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-$ {showInvoice.discount.toLocaleString()}</span></div>}
                <div className="flex justify-between font-bold text-base border-t border-border pt-1"><span>Total</span><span>$ {showInvoice.total.toLocaleString()}</span></div>
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

export default SalesList;
