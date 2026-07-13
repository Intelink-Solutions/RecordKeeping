import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Sale, SaleItem, paymentStatusLabel } from "@/lib/store";
import {
  Search, Trash2, Pencil, RotateCcw, MoreVertical,
  ImageDown, Eye, Minus, Plus, X, CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InvoiceModal from "@/components/InvoiceModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import PayDueDialog, { PayDueParty } from "@/components/PayDueDialog";
import { useAppContext } from "@/hooks/use-app-context";
import { formatCurrency } from "@/lib/currency";
import { useDebounce } from "@/hooks/use-debounce";
import { apiDeleteSale, apiUpdateSale } from "@/lib/api";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { useScrollRefresh } from "@/hooks/use-scroll-refresh";
import { useLiveData, showSaved } from "@/hooks/use-live-data";

const SalesList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canManageData, roleLabel } = useAppContext();
  const allSales = useLiveData(() => store.getSales());
  const allProducts = useLiveData(() => store.getProducts());
  useScrollRefresh(() => syncLiveBusinessData().catch(() => {}));
  const effectiveBranchId = store.getEffectiveBranchId();
  // Show only this branch's sales when a branch is active (or staff is assigned to a branch)
  const sales = effectiveBranchId
    ? allSales.filter((s) => !s.branchId || s.branchId === effectiveBranchId)
    : allSales;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuSaleId, setMenuSaleId] = useState<string | null>(null);
  const [invoiceSale, setInvoiceSale] = useState<Sale | null>(null);
  const customers = useLiveData(() => store.getCustomers());

  // ── Pay customer due state ───────────────────────────────────────────────────
  const [duePickerOpen, setDuePickerOpen] = useState(false);
  const [dueSearch, setDueSearch] = useState("");
  const [payParty, setPayParty] = useState<PayDueParty | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const dueCustomers = customers.filter(
    (c) => c.due > 0 && c.name.toLowerCase().includes(dueSearch.toLowerCase())
  );
  const openPayFor = (c: { id: string; name: string; due: number }) => {
    setPayParty({ id: c.id, name: c.name, due: c.due, source: "customer" });
    setDuePickerOpen(false);
    setPayDialogOpen(true);
  };

  // ── Confirm delete state ─────────────────────────────────────────────────────
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmMulti, setConfirmMulti] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Edit state ───────────────────────────────────────────────────────────────
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [editItems, setEditItems] = useState<SaleItem[]>([]);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editReceived, setEditReceived] = useState(0);
  const [editSaving, setEditSaving] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const filtered = sales.filter(
    (s) =>
      s.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.invoiceNo.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // ── Edit helpers ─────────────────────────────────────────────────────────────
  const openEdit = (s: Sale) => {
    setEditSale(s);
    setEditItems(s.items.map((it) => ({ ...it })));
    setEditDiscount(s.discount);
    setEditReceived(s.paid);
    setMenuSaleId(null);
  };

  const editSubtotal = editItems.reduce(
    (acc, it) => acc + it.unitPrice * it.quantity - (it.discount ?? 0),
    0
  );
  const editVat = editSale ? editSubtotal * ((editSale.vatPercent ?? 0) / 100) : 0;
  const editTotal = Math.max(0, editSubtotal + editVat - editDiscount);
  const editPaid = Math.min(editReceived, editTotal);
  const editDue = Math.max(0, editTotal - editPaid);

  const setItemQty = (idx: number, qty: number) =>
    setEditItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, qty) } : it))
    );

  const removeItem = (idx: number) =>
    setEditItems((prev) => prev.filter((_, i) => i !== idx));

  const addProductToEdit = (pid: string) => {
    const p = allProducts.find((pr) => pr.id === pid);
    if (!p) return;
    setEditItems((prev) => {
      const existing = prev.findIndex((it) => it.productId === pid);
      if (existing >= 0) {
        return prev.map((it, i) =>
          i === existing ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        { productId: p.id, name: p.name, quantity: 1, unitPrice: p.retailPrice, discount: 0, stockId: p.stockId },
      ];
    });
    setShowProductPicker(false);
    setProductSearch("");
  };

  const saveEdit = async () => {
    if (!editSale || editItems.length === 0) {
      toast({ title: "Add at least one product", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    try {
      const apiProducts = editItems.map((item) => {
        const product = allProducts.find((p) => p.id === item.productId);
        // Prefer stockId captured from the original sale detail row; fall back to
        // the product store's first-stock (for newly-added products).
        const stockId = item.stockId ?? product?.stockId ?? "";
        return {
          product_id: item.productId,
          stock_id: stockId,
          quantities: item.quantity,
          price: item.unitPrice,
          discount: item.discount ?? 0,
          product_name: item.name,
        };
      });

      const partyId =
        editSale.customerId && editSale.customerId !== "0"
          ? editSale.customerId
          : undefined;

      await apiUpdateSale(editSale.id, {
        party_id: partyId,
        saleDate: editSale.date,
        products: apiProducts,
        payments: editPaid > 0 ? [{ type: "cash", amount: editPaid }] : [],
        discountAmount: editDiscount,
        totalAmount: editTotal,
        paidAmount: editPaid,
        dueAmount: editDue,
      });
      await syncLiveBusinessData();
      setEditSale(null);
      showSaved("Sale updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const confirmDelete = (id: string) => {
    const sale = sales.find((s) => s.id === id);
    if (sale?.returned) {
      toast({ title: "Cannot delete a returned sale", variant: "destructive" });
      return;
    }
    setMenuSaleId(null);
    setConfirmId(id);
  };

  const confirmDeleteMulti = () => {
    setMenuSaleId(null);
    setConfirmMulti(true);
  };

  const executeSingleDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await apiDeleteSale(confirmId);
      await syncLiveBusinessData();
      showSaved("Sale deleted");
    } catch (err) {
      // Backend sometimes returns an error (e.g. stock update failure) even
      // when the sale was actually deleted. Sync and verify.
      await syncLiveBusinessData();
      const stillExists = store.getSales().some((s) => s.id === confirmId);
      if (!stillExists) {
        showSaved("Sale deleted");
      } else {
        toast({ title: "Error", description: err instanceof Error ? err.message : "Delete failed", variant: "destructive" });
      }
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  const executeMultiDelete = async () => {
    const toDelete = sales.filter((s) => selectedIds.includes(s.id) && !s.returned);
    setDeleting(true);
    try {
      for (const s of toDelete) {
        try {
          await apiDeleteSale(s.id);
        } catch {
          // ignore per-item errors; sync will confirm final state
        }
      }
      await syncLiveBusinessData();
      setSelectedIds([]);
      showSaved(`${toDelete.length} sales deleted`);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Delete failed", variant: "destructive" });
    } finally {
      setDeleting(false);
      setConfirmMulti(false);
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const filteredProducts = allProducts.filter(
    (p) =>
      !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader
        title="Sales List"
        rightAction={
          canManageData && selectedIds.length > 0 ? (
            <button onClick={confirmDeleteMulti} className="text-destructive text-sm font-semibold">
              Delete ({selectedIds.length})
            </button>
          ) : canManageData ? (
            <button
              onClick={() => { setDueSearch(""); setDuePickerOpen(true); }}
              className="flex items-center gap-1 text-primary text-sm font-semibold"
            >
              <CreditCard size={15} />
              Pay Debt
            </button>
          ) : undefined
        }
      />

      <div className="px-4 py-3">
        {!canManageData && (
          <div className="mb-3 text-xs rounded-lg border border-warning/30 bg-warning/10 text-warning px-3 py-2">
            {roleLabel} access: view-only mode
          </div>
        )}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-card rounded-xl p-4 shadow-sm border border-border cursor-pointer active:bg-accent/50 transition-colors"
              onClick={() => { setInvoiceSale(s); setMenuSaleId(null); }}
            >
              <div className="flex items-start gap-3">
                <div onClick={(e) => e.stopPropagation()}>
                  {canManageData ? (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="mt-1 accent-primary"
                    />
                  ) : (
                    <span className="w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-semibold text-sm">{s.customerName}</p>
                      <span className={`inline-block mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        s.status === "Paid" ? "bg-success/15 text-success"
                          : s.status === "Due" ? "bg-destructive/15 text-destructive"
                          : "bg-warning/15 text-warning"
                      }`}>
                        {paymentStatusLabel(s.status)}
                      </span>
                      {s.returned && (
                        <span className="ml-1 inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Returned
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">#{s.invoiceNo}</p>
                      <p className="text-xs text-muted-foreground">{s.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Total: {formatCurrency(s.total)}</p>
                      {s.due > 0 && <p className="text-xs text-destructive font-semibold">Debt: {formatCurrency(s.due)}</p>}
                      <p className="text-xs font-semibold text-primary">Profit: {formatCurrency(s.profit)}</p>
                    </div>

                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setMenuSaleId(menuSaleId === s.id ? null : s.id)} className="p-1">
                        <MoreVertical size={18} className="text-muted-foreground" />
                      </button>
                      {menuSaleId === s.id && (
                        <div className="absolute right-0 top-8 bg-card border border-border rounded-xl shadow-xl z-20 min-w-[160px] py-1">
                          <MenuBtn icon={<Eye size={14} />} label="Invoice Preview"
                            onClick={() => { setInvoiceSale(s); setMenuSaleId(null); }} />
                          <MenuBtn icon={<ImageDown size={14} />} label="Export Image"
                            onClick={() => { setInvoiceSale(s); setMenuSaleId(null); }} />
                          {canManageData && !s.returned && (
                            <>
                              <MenuBtn icon={<Pencil size={14} />} label="Edit Sale" onClick={() => openEdit(s)} />
                              <MenuBtn icon={<RotateCcw size={14} />} label="Sale Return" color="text-warning"
                                onClick={() => navigate(`/sale-return/${s.id}`)} />
                              <MenuBtn icon={<Trash2 size={14} />} label="Delete" color="text-destructive"
                                onClick={() => confirmDelete(s.id)} />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No sales found</p>
          )}
        </div>
      </div>

      {/* Invoice Preview */}
      {invoiceSale && (
        <InvoiceModal
          open={!!invoiceSale}
          onClose={() => setInvoiceSale(null)}
          data={{
            invoiceNo: invoiceSale.invoiceNo,
            date: invoiceSale.date,
            customerName: invoiceSale.customerName,
            phone: invoiceSale.customerPhone,
            items: invoiceSale.items,
            subtotal: invoiceSale.subtotal,
            vat: invoiceSale.vat,
            vatPercent: invoiceSale.vatPercent,
            discount: invoiceSale.discount,
            total: invoiceSale.total,
            paid: invoiceSale.paid,
            due: invoiceSale.due,
            change: invoiceSale.change,
            type: "Sale",
          }}
        />
      )}

      {/* ── Edit Sale Modal ──────────────────────────────────────────────────── */}
      <Dialog open={!!editSale} onOpenChange={() => setEditSale(null)}>
        <DialogContent className="max-w-sm max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
            <DialogTitle className="text-base">Edit Sale — #{editSale?.invoiceNo}</DialogTitle>
            {editSale && (
              <p className="text-xs text-muted-foreground">
                {editSale.customerName} · {editSale.date}
              </p>
            )}
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
            {/* ── Products ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Products</Label>
                <button
                  onClick={() => setShowProductPicker(true)}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  + Add Product
                </button>
              </div>

              <div className="space-y-2">
                {editItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-accent/40 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.unitPrice, { minimumFractionDigits: 2 })} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setItemQty(idx, item.quantity - 1)}
                        className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                      >
                        <Minus size={11} />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => setItemQty(idx, Number(e.target.value))}
                        className="w-9 text-center text-sm font-bold bg-transparent border border-border rounded"
                      />
                      <button
                        onClick={() => setItemQty(idx, item.quantity + 1)}
                        className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                      >
                        <Plus size={11} />
                      </button>
                      <button
                        onClick={() => removeItem(idx)}
                        className="w-6 h-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center ml-1"
                      >
                        <X size={11} />
                      </button>
                    </div>
                    <p className="text-xs font-semibold w-16 text-right shrink-0">
                      {formatCurrency(item.unitPrice * item.quantity, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
                {editItems.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No products — tap + Add Product</p>
                )}
              </div>
            </div>

            {/* ── Discount ── */}
            <div>
              <Label className="text-xs mb-1.5 block">Discount Amount</Label>
              <Input
                type="number"
                min={0}
                value={editDiscount}
                onChange={(e) => setEditDiscount(Number(e.target.value))}
              />
            </div>

            {/* ── Received ── */}
            <div>
              <Label className="text-xs mb-1.5 block">Amount Received</Label>
              <Input
                type="number"
                min={0}
                value={editReceived}
                onChange={(e) => setEditReceived(Number(e.target.value))}
              />
            </div>

            {/* ── Live totals preview ── */}
            <div className="bg-card rounded-xl border border-border p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(editSubtotal, { minimumFractionDigits: 2 })}</span>
              </div>
              {editVat > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>VAT ({editSale?.vatPercent}%)</span>
                  <span>{formatCurrency(editVat, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {editDiscount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="text-destructive">- {formatCurrency(editDiscount, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-border pt-1.5 text-primary">
                <span>Total</span>
                <span>{formatCurrency(editTotal, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-success font-semibold">
                <span>Paid</span>
                <span>{formatCurrency(editPaid, { minimumFractionDigits: 2 })}</span>
              </div>
              {editDue > 0 && (
                <div className="flex justify-between text-destructive font-semibold">
                  <span>Debt</span>
                  <span>{formatCurrency(editDue, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer buttons ── */}
          <div className="px-4 pb-4 pt-2 flex gap-3 border-t border-border shrink-0">
            <button
              onClick={() => setEditSale(null)}
              className="flex-1 bg-muted text-muted-foreground font-semibold py-2.5 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={editSaving || editItems.length === 0}
              className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl disabled:opacity-60"
            >
              {editSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Product picker (for add to edit) ─────────────────────────────────── */}
      <Dialog open={showProductPicker} onOpenChange={setShowProductPicker}>
        <DialogContent className="max-w-sm max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="overflow-y-auto flex-1 space-y-1">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addProductToEdit(p.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.code} · Stock: {p.stock}</p>
                </div>
                <p className="text-sm font-semibold text-primary shrink-0 ml-2">
                  {formatCurrency(p.retailPrice)}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {canManageData && (
        <button
          onClick={() => navigate("/add-sale")}
          className="fixed bottom-24 right-5 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-xl font-semibold text-sm"
        >
          + New Sale
        </button>
      )}

      <Dialog open={duePickerOpen} onOpenChange={setDuePickerOpen}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay Customer Debt</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customer..."
                value={dueSearch}
                onChange={(e) => setDueSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {dueCustomers.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-destructive font-semibold">{formatCurrency(c.due)} due</p>
                  </div>
                  <Button size="sm" onClick={() => openPayFor(c)} className="gap-1 shrink-0">
                    <CreditCard size={14} />
                    Pay
                  </Button>
                </div>
              ))}
              {dueCustomers.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">No customers with an outstanding due</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <PayDueDialog party={payParty} open={payDialogOpen} onOpenChange={setPayDialogOpen} />

      <ConfirmDialog
        open={!!confirmId}
        title="Delete Sale"
        message="Are you sure you want to delete this sale? This action cannot be undone."
        onConfirm={executeSingleDelete}
        onCancel={() => setConfirmId(null)}
        loading={deleting}
      />
      <ConfirmDialog
        open={confirmMulti}
        title={`Delete ${selectedIds.length} Sales`}
        message={`Are you sure you want to delete ${selectedIds.length} selected sales? This cannot be undone.`}
        onConfirm={executeMultiDelete}
        onCancel={() => setConfirmMulti(false)}
        loading={deleting}
      />

      <BottomNav />
    </div>
  );
};

const MenuBtn = ({
  icon, label, onClick, color = "",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-accent transition-colors ${color}`}
  >
    {icon}
    {label}
  </button>
);

export default SalesList;
