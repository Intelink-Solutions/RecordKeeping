import { useState, useMemo } from "react";
import { Minus, Plus, X, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { store, PurchaseItem, Product } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/use-app-context";
import { formatCurrency } from "@/lib/currency";
import { apiCreatePurchase, NetworkDownError } from "@/lib/api";
import { enqueueOfflineOp } from "@/lib/offline-queue";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { showSaved, useLiveData, emitStoreUpdate } from "@/hooks/use-live-data";
import { getImageUrl } from "@/lib/image-utils";

const AddPurchase = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canManageData, roleLabel } = useAppContext();
  const products = useLiveData(() => store.getProducts());
  const suppliers = useLiveData(() => store.getSuppliers());
  const categories = useLiveData(() => store.getCategories());
  const brands = useLiveData(() => store.getBrands());

  const [invoiceNo] = useState(store.getNextPurchaseInvoice());
  const [date] = useState(new Date().toISOString().split("T")[0]);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [showQtyDialog, setShowQtyDialog] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [pendingQty, setPendingQty] = useState(1);
  const [pendingPrice, setPendingPrice] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = !filterCategory || p.categoryId === filterCategory;
      const matchBrand = !filterBrand || p.brandId === filterBrand;
      return matchSearch && matchCat && matchBrand;
    });
  }, [products, searchQuery, filterCategory, filterBrand]);

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total = subtotal - discount;
  const changeAmount = receivedAmount > total ? receivedAmount - total : 0;
  const dueAmount = receivedAmount < total ? total - receivedAmount : 0;

  const selectProduct = (p: Product) => {
    if (items.find(i => i.productId === p.id)) {
      toast({ title: "Already in cart", description: "Adjust the quantity from the cart below instead." });
      setShowPicker(false);
      return;
    }
    setPendingProduct(p);
    setPendingQty(1);
    setPendingPrice(p.costPrice);
    setShowPicker(false);
    setShowQtyDialog(true);
  };

  const confirmAdd = () => {
    if (!pendingProduct) return;
    if (!Number.isFinite(pendingQty) || pendingQty <= 0) {
      toast({ title: "Enter a valid quantity", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(pendingPrice) || pendingPrice <= 0) {
      toast({ title: "Enter a valid purchase price", variant: "destructive" });
      return;
    }
    setItems([...items, { productId: pendingProduct.id, name: pendingProduct.name, quantity: pendingQty, unitPrice: pendingPrice }]);
    setShowQtyDialog(false);
    setPendingProduct(null);
  };

  const updateQty = (idx: number, delta: number) => {
    setItems(items.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!canManageData) {
      toast({ title: "Permission required", description: "You have view-only access", variant: "destructive" });
      return;
    }

    if (!supplierId || items.length === 0) {
      toast({ title: "Please select supplier and add items", variant: "destructive" });
      return;
    }

    setSaving(true);

    const paidAmount = Math.min(receivedAmount, total);
    const apiProducts = items.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        product_id: item.productId,
        quantities: item.quantity,
        productPurchasePrice: item.unitPrice,
        productSalePrice: product?.retailPrice || product?.price || 0,
        productWholeSalePrice: product?.wholesalePrice || 0,
        productDealerPrice: product?.dealerPrice || 0,
        profit_percent: product?.profitMargin || 0,
      };
    });
    const effectiveBranchId = store.getEffectiveBranchId();
    const purchasePayload = {
      party_id: supplierId,
      branch_id: effectiveBranchId ?? null,
      products: apiProducts,
      payments: paidAmount > 0 ? [{ type: "cash", amount: paidAmount }] : [],
      purchaseDate: date,
      totalAmount: total,
      subtotal,
      discountAmount: discount,
      dueAmount,
      paidAmount,
    };

    // ── Instant local save ────────────────────────────────────────────────────
    const supplier = suppliers.find(s => s.id === supplierId);
    const localPurchase = {
      id: store.nextId(), invoiceNo, date,
      branchId: effectiveBranchId || undefined,
      supplierId, supplierName: supplier?.name || "Supplier",
      items, subtotal, discount, total,
      paid: paidAmount, due: dueAmount,
      status: (dueAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Due") as "Paid" | "Due" | "Partial",
      returned: false,
    };
    store.savePurchases([localPurchase, ...store.getPurchases()]);
    emitStoreUpdate();
    showSaved("Purchase saved!");
    setSaving(false);
    navigate("/purchases");

    // ── Background sync ───────────────────────────────────────────────────────
    apiCreatePurchase(purchasePayload)
      .then(() => { syncLiveBusinessData().catch(() => {}); })
      .catch((err) => {
        if (err instanceof NetworkDownError) {
          enqueueOfflineOp("POST", "/purchases", purchasePayload as unknown as Record<string, unknown>);
        } else {
          const msg = err instanceof Error ? err.message : "Sync failed";
          toast({ title: "Purchase sync issue", description: msg, variant: "destructive" });
        }
      });
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title="Create Purchase" />
      <div className="px-4 py-4 space-y-4">
        {!canManageData && (
          <div className="text-xs rounded-lg border border-warning/30 bg-warning/10 text-warning px-3 py-2">
            {roleLabel} access: view-only mode
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground mb-1 block">Invoice No.</label><Input value={invoiceNo} readOnly className="bg-muted" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Date</label><Input type="date" value={date} readOnly className="bg-muted" /></div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Supplier</label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
            <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {items.length > 0 && (
          <div className="bg-card rounded-xl overflow-hidden border border-border">
            <div className="px-4 py-2.5 bg-accent"><span className="text-sm font-semibold">Cart ({items.length})</span></div>
            {items.map((item, idx) => (
              <div key={item.productId} className="px-4 py-3 flex items-center border-b border-border last:border-0">
                {(() => { const img = getImageUrl(products.find(p => p.id === item.productId)?.image); return img ? <img src={img} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 mr-2.5" /> : <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0 mr-2.5">{item.name.slice(0,2).toUpperCase()}</div>; })()}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.quantity * item.unitPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(idx, -1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Minus size={14} /></button>
                  <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(idx, 1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus size={14} /></button>
                  <button onClick={() => removeItem(idx)} className="w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {canManageData && <button onClick={() => setShowPicker(true)} className="w-full py-3 bg-accent text-primary font-semibold rounded-xl border-2 border-dashed border-primary/30">+ Add Products</button>}

        <div className="bg-card rounded-xl p-4 border border-border space-y-2.5">
          <Row label="Sub Total" value={formatCurrency(subtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
          <div className="flex justify-between items-center text-sm"><span className="font-semibold">Discount</span><Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-20 h-8 text-right text-sm" /></div>
          <div className="flex justify-between text-sm font-bold border-t border-border pt-2"><span>Total</span><span className="text-primary">{formatCurrency(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between items-center text-sm"><span className="font-semibold">Paid</span><Input type="number" value={receivedAmount} onChange={e => setReceivedAmount(Number(e.target.value))} className="w-24 h-8 text-right text-sm" /></div>
          {changeAmount > 0 && <Row label="Change" value={formatCurrency(changeAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="text-success" />}
          {dueAmount > 0 && <Row label="Debt" value={formatCurrency(dueAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="text-destructive" />}
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="flex-1 bg-muted text-muted-foreground font-bold py-3.5 rounded-xl">Cancel</button>
          <button onClick={submit} disabled={!canManageData || saving} className="flex-1 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>

      {/* Product Picker */}
      <Dialog open={canManageData && showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Select Product</DialogTitle></DialogHeader>
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" /></div>
          <div className="flex gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="text-xs h-8"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            <Select value={filterBrand} onValueChange={setFilterBrand}><SelectTrigger className="text-xs h-8"><SelectValue placeholder="Brand" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1 overflow-y-auto flex-1">
            {filteredProducts.map(p => (
              <button key={p.id} onClick={() => selectProduct(p)} className="w-full flex items-center gap-2.5 p-3 hover:bg-accent rounded-lg">
                {(() => { const img = getImageUrl(p.image); return img ? <img src={img} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" /> : <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">{p.name.slice(0,2).toUpperCase()}</div>; })()}
                <div className="text-left flex-1 min-w-0"><span className="font-medium text-sm truncate block">{p.name}</span><p className="text-xs text-muted-foreground">{p.code}</p></div>
                <span className="text-sm font-semibold flex-shrink-0">{formatCurrency(p.costPrice)}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Qty Dialog */}
      <Dialog open={canManageData && showQtyDialog} onOpenChange={setShowQtyDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{pendingProduct?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Quantity</label><Input type="number" value={pendingQty} onChange={e => setPendingQty(Number(e.target.value))} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Unit Price</label><Input type="number" value={pendingPrice} onChange={e => setPendingPrice(Number(e.target.value))} /></div>
            <button onClick={confirmAdd} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Add to Cart</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ label, value, className = "" }: { label: string; value: string; className?: string }) => (
  <div className={`flex justify-between text-sm ${className}`}><span className="font-semibold">{label}</span><span>{value}</span></div>
);

export default AddPurchase;
