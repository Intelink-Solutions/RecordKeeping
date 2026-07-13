import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Purchase } from "@/lib/store";
import { Search, Trash2, Eye, RotateCcw, MoreVertical, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InvoiceModal from "@/components/InvoiceModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAppContext } from "@/hooks/use-app-context";
import { formatCurrency } from "@/lib/currency";
import { useDebounce } from "@/hooks/use-debounce";
import { apiDeletePurchase } from "@/lib/api";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { useScrollRefresh } from "@/hooks/use-scroll-refresh";
import { useLiveData, showSaved } from "@/hooks/use-live-data";

const PurchaseList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canManageData, roleLabel } = useAppContext();
  const allPurchases = useLiveData(() => store.getPurchases());
  useScrollRefresh(() => syncLiveBusinessData().catch(() => {}));
  const effectiveBranchId = store.getEffectiveBranchId();
  const purchases = effectiveBranchId
    ? allPurchases.filter((p) => !p.branchId || p.branchId === effectiveBranchId)
    : allPurchases;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [printPurchase, setPrintPurchase] = useState<Purchase | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmMulti, setConfirmMulti] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filtered = purchases.filter(p =>
    p.supplierName.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.invoiceNo.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const requestDelete = (id: string) => {
    const p = purchases.find(x => x.id === id);
    if (p?.returned) { toast({ title: "Cannot delete a returned purchase", variant: "destructive" }); return; }
    setMenuId(null);
    setConfirmId(id);
  };

  const executeSingleDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await apiDeletePurchase(confirmId);
      await syncLiveBusinessData();
      showSaved("Purchase deleted");
    } catch (err) {
      await syncLiveBusinessData();
      const stillExists = store.getPurchases().some(p => p.id === confirmId);
      if (!stillExists) {
        showSaved("Purchase deleted");
      } else {
        toast({ title: "Error", description: err instanceof Error ? err.message : "Delete failed", variant: "destructive" });
      }
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  const executeMultiDelete = async () => {
    const toDelete = selectedIds.filter(id => !purchases.find(p => p.id === id)?.returned);
    setDeleting(true);
    try {
      for (const id of toDelete) {
        try { await apiDeletePurchase(id); } catch { /* ignore per-item; sync confirms */ }
      }
      await syncLiveBusinessData();
      setSelectedIds([]);
      showSaved(`${toDelete.length} purchases deleted`);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Delete failed", variant: "destructive" });
    } finally {
      setDeleting(false);
      setConfirmMulti(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="Purchase List" rightAction={canManageData && selectedIds.length > 0 ? (
        <button onClick={() => setConfirmMulti(true)} className="text-destructive text-sm font-semibold">
          Delete ({selectedIds.length})
        </button>
      ) : undefined} />
      <div className="px-4 py-3">
        {!canManageData && (
          <div className="mb-3 text-xs rounded-lg border border-warning/30 bg-warning/10 text-warning px-3 py-2">
            {roleLabel} access: view-only mode
          </div>
        )}
        <div className="relative mb-3"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-card rounded-xl p-4 shadow-sm border border-border cursor-pointer active:bg-accent/50 transition-colors" onClick={() => { setViewPurchase(p); setMenuId(null); }}>
              <div className="flex items-start gap-3">
                <div onClick={(e) => e.stopPropagation()}>
                  {canManageData ? (
                    <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => setSelectedIds(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])} className="mt-1 accent-primary" />
                  ) : (
                    <span className="w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <div>
                      <p className="font-semibold text-sm">{p.supplierName}</p>
                      <span className={`inline-block mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${p.status === "Paid" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{p.status}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">#{p.invoiceNo}</p>
                      <p className="text-xs text-muted-foreground">{p.date}</p>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-muted-foreground">Total: {formatCurrency(p.total)}</p>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setMenuId(menuId === p.id ? null : p.id)} className="p-1"><MoreVertical size={18} className="text-muted-foreground" /></button>
                      {menuId === p.id && (
                        <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[140px]">
                          <button onClick={() => { setViewPurchase(p); setMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent"><Eye size={14} /> View</button>
                          <button onClick={() => { setPrintPurchase(p); setMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent"><Printer size={14} /> Print</button>
                          {canManageData && !p.returned && <>
                            <button onClick={() => navigate(`/purchase-return/${p.id}`)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-warning"><RotateCcw size={14} /> Return</button>
                            <button onClick={() => requestDelete(p.id)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-destructive"><Trash2 size={14} /> Delete</button>
                          </>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No purchases found</p>}
        </div>
      </div>

      <Dialog open={!!viewPurchase} onOpenChange={() => setViewPurchase(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invoice #{viewPurchase?.invoiceNo}</DialogTitle></DialogHeader>
          {viewPurchase && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Supplier</span><span className="font-semibold">{viewPurchase.supplierName}</span></div>
              <div className="border-t pt-2 space-y-1">{viewPurchase.items.map((item, i) => <div key={i} className="flex justify-between text-xs"><span>{item.name} × {item.quantity}</span><span>{formatCurrency(item.unitPrice * item.quantity, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>)}</div>
              <div className="border-t pt-2"><div className="flex justify-between font-bold text-primary"><span>Total</span><span>{formatCurrency(viewPurchase.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {printPurchase && (
        <InvoiceModal
          open={!!printPurchase}
          onClose={() => setPrintPurchase(null)}
          data={{
            invoiceNo: printPurchase.invoiceNo, date: printPurchase.date,
            supplierName: printPurchase.supplierName,
            items: printPurchase.items.map(i => ({ ...i, discount: 0 })),
            subtotal: printPurchase.subtotal, discount: printPurchase.discount,
            total: printPurchase.total, paid: printPurchase.paid, due: printPurchase.due,
            type: "Purchase",
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Delete Purchase"
        message="Are you sure you want to delete this purchase? This action cannot be undone."
        onConfirm={executeSingleDelete}
        onCancel={() => setConfirmId(null)}
        loading={deleting}
      />
      <ConfirmDialog
        open={confirmMulti}
        title={`Delete ${selectedIds.length} Purchases`}
        message={`Are you sure you want to delete ${selectedIds.length} selected purchases? This cannot be undone.`}
        onConfirm={executeMultiDelete}
        onCancel={() => setConfirmMulti(false)}
        loading={deleting}
      />

      {canManageData && (
        <button onClick={() => navigate("/add-purchase")} className="fixed bottom-24 right-5 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-xl font-semibold text-sm">+ New Purchase</button>
      )}
      <BottomNav />
    </div>
  );
};

export default PurchaseList;
