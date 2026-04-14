import { useState, useMemo } from "react";
import { Minus, Plus, Trash2, Search, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { store, PurchaseItem, Product } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const AddPurchase = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const products = store.getProducts();
  const categories = store.getCategories();
  const brands = store.getBrands();
  const suppliers = store.getSuppliers();

  const [invoiceNo] = useState(store.getNextPurchaseInvoice());
  const [date] = useState(new Date().toISOString().split("T")[0]);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<(PurchaseItem & { productId: string })[]>([]);
  const [discount, setDiscount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [showQtyDialog, setShowQtyDialog] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [popupQty, setPopupQty] = useState(1);
  const [popupPrice, setPopupPrice] = useState(0);

  const supplier = suppliers.find(s => s.id === supplierId);
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total = subtotal - discount;
  const changeAmount = receivedAmount > total ? receivedAmount - total : 0;
  const dueAmount = receivedAmount < total ? total - receivedAmount : 0;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = filterCategory === "all" || p.categoryId === filterCategory;
      const matchBrand = filterBrand === "all" || p.brandId === filterBrand;
      return matchSearch && matchCat && matchBrand;
    });
  }, [products, searchQuery, filterCategory, filterBrand]);

  const openQtyDialog = (p: Product) => {
    setShowQtyDialog(p);
    setPopupQty(1);
    setPopupPrice(p.costPrice);
    setShowPicker(false);
  };

  const addFromPopup = () => {
    if (!showQtyDialog) return;
    const p = showQtyDialog;
    const existing = items.findIndex(i => i.productId === p.id);
    if (existing >= 0) {
      setItems(items.map((it, i) => i === existing ? { ...it, quantity: it.quantity + popupQty, unitPrice: popupPrice } : it));
    } else {
      setItems([...items, { productId: p.id, name: p.name, quantity: popupQty, unitPrice: popupPrice, returnedQty: 0 }]);
    }
    setShowQtyDialog(null);
  };

  const updateQty = (idx: number, delta: number) => {
    setItems(items.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const submit = () => {
    if (!supplierId || items.length === 0) {
      toast({ title: "Select supplier and add items", variant: "destructive" });
      return;
    }
    const purchases = store.getPurchases();
    const paid = Math.min(receivedAmount, total);
    const newPurchase = {
      id: Date.now().toString(),
      invoiceNo, date,
      supplierId,
      supplierName: supplier?.name || "",
      items, subtotal, discount, total,
      paid,
      due: total - paid,
      status: (paid >= total ? "Paid" : "Due") as "Paid" | "Due",
      hasReturn: false,
    };
    store.savePurchases([newPurchase, ...purchases]);

    // Update stock
    const updatedProducts = products.map(p => {
      const purchaseItem = items.find(i => i.productId === p.id);
      return purchaseItem ? { ...p, stock: p.stock + purchaseItem.quantity, costPrice: purchaseItem.unitPrice } : p;
    });
    store.saveProducts(updatedProducts);

    // Update supplier due
    if (dueAmount > 0 && supplier) {
      const updatedSuppliers = suppliers.map(s =>
        s.id === supplierId ? { ...s, due: s.due + dueAmount } : s
      );
      store.saveSuppliers(updatedSuppliers);
    }

    toast({ title: "Purchase added successfully!" });
    navigate("/purchases");
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title="Create Purchase" />
      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Invoice No.</label>
            <Input value={invoiceNo} readOnly className="bg-muted/50 font-mono text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Date</label>
            <Input type="date" value={date} readOnly className="bg-muted/50 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Supplier</label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
            <SelectContent>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {items.length > 0 && (
          <div className="bg-card rounded-xl overflow-hidden border border-border">
            <div className="px-4 py-2.5 bg-primary/5 border-b border-border flex items-center justify-between">
              <span className="text-sm font-bold text-primary">Cart ({items.length})</span>
              <button onClick={() => setItems([])} className="text-xs text-destructive font-semibold flex items-center gap-1"><X size={12} /> Clear</button>
            </div>
            {items.map((item, idx) => (
              <div key={item.productId} className="px-4 py-3 flex items-center border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">{item.quantity} × $ {item.unitPrice.toLocaleString()} = $ {(item.quantity * item.unitPrice).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(idx, -1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Minus size={12} /></button>
                  <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(idx, 1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus size={12} /></button>
                  <button onClick={() => removeItem(idx)} className="w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center ml-1"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowPicker(true)} className="w-full py-3 bg-primary/10 text-primary font-semibold rounded-xl border border-primary/20 flex items-center justify-center gap-2">
          <Plus size={18} /> Add Products
        </button>

        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sub Total</span><span className="font-bold">$ {subtotal.toLocaleString()}</span></div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Discount</span>
            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-28 h-8 text-right text-sm" />
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-border pt-3"><span>Total</span><span className="text-primary text-lg">$ {total.toLocaleString()}</span></div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Paid Amount</span>
            <Input type="number" value={receivedAmount || ""} onChange={(e) => setReceivedAmount(Number(e.target.value))} className="w-28 h-8 text-right text-sm" placeholder="0" />
          </div>
          {changeAmount > 0 && <div className="flex justify-between text-sm"><span className="text-success font-medium">Change</span><span className="font-bold text-success">$ {changeAmount.toLocaleString()}</span></div>}
          {dueAmount > 0 && receivedAmount > 0 && <div className="flex justify-between text-sm"><span className="text-warning font-medium">Due</span><span className="font-bold text-warning">$ {dueAmount.toLocaleString()}</span></div>}
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="flex-1 py-3.5 bg-muted text-muted-foreground font-bold rounded-xl">Cancel</button>
          <button onClick={submit} className="flex-1 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg">Save Purchase</button>
        </div>
      </div>

      {/* Product Picker */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Select Product</DialogTitle></DialogHeader>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Brand" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto flex-1">
            {filteredProducts.map(p => (
              <button key={p.id} onClick={() => openQtyDialog(p)} className="w-full flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                <div><span className="font-medium text-sm">{p.name}</span><p className="text-[11px] text-muted-foreground">{p.code}</p></div>
                <span className="text-sm font-bold">$ {p.costPrice.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Qty/Price Popup */}
      <Dialog open={!!showQtyDialog} onOpenChange={() => setShowQtyDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{showQtyDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Quantity</label><Input type="number" value={popupQty} onChange={(e) => setPopupQty(Math.max(1, Number(e.target.value)))} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Unit Price</label><Input type="number" value={popupPrice} onChange={(e) => setPopupPrice(Number(e.target.value))} /></div>
            <button onClick={addFromPopup} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Add to Cart</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddPurchase;
