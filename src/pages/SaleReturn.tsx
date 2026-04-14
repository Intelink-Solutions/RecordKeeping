import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { store } from "@/lib/store";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const SaleReturn = () => {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const sales = store.getSales();
  const sale = sales.find(s => s.id === saleId);

  const [returnQtys, setReturnQtys] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    sale?.items.forEach(item => { init[item.productId] = 0; });
    return init;
  });

  if (!sale) return <div className="p-4">Sale not found</div>;

  const updateQty = (productId: string, delta: number) => {
    const item = sale.items.find(i => i.productId === productId)!;
    const maxReturn = item.quantity - item.returnedQty;
    setReturnQtys(prev => ({
      ...prev,
      [productId]: Math.max(0, Math.min(maxReturn, (prev[productId] || 0) + delta))
    }));
  };

  const totalReturn = sale.items.reduce((sum, item) => {
    return sum + (returnQtys[item.productId] || 0) * item.unitPrice;
  }, 0);

  const submit = () => {
    const returnItems = sale.items
      .filter(item => (returnQtys[item.productId] || 0) > 0)
      .map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: returnQtys[item.productId],
        unitPrice: item.unitPrice,
      }));

    if (returnItems.length === 0) {
      toast({ title: "No items selected for return", variant: "destructive" });
      return;
    }

    // Save return
    const returns = store.getSaleReturns();
    returns.push({
      id: Date.now().toString(),
      saleId: sale.id,
      invoiceNo: sale.invoiceNo,
      returnInvoiceNo: store.getNextReturnInvoice("SR"),
      date: new Date().toISOString().split("T")[0],
      customerName: sale.customerName,
      items: returnItems,
      total: totalReturn,
    });
    store.saveSaleReturns(returns);

    // Update sale
    const updatedSales = sales.map(s => {
      if (s.id !== saleId) return s;
      return {
        ...s,
        hasReturn: true,
        status: "Returned" as const,
        items: s.items.map(item => ({
          ...item,
          returnedQty: item.returnedQty + (returnQtys[item.productId] || 0),
        })),
      };
    });
    store.saveSales(updatedSales);

    // Restore stock
    const products = store.getProducts();
    const updatedProducts = products.map(p => {
      const qty = returnQtys[p.id] || 0;
      return qty > 0 ? { ...p, stock: p.stock + qty } : p;
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
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Invoice</span>
            <span className="font-mono font-bold">{sale.invoiceNo}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-semibold">{sale.customerName}</span>
          </div>
        </div>

        <div className="bg-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-2.5 bg-primary/5 border-b border-border">
            <span className="text-sm font-bold text-primary">Items</span>
          </div>
          {sale.items.map((item) => {
            const maxReturn = item.quantity - item.returnedQty;
            return (
              <div key={item.productId} className="px-4 py-3 flex items-center border-b border-border last:border-0">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">Sold: {item.quantity} | Already returned: {item.returnedQty} | Max: {maxReturn}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.productId, -1)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><Minus size={12} /></button>
                  <span className="w-8 text-center font-bold text-sm">{returnQtys[item.productId] || 0}</span>
                  <button onClick={() => updateQty(item.productId, 1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus size={12} /></button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex justify-between font-bold text-base">
            <span>Return Total</span>
            <span className="text-primary">$ {totalReturn.toLocaleString()}</span>
          </div>
        </div>

        <button onClick={submit} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg">Process Return</button>
      </div>
    </div>
  );
};

export default SaleReturn;
