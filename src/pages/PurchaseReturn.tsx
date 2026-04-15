import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { store, PurchaseItem } from "@/lib/store";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

const PurchaseReturn = () => {
  const { purchaseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const purchases = store.getPurchases();
  const purchase = purchases.find(p => p.id === purchaseId);

  const [returnItems, setReturnItems] = useState<PurchaseItem[]>(
    purchase?.items.map(i => ({ ...i, quantity: 0 })) || []
  );

  if (!purchase) return <div className="min-h-screen bg-background flex items-center justify-center"><p>Purchase not found</p></div>;

  const updateQty = (idx: number, delta: number) => {
    setReturnItems(returnItems.map((it, i) => {
      if (i !== idx) return it;
      return { ...it, quantity: Math.max(0, Math.min(purchase.items[idx].quantity, it.quantity + delta)) };
    }));
  };

  const returnTotal = returnItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const submit = () => {
    if (!returnItems.some(i => i.quantity > 0)) { toast({ title: "Select items to return", variant: "destructive" }); return; }
    const returns = store.getPurchaseReturns();
    returns.push({ id: store.nextId(), purchaseId: purchase.id, invoiceNo: `PR-${purchase.invoiceNo.replace("P-", "")}`, date: new Date().toISOString().split("T")[0], supplierName: purchase.supplierName, items: returnItems.filter(i => i.quantity > 0), total: returnTotal });
    store.savePurchaseReturns(returns);
    store.savePurchases(purchases.map(p => p.id === purchase.id ? { ...p, returned: true } : p));
    // Reduce stock
    const products = store.getProducts();
    store.saveProducts(products.map(p => { const ri = returnItems.find(i => i.productId === p.id && i.quantity > 0); return ri ? { ...p, stock: p.stock - ri.quantity } : p; }));
    toast({ title: "Purchase return processed!" });
    navigate("/purchase-returns");
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title="Purchase Return" />
      <div className="px-4 py-4 space-y-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-sm text-muted-foreground">Invoice: <span className="font-semibold text-foreground">#{purchase.invoiceNo}</span></p>
          <p className="text-sm text-muted-foreground">Supplier: <span className="font-semibold text-foreground">{purchase.supplierName}</span></p>
        </div>
        <div className="bg-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-2.5 bg-accent"><span className="text-sm font-semibold">Select Return Items</span></div>
          {returnItems.map((item, idx) => (
            <div key={item.productId} className="px-4 py-3 flex items-center border-b border-border last:border-0">
              <div className="flex-1"><p className="font-semibold text-sm">{item.name}</p><p className="text-xs text-muted-foreground">Purchased: {purchase.items[idx].quantity}</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(idx, -1)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><Minus size={14} /></button>
                <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                <button onClick={() => updateQty(idx, 1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-card rounded-xl p-4 border border-border"><div className="flex justify-between font-bold text-sm"><span>Return Total</span><span className="text-primary">{formatCurrency(returnTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div></div>
        <button onClick={submit} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg">Process Return</button>
      </div>
    </div>
  );
};

export default PurchaseReturn;
