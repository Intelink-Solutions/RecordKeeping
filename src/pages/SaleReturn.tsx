import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { store, SaleItem } from "@/lib/store";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";

const SaleReturn = () => {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const sales = store.getSales();
  const sale = sales.find(s => s.id === saleId);

  const [returnItems, setReturnItems] = useState<SaleItem[]>(
    sale?.items.map(i => ({ ...i, quantity: 0 })) || []
  );

  if (!sale) return <div className="min-h-screen bg-background flex items-center justify-center"><p>Sale not found</p></div>;

  const updateQty = (idx: number, delta: number) => {
    setReturnItems(returnItems.map((it, i) => {
      if (i !== idx) return it;
      const maxQty = sale.items[idx].quantity;
      return { ...it, quantity: Math.max(0, Math.min(maxQty, it.quantity + delta)) };
    }));
  };

  const returnTotal = returnItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const submit = () => {
    const hasReturn = returnItems.some(i => i.quantity > 0);
    if (!hasReturn) {
      toast({ title: "Please select items to return", variant: "destructive" });
      return;
    }

    const returns = store.getSaleReturns();
    returns.push({
      id: store.nextId(),
      saleId: sale.id,
      invoiceNo: `SR-${sale.invoiceNo.replace("S-", "")}`,
      date: new Date().toISOString().split("T")[0],
      customerName: sale.customerName,
      items: returnItems.filter(i => i.quantity > 0),
      total: returnTotal,
    });
    store.saveSaleReturns(returns);

    // Mark sale as returned
    const updatedSales = sales.map(s => s.id === sale.id ? { ...s, returned: true } : s);
    store.saveSales(updatedSales);

    // Restore stock
    const products = store.getProducts();
    const updatedProducts = products.map(p => {
      const returnItem = returnItems.find(i => i.productId === p.id && i.quantity > 0);
      return returnItem ? { ...p, stock: p.stock + returnItem.quantity } : p;
    });
    store.saveProducts(updatedProducts);

    toast({ title: "Sale return processed!" });
    navigate("/sale-returns");
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title="Sale Return" />
      <div className="px-4 py-4 space-y-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-sm text-muted-foreground">Invoice: <span className="font-semibold text-foreground">#{sale.invoiceNo}</span></p>
          <p className="text-sm text-muted-foreground">Customer: <span className="font-semibold text-foreground">{sale.customerName}</span></p>
        </div>

        <div className="bg-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-2.5 bg-accent"><span className="text-sm font-semibold">Select Return Items</span></div>
          {returnItems.map((item, idx) => (
            <div key={item.productId} className="px-4 py-3 flex items-center border-b border-border last:border-0">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">Sold: {sale.items[idx].quantity} · Price: {formatCurrency(item.unitPrice)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(idx, -1)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><Minus size={14} /></button>
                <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                <button onClick={() => updateQty(idx, 1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex justify-between font-bold text-sm">
            <span>Return Total</span>
            <span className="text-primary">{formatCurrency(returnTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <button onClick={submit} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg">Process Return</button>
      </div>
    </div>
  );
};

export default SaleReturn;
