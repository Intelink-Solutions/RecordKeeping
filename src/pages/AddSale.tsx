import { useState, useMemo } from "react";
import { Minus, Plus, X, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { store, SaleItem, Product, Customer } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const AddSale = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const products = store.getProducts();
  const customers = store.getCustomers();
  const categories = store.getCategories();
  const brands = store.getBrands();

  const [invoiceNo] = useState(store.getNextSaleInvoice());
  const [date] = useState(new Date().toISOString().split("T")[0]);
  const [customerType, setCustomerType] = useState<"guest" | "registered">("guest");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [vatPercent, setVatPercent] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBrand, setFilterBrand] = useState("");

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
      const matchCat = !filterCategory || p.categoryId === filterCategory;
      const matchBrand = !filterBrand || p.brandId === filterBrand;
      return matchSearch && matchCat && matchBrand;
    });
  }, [products, searchQuery, filterCategory, filterBrand]);

  const subtotal = items.reduce((s, i) => s + (i.unitPrice * i.quantity - i.discount), 0);
  const vatAmount = subtotal * (vatPercent / 100);
  const total = subtotal + vatAmount - discount;
  const changeAmount = receivedAmount > total ? receivedAmount - total : 0;
  const dueAmount = receivedAmount < total ? total - receivedAmount : 0;

  const addItem = (p: Product) => {
    if (items.find((i) => i.productId === p.id)) return;
    if (p.stock <= 0) {
      toast({ title: "Out of stock!", variant: "destructive" });
      return;
    }
    const price = getProductPrice(p);
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

  const submit = () => {
    if (items.length === 0) {
      toast({ title: "Please add items", variant: "destructive" });
      return;
    }
    const customerName = customerType === "guest" ? "Guest" : (selectedCustomer?.name || "Guest");
    const profit = items.reduce((s, item) => {
      const product = products.find(p => p.id === item.productId);
      return s + ((item.unitPrice - (product?.costPrice || 0)) * item.quantity - item.discount);
    }, 0);

    const status = dueAmount > 0 ? (receivedAmount > 0 ? "Partial" : "Due") : "Paid";

    const sales = store.getSales();
    const newSale: typeof sales[0] = {
      id: store.nextId(), invoiceNo, date,
      customerId: customerType === "guest" ? "0" : selectedCustomerId,
      customerName, customerPhone: customerType === "guest" ? guestPhone : selectedCustomer?.phone,
      items, subtotal, vat: vatAmount, vatPercent, discount, total,
      paid: Math.min(receivedAmount, total), due: dueAmount, change: changeAmount,
      profit, status, returned: false,
    };
    store.saveSales([newSale, ...sales]);

    // Update stock
    const updatedProducts = products.map(p => {
      const saleItem = items.find(i => i.productId === p.id);
      return saleItem ? { ...p, stock: p.stock - saleItem.quantity } : p;
    });
    store.saveProducts(updatedProducts);

    // Update customer due
    if (customerType === "registered" && selectedCustomer && dueAmount > 0) {
      const updatedCustomers = customers.map(c =>
        c.id === selectedCustomerId ? { ...c, due: c.due + dueAmount } : c
      );
      store.saveCustomers(updatedCustomers);
    }

    toast({ title: "Sale completed successfully!" });
    navigate("/sales");
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title="Create Sale" />
      <div className="px-4 py-4 space-y-4">
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
            <button onClick={() => setCustomerType("guest")} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${customerType === "guest" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Guest</button>
            <button onClick={() => setCustomerType("registered")} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${customerType === "registered" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Registered</button>
          </div>
          {customerType === "guest" ? (
            <Input placeholder="Phone (optional)" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
          ) : (
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedCustomer && (
            <p className="text-xs text-muted-foreground">Type: <span className="font-semibold text-primary">{selectedCustomer.type}</span> — Prices adjusted</p>
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
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} × ${item.unitPrice} = ${(item.quantity * item.unitPrice).toFixed(2)}</p>
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

        <button onClick={() => setShowPicker(true)} className="w-full py-3 bg-accent text-primary font-semibold rounded-xl border-2 border-dashed border-primary/30">+ Add Products</button>

        {/* Totals */}
        <div className="bg-card rounded-xl p-4 border border-border space-y-2.5">
          <Row label="Sub Total" value={`$ ${subtotal.toFixed(2)}`} />
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">VAT %</span>
            <Input type="number" value={vatPercent} onChange={(e) => setVatPercent(Number(e.target.value))} className="w-20 h-8 text-center text-sm" />
          </div>
          {vatAmount > 0 && <Row label="VAT Amount" value={`$ ${vatAmount.toFixed(2)}`} />}
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">Discount</span>
            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-20 h-8 text-right text-sm" />
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
            <span>Total</span><span className="text-primary">$ {total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">Received</span>
            <Input type="number" value={receivedAmount} onChange={(e) => setReceivedAmount(Number(e.target.value))} className="w-24 h-8 text-right text-sm" />
          </div>
          {changeAmount > 0 && <Row label="Change" value={`$ ${changeAmount.toFixed(2)}`} className="text-success" />}
          {dueAmount > 0 && <Row label="Due" value={`$ ${dueAmount.toFixed(2)}`} className="text-destructive" />}
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="flex-1 bg-muted text-muted-foreground font-bold py-3.5 rounded-xl">Cancel</button>
          <button onClick={submit} className="flex-1 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg">Save Sale</button>
        </div>
      </div>

      {/* Product Picker Dialog */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
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
              <button key={p.id} onClick={() => addItem(p)} className="w-full flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors" disabled={p.stock <= 0}>
                <div className="text-left">
                  <span className="font-medium text-sm">{p.name}</span>
                  <p className="text-xs text-muted-foreground">{p.code} · Stock: {p.stock}</p>
                </div>
                <span className={`text-sm font-semibold ${p.stock <= 0 ? "text-destructive" : "text-foreground"}`}>$ {getProductPrice(p)}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ label, value, className = "" }: { label: string; value: string; className?: string }) => (
  <div className={`flex justify-between text-sm ${className}`}><span className="font-semibold">{label}</span><span>{value}</span></div>
);

export default AddSale;
