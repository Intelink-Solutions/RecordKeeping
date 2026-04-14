import { useState, useMemo } from "react";
import { Minus, Plus, Trash2, Search, X } from "lucide-react";
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
  const categories = store.getCategories();
  const brands = store.getBrands();
  const customers = store.getCustomers();

  const [invoiceNo] = useState(store.getNextSaleInvoice());
  const [date] = useState(new Date().toISOString().split("T")[0]);
  const [customerType, setCustomerType] = useState<"Guest" | "Registered">("Guest");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [items, setItems] = useState<(SaleItem & { productId: string })[]>([]);
  const [vatPercent, setVatPercent] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const getPrice = (product: Product) => {
    if (customerType === "Registered" && selectedCustomer) {
      // Price adjustment based on customer type
      const multiplier = selectedCustomer.type === "Wholesaler" ? 0.85 : selectedCustomer.type === "Dealer" ? 0.9 : 1;
      return Math.round(product.price * multiplier);
    }
    return product.price;
  };

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const vatAmount = Math.round(subtotal * (vatPercent / 100));
  const total = subtotal + vatAmount - discount;
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

  const addItem = (p: Product) => {
    if (p.stock <= 0) {
      toast({ title: "Out of stock!", variant: "destructive" });
      return;
    }
    const existing = items.findIndex(i => i.productId === p.id);
    if (existing >= 0) {
      updateQty(existing, 1);
    } else {
      setItems([...items, { productId: p.id, name: p.name, quantity: 1, unitPrice: getPrice(p), returnedQty: 0 }]);
    }
    setShowPicker(false);
  };

  const updateQty = (idx: number, delta: number) => {
    const product = products.find(p => p.id === items[idx].productId);
    setItems(items.map((it, i) => {
      if (i !== idx) return it;
      const newQty = Math.max(1, it.quantity + delta);
      if (product && newQty > product.stock) {
        toast({ title: `Only ${product.stock} in stock`, variant: "destructive" });
        return it;
      }
      return { ...it, quantity: newQty };
    }));
  };

  const updateQtyDirect = (idx: number, val: string) => {
    const num = parseInt(val) || 1;
    const product = products.find(p => p.id === items[idx].productId);
    if (product && num > product.stock) {
      toast({ title: `Only ${product.stock} in stock`, variant: "destructive" });
      return;
    }
    setItems(items.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, num) } : it));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const clearAll = () => setItems([]);

  const submit = () => {
    if (items.length === 0) {
      toast({ title: "Please add items", variant: "destructive" });
      return;
    }
    const customerName = customerType === "Guest" ? "Guest" : (selectedCustomer?.name || "Guest");
    const sales = store.getSales();
    const paid = Math.min(receivedAmount, total);
    const newSale: typeof sales[0] = {
      id: Date.now().toString(),
      invoiceNo, date,
      customerName,
      customerId: customerType === "Registered" ? selectedCustomerId : undefined,
      items, subtotal, vat: vatAmount, discount, total,
      paid,
      due: total - paid,
      profit: items.reduce((s, item) => {
        const product = products.find(p => p.id === item.productId);
        return s + (item.unitPrice - (product?.costPrice || 0)) * item.quantity;
      }, 0),
      status: paid >= total ? "Paid" : "Due",
      hasReturn: false,
    };
    store.saveSales([newSale, ...sales]);

    // Update stock
    const updatedProducts = products.map(p => {
      const saleItem = items.find(i => i.productId === p.id);
      return saleItem ? { ...p, stock: p.stock - saleItem.quantity } : p;
    });
    store.saveProducts(updatedProducts);

    // Update customer due
    if (customerType === "Registered" && selectedCustomer && dueAmount > 0) {
      const updatedCustomers = customers.map(c =>
        c.id === selectedCustomerId ? { ...c, due: c.due + dueAmount } : c
      );
      store.saveCustomers(updatedCustomers);
    }

    toast({ title: "Sale added successfully!" });
    navigate("/sales");
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title="Create Sale" />
      <div className="px-4 py-4 space-y-4">
        {/* Invoice & Date */}
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

        {/* Customer Selection */}
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setCustomerType("Guest")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${customerType === "Guest" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Guest
            </button>
            <button
              onClick={() => setCustomerType("Registered")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${customerType === "Registered" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Registered
            </button>
          </div>
          {customerType === "Guest" ? (
            <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Phone (optional)" />
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
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="bg-card rounded-xl overflow-hidden border border-border">
            <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-b border-border">
              <span className="text-sm font-bold text-primary">Cart ({items.length})</span>
              <button onClick={clearAll} className="text-xs text-destructive font-semibold flex items-center gap-1">
                <X size={12} /> Clear All
              </button>
            </div>
            {items.map((item, idx) => (
              <div key={item.productId} className="px-4 py-3 flex items-center border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">{item.quantity} × $ {item.unitPrice} = $ {(item.quantity * item.unitPrice).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(idx, -1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Minus size={12} /></button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQtyDirect(idx, e.target.value)}
                    className="w-10 text-center font-bold text-sm border border-border rounded-md py-0.5 bg-background"
                  />
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

        {/* Totals */}
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sub Total</span>
            <span className="font-bold">$ {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">VAT (%)</span>
            <div className="flex items-center gap-2">
              <Input type="number" value={vatPercent} onChange={(e) => setVatPercent(Number(e.target.value))} className="w-16 h-8 text-center text-sm" />
              <span className="text-sm font-semibold w-20 text-right">$ {vatAmount.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Discount</span>
            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-28 h-8 text-right text-sm" />
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-border pt-3">
            <span>Total</span>
            <span className="text-primary text-lg">$ {total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Received</span>
            <Input type="number" value={receivedAmount || ""} onChange={(e) => setReceivedAmount(Number(e.target.value))} className="w-28 h-8 text-right text-sm" placeholder="0" />
          </div>
          {changeAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-success font-medium">Change</span>
              <span className="font-bold text-success">$ {changeAmount.toLocaleString()}</span>
            </div>
          )}
          {dueAmount > 0 && receivedAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-warning font-medium">Due</span>
              <span className="font-bold text-warning">$ {dueAmount.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { clearAll(); navigate(-1); }} className="flex-1 py-3.5 bg-muted text-muted-foreground font-bold rounded-xl">Cancel</button>
          <button onClick={submit} className="flex-1 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg">Save Sale</button>
        </div>
      </div>

      {/* Product Picker */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Select Product</DialogTitle></DialogHeader>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or code..." className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto flex-1">
            {filteredProducts.map((p) => (
              <button key={p.id} onClick={() => addItem(p)} className="w-full flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                <div>
                  <span className="font-medium text-sm">{p.name}</span>
                  <p className="text-[11px] text-muted-foreground">{p.code} • Stock: {p.stock}</p>
                </div>
                <span className={`text-sm font-bold ${p.stock <= 0 ? "text-destructive" : "text-foreground"}`}>
                  $ {getPrice(p).toLocaleString()}
                </span>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No products found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddSale;
