import { useState, useMemo, useEffect, useRef } from "react";
import { Minus, Plus, X, Search, BookUser, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { store, SaleItem, Product } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/use-app-context";
import { formatCurrency } from "@/lib/currency";
import InvoiceModal from "@/components/InvoiceModal";
import { apiCreateSale, NetworkDownError } from "@/lib/api";
import { enqueueOfflineOp } from "@/lib/offline-queue";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { useLiveData, showSaved, emitStoreUpdate } from "@/hooks/use-live-data";
import { getImageUrl } from "@/lib/image-utils";
import { validateOptionalPhone } from "@/lib/validators";

// ── Phone contact picker ────────────────────────────────────────────────────
type PhoneContact = { name: string; phone: string };
const CONTACTS_SESSION_KEY = "pos_phone_contacts";

const supportsContactPicker =
  typeof navigator !== "undefined" &&
  "contacts" in navigator &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof (navigator as any).contacts?.select === "function";

function normalisePhone(raw: string): string {
  return raw.replace(/[\s\-().+]/g, "");
}

const PhoneContactInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [contacts, setContacts] = useState<PhoneContact[]>(() => {
    try {
      const c = sessionStorage.getItem(CONTACTS_SESSION_KEY);
      return c ? (JSON.parse(c) as PhoneContact[]) : [];
    } catch {
      return [];
    }
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function cacheContacts(list: PhoneContact[]) {
    setContacts(list);
    try {
      sessionStorage.setItem(CONTACTS_SESSION_KEY, JSON.stringify(list));
    } catch {
      // sessionStorage may be unavailable (private mode, quota exceeded) — caching is best-effort
    }
  }

  // Load ALL contacts so the user can search by typing
  async function loadAllContacts(): Promise<PhoneContact[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    const selected: Array<{ name?: string[]; tel?: string[] }> =
      await nav.contacts.select(["name", "tel"], { multiple: true });
    const flat: PhoneContact[] = (selected ?? []).flatMap((c) =>
      (c.tel ?? []).map((t) => ({
        name: (c.name?.[0] ?? "Unknown").trim(),
        phone: normalisePhone(t),
      }))
    ).filter((c) => c.phone.length >= 5);
    return flat;
  }

  // Pick a single contact quickly
  async function pickSingleContact(): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    const selected: Array<{ name?: string[]; tel?: string[] }> =
      await nav.contacts.select(["name", "tel"], { multiple: false });
    if (selected?.length > 0) {
      return normalisePhone(selected[0].tel?.[0] ?? "");
    }
    return null;
  }

  const handleContactBtn = async () => {
    if (!supportsContactPicker || loading) return;
    setLoading(true);
    try {
      if (contacts.length === 0) {
        // First time: load all → cache → fill phone from first pick
        const all = await loadAllContacts();
        if (all.length > 0) {
          cacheContacts(all);
          // Also pick one to fill the field
          const phone = await pickSingleContact();
          if (phone) onChange(phone);
        }
      } else {
        // Already have contacts cached → just pick one
        const phone = await pickSingleContact();
        if (phone) onChange(phone);
      }
    } catch {
      // user cancelled or API not available
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (value.length < 2) return [];
    const q = value.toLowerCase();
    const qPhone = normalisePhone(value);
    return contacts
      .filter(
        (c) =>
          c.phone.includes(qPhone) ||
          c.name.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [value, contacts]);

  useEffect(() => {
    if (filtered.length > 0) setShowDropdown(true);
  }, [filtered.length]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2">
        <Input
          type="tel"
          placeholder="Phone (optional)"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (filtered.length > 0) setShowDropdown(true);
          }}
          onFocus={() => {
            if (filtered.length > 0) setShowDropdown(true);
          }}
          className="flex-1"
        />
        {supportsContactPicker && (
          <button
            type="button"
            onClick={handleContactBtn}
            disabled={loading}
            title={contacts.length > 0 ? "Pick from contacts" : "Load phone contacts"}
            className="px-3 bg-accent rounded-lg border border-border flex items-center justify-center shrink-0 hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
            ) : (
              <BookUser size={18} className="text-primary" />
            )}
          </button>
        )}
      </div>

      {showDropdown && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-lg shadow-xl mt-1 max-h-52 overflow-y-auto">
          {filtered.map((c, i) => (
            <button
              key={i}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors border-b border-border/40 last:border-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(c.phone);
                setShowDropdown(false);
              }}
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {c.name.charAt(0).toUpperCase() || "#"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AddSale = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { canManageData, roleLabel } = useAppContext();
  const products = useLiveData(() => store.getProducts());
  const customers = useLiveData(() => store.getCustomers());
  const categories = useLiveData(() => store.getCategories());
  const brands = useLiveData(() => store.getBrands());

  // Accept pre-filled items from ItemsPage checkout
  const prefillItems: SaleItem[] = (location.state as { prefillItems?: SaleItem[] })?.prefillItems ?? [];

  const [invoiceNo] = useState(store.getNextSaleInvoice());
  const [date] = useState(new Date().toISOString().split("T")[0]);
  const [customerType, setCustomerType] = useState<"guest" | "registered">("guest");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [items, setItems] = useState<SaleItem[]>(prefillItems);
  const [vatPercent, setVatPercent] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [savedSale, setSavedSale] = useState<ReturnType<typeof store.getSales>[number] | null>(null);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const getProductPrice = (product: Product): number => {
    if (customerType === "guest" || !selectedCustomer) return product.retailPrice;
    switch (selectedCustomer.type) {
      case "Retailer": return product.retailPrice;
      case "Wholesaler": return product.wholesalePrice;
      case "Dealer": return product.dealerPrice;
      default: return product.retailPrice;
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = !filterCategory || filterCategory === "all" || p.categoryId === filterCategory;
      const matchBrand = !filterBrand || filterBrand === "all" || p.brandId === filterBrand;
      return matchSearch && matchCat && matchBrand;
    });
  }, [products, searchQuery, filterCategory, filterBrand]);

  const subtotal = items.reduce((s, i) => s + (i.unitPrice * i.quantity - i.discount), 0);
  const vatAmount = subtotal * (vatPercent / 100);
  const total = subtotal + vatAmount - discount;
  const changeAmount = receivedAmount > total ? receivedAmount - total : 0;
  const dueAmount = receivedAmount < total ? total - receivedAmount : 0;

  const addItem = (p: Product) => {
    if (items.find((i) => i.productId === p.id)) {
      toast({ title: "Already in cart", description: "Adjust the quantity from the cart below instead." });
      setShowPicker(false);
      return;
    }
    if (p.stock <= 0) {
      toast({ title: "Out of stock!", variant: "destructive" });
      return;
    }
    const price = getProductPrice(p);
    if (!price || price <= 0) {
      toast({
        title: "No sale price set",
        description: "Set a sale price for this product before selling it.",
        variant: "destructive",
      });
      return;
    }
    setItems([...items, { productId: p.id, name: p.name, quantity: 1, unitPrice: price, discount: 0 }]);
    setShowPicker(false);
  };

  const updateQty = (idx: number, delta: number) => {
    setItems(items.map((it, i) => {
      if (i !== idx) return it;
      const product = products.find(p => p.id === it.productId);
      const maxQty = product?.stock || 999;
      const newQty = Math.max(1, Math.min(maxQty, it.quantity + delta));
      return { ...it, quantity: newQty };
    }));
  };

  const setQty = (idx: number, qty: number) => {
    setItems(items.map((it, i) => {
      if (i !== idx) return it;
      const product = products.find(p => p.id === it.productId);
      const maxQty = product?.stock || 999;
      return { ...it, quantity: Math.max(1, Math.min(maxQty, qty)) };
    }));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const clearAll = () => setItems([]);

  const submit = async () => {
    if (!canManageData) {
      toast({ title: "Permission required", description: "You have view-only access", variant: "destructive" });
      return;
    }

    if (items.length === 0) {
      toast({ title: "Please add items", variant: "destructive" });
      return;
    }

    if (customerType === "guest" && guestPhone.trim()) {
      const phoneError = validateOptionalPhone(guestPhone);
      if (phoneError) {
        toast({ title: phoneError, variant: "destructive" });
        return;
      }
    }

    if (customerType === "guest" && dueAmount > 0) {
      toast({
        title: "Guest due sale not allowed",
        description: "Pay the full amount or select a registered customer.",
        variant: "destructive",
      });
      return;
    }

    // Resolve branch FIRST — must come before any object that uses it
    const effectiveBranchId = store.getEffectiveBranchId();

    const paidAmount = Math.min(receivedAmount, total);
    const partyId = customerType === "registered" && selectedCustomerId ? selectedCustomerId : null;

    const customerName = customerType === "guest" ? "Guest" : (selectedCustomer?.name || "Guest");
    const profit = items.reduce((s, item) => {
      const product = products.find(p => p.id === item.productId);
      return s + ((item.unitPrice - (product?.costPrice || 0)) * item.quantity - item.discount);
    }, 0);
    const status = dueAmount > 0 ? (receivedAmount > 0 ? "Partial" : "Due") : "Paid";

    // Build local display object
    const displaySale = {
      id: store.nextId(), invoiceNo, date,
      branchId: effectiveBranchId || undefined,
      customerId: customerType === "guest" ? "0" : selectedCustomerId,
      customerName, customerPhone: customerType === "guest" ? (guestPhone.trim() || undefined) : selectedCustomer?.phone,
      items, subtotal, vat: vatAmount, vatPercent, discount, total,
      paid: paidAmount, due: dueAmount, change: changeAmount,
      profit, status: status as "Paid" | "Due" | "Partial", returned: false,
    };

    // ── Instant local save — show success immediately ─────────────────────────
    store.saveSales([displaySale, ...store.getSales()]);
    emitStoreUpdate();
    showSaved("Sale completed!");
    setSavedSale(displaySale);

    // Build API payload
    const apiProducts = items.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        product_id: item.productId,
        stock_id: product?.stockId || "",
        quantities: item.quantity,
        price: item.unitPrice,
        discount: item.discount || 0,
        product_name: item.name,
      };
    });
    const salePayload = {
      party_id: partyId,
      vat_id: null,
      branch_id: effectiveBranchId ?? null,
      products: apiProducts,
      payments: paidAmount > 0 ? [{ type: "cash", amount: paidAmount }] : [],
      saleDate: date,
      totalAmount: total,
      dueAmount,
      paidAmount,
      isPaid: dueAmount <= 0,
      discountAmount: discount,
    };

    // ── Background sync — fire-and-forget ─────────────────────────────────────
    apiCreateSale(salePayload)
      .then(() => { syncLiveBusinessData().catch(() => {}); })
      .catch((err) => {
        if (err instanceof NetworkDownError) {
          enqueueOfflineOp("POST", "/sales", salePayload as unknown as Record<string, unknown>);
        } else {
          const msg = err instanceof Error ? err.message : "Sync failed";
          toast({ title: "Sale sync issue", description: msg, variant: "destructive" });
        }
      });
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title="Create Sale" />
      <div className="px-4 py-4 space-y-4">
        {!canManageData && (
          <div className="text-xs rounded-lg border border-warning/30 bg-warning/10 text-warning px-3 py-2">
            {roleLabel} access: view-only mode
          </div>
        )}
        {/* Invoice & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Invoice No.</label>
            <Input value={invoiceNo} readOnly className="bg-muted" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <Input type="date" value={date} readOnly className="bg-muted" />
          </div>
        </div>

        {/* Customer Selection */}
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setCustomerType("guest")} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${customerType === "guest" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Walk-in Customer</button>
            <button onClick={() => setCustomerType("registered")} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${customerType === "registered" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Registered</button>
          </div>
          {customerType === "guest" ? (
            <PhoneContactInput value={guestPhone} onChange={setGuestPhone} />
          ) : (
            <>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomer && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {selectedCustomer.phone && <p>Phone: <span className="font-medium text-foreground">{selectedCustomer.phone}</span></p>}
                  <p>Type: <span className="font-semibold text-primary">{selectedCustomer.type}</span> — Prices adjusted</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Cart Items */}
        {items.length > 0 && (
          <div className="bg-card rounded-xl overflow-hidden border border-border">
            <div className="flex items-center justify-between px-4 py-2.5 bg-accent">
              <span className="text-sm font-semibold">Cart ({items.length})</span>
              <button onClick={clearAll} className="text-xs text-destructive font-semibold">Clear All</button>
            </div>
            {items.map((item, idx) => (
              <div key={item.productId} className="px-4 py-3 flex items-center border-b border-border last:border-0">
                {(() => { const img = getImageUrl(products.find(p => p.id === item.productId)?.image); return img ? <img src={img} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 mr-2.5" /> : <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0 mr-2.5">{item.name.slice(0,2).toUpperCase()}</div>; })()}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.quantity * item.unitPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(idx, -1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Minus size={14} /></button>
                  <input type="number" value={item.quantity} onChange={(e) => setQty(idx, Number(e.target.value))} className="w-10 text-center font-bold text-sm bg-transparent border border-border rounded" />
                  <button onClick={() => updateQty(idx, 1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus size={14} /></button>
                  <button onClick={() => removeItem(idx)} className="w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {canManageData && <button onClick={() => setShowPicker(true)} className="w-full py-3 bg-accent text-primary font-semibold rounded-xl border-2 border-dashed border-primary/30">+ Add Products</button>}

        {/* Totals */}
        <div className="bg-card rounded-xl p-4 border border-border space-y-2.5">
          <Row label="Sub Total" value={formatCurrency(subtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">VAT %</span>
            <Input type="number" value={vatPercent} onChange={(e) => setVatPercent(Number(e.target.value))} className="w-20 h-8 text-center text-sm" />
          </div>
          {vatAmount > 0 && <Row label="VAT Amount" value={formatCurrency(vatAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />}
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">Discount</span>
            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-20 h-8 text-right text-sm" />
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
            <span>Total</span><span className="text-primary">{formatCurrency(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">Received</span>
            <Input type="number" value={receivedAmount} onChange={(e) => setReceivedAmount(Number(e.target.value))} className="w-24 h-8 text-right text-sm" />
          </div>
          {changeAmount > 0 && <Row label="Change" value={formatCurrency(changeAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="text-success" />}
          {dueAmount > 0 && <Row label="Debt" value={formatCurrency(dueAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="text-destructive" />}
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="flex-1 bg-muted text-muted-foreground font-bold py-3.5 rounded-xl">Cancel</button>
          <button onClick={submit} disabled={!canManageData} className="flex-1 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-60">Save Sale</button>
        </div>
      </div>

      {/* Product Picker Dialog */}
      <Dialog open={canManageData && showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Select Product</DialogTitle></DialogHeader>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or code..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 overflow-y-auto flex-1">
            {filteredProducts.map((p) => (
              <button key={p.id} onClick={() => addItem(p)} className="w-full flex items-center gap-2.5 p-3 hover:bg-accent rounded-lg transition-colors" disabled={p.stock <= 0}>
                {(() => { const img = getImageUrl(p.image); return img ? <img src={img} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" /> : <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">{p.name.slice(0,2).toUpperCase()}</div>; })()}
                <div className="text-left flex-1 min-w-0">
                  <span className="font-medium text-sm truncate block">{p.name}</span>
                  <p className="text-xs text-muted-foreground">{p.code} · Stock: {p.stock}</p>
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ${p.stock <= 0 ? "text-destructive" : "text-foreground"}`}>{formatCurrency(getProductPrice(p))}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {savedSale && (
        <InvoiceModal
          open={!!savedSale}
          onClose={() => {
            setSavedSale(null);
            navigate("/sales");
          }}
          data={{
            invoiceNo: savedSale.invoiceNo,
            date: savedSale.date,
            customerName: savedSale.customerName,
            phone: savedSale.customerPhone,
            items: savedSale.items,
            subtotal: savedSale.subtotal,
            vat: savedSale.vat,
            vatPercent: savedSale.vatPercent,
            discount: savedSale.discount,
            total: savedSale.total,
            paid: savedSale.paid,
            due: savedSale.due,
            change: savedSale.change,
            type: "Sale",
          }}
        />
      )}
    </div>
  );
};

const Row = ({ label, value, className = "" }: { label: string; value: string; className?: string }) => (
  <div className={`flex justify-between text-sm ${className}`}><span className="font-semibold">{label}</span><span>{value}</span></div>
);

export default AddSale;
