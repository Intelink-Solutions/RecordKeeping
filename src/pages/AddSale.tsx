import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { store, SaleItem, Product } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const AddSale = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const products = store.getProducts();
  const [invoiceNo] = useState(store.getNextInvoiceNo());
  const [date] = useState(new Date().toISOString().split("T")[0]);
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<(SaleItem & { productId: string })[]>([]);
  const [vatPercent, setVatPercent] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const vatAmount = subtotal * (vatPercent / 100);
  const total = subtotal + vatAmount - discount;

  const addItem = (p: Product) => {
    if (items.find((i) => i.productId === p.id)) return;
    setItems([...items, { productId: p.id, name: p.name, quantity: 1, unitPrice: p.price }]);
    setShowPicker(false);
  };

  const updateQty = (idx: number, delta: number) => {
    setItems(items.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const submit = () => {
    if (!customerName.trim() || items.length === 0) {
      toast({ title: "Please add customer name and items", variant: "destructive" });
      return;
    }
    const sales = store.getSales();
    const newSale = {
      id: Date.now().toString(),
      invoiceNo, date,
      customerName: customerName.trim(),
      items, subtotal, vat: vatAmount, discount, total,
      paid: total, profit: 0, status: "Paid" as const,
    };
    store.saveSales([newSale, ...sales]);
    toast({ title: "Sale added successfully!" });
    navigate("/sales");
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title="Add Sales" />
      <div className="px-4 py-4 space-y-4">
        {/* Invoice & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Inv No.</label>
            <Input value={`"${invoiceNo}"`} readOnly className="bg-card" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <Input type="date" value={date} readOnly className="bg-card" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Customer Name</label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="bg-accent/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-accent">
              <span className="text-sm font-semibold">Item Added</span>
              <span className="text-sm font-semibold">Quantity</span>
            </div>
            {items.map((item, idx) => (
              <div key={item.productId} className="px-4 py-3 flex items-center border-b border-border last:border-0">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} X {item.unitPrice} = {(item.quantity * item.unitPrice).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(idx, -1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Minus size={14} /></button>
                  <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(idx, 1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus size={14} /></button>
                  <button onClick={() => removeItem(idx)} className="w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowPicker(true)} className="w-full py-3 bg-accent text-primary font-semibold rounded-xl">Add Items</button>

        {/* Totals */}
        <div className="bg-card rounded-xl p-4 border border-border space-y-2.5">
          <div className="flex justify-between text-sm"><span className="font-semibold">Sub Total</span><span>{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">VAT</span>
            <div className="flex items-center gap-1">
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded font-bold">%</span>
              <Input type="number" value={vatPercent} onChange={(e) => setVatPercent(Number(e.target.value))} className="w-16 h-8 text-center text-sm" />
              <span className="bg-warning text-warning-foreground text-xs px-2 py-0.5 rounded font-bold">$</span>
              <span className="text-sm w-16 text-right">{vatAmount.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between text-sm"><span className="font-semibold">Discount</span><Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 h-8 text-right text-sm" /></div>
          <div className="flex justify-between text-sm font-bold border-t border-border pt-2"><span>Total</span><span>{total.toFixed(2)}</span></div>
        </div>

        <button onClick={submit} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg">Submit Sale</button>
      </div>

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent>
          <DialogHeader><DialogTitle>Select Product</DialogTitle></DialogHeader>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {products.map((p) => (
              <button key={p.id} onClick={() => addItem(p)} className="w-full flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-sm text-muted-foreground">$ {p.price}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddSale;
