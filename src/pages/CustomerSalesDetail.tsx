import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { store, paymentStatusLabel } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Printer, Download, Plus, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiUpdateSale } from "@/lib/api";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { showSaved } from "@/hooks/use-live-data";

const CustomerSalesDetail = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!customerId) {
    return <div>Invalid customer</div>;
  }

  const sales = store.getSales();
  const customers = store.getCustomers();
  
  // Determine if this is a regular customer or Walk-in customer
  // Walk-in customers are identified by "walk-in" prefix in the ID or by looking up the customer
  const isWalkIn = customerId.toLowerCase().includes("walk-in");
  
  // Get customer info
  const customer = customers.find(c => c.id === customerId);
  let customerSales = sales.filter(s => s.customerId === customerId);
  
  // If no customer found and customerId matches a customer name (Walk-in case),
  // filter by customer name instead
  if (customerSales.length === 0 && !customer) {
    customerSales = sales.filter(s => s.customerName === decodeURIComponent(customerId));
  }
  
  // If still no sales found, try to find by any matching pattern
  if (customerSales.length === 0) {
    customerSales = sales.filter(s => s.customerId === customerId || s.customerName === customerId);
  }
  
  // If we have sales, get the customer name from the first sale
  const customerName = customerSales.length > 0 ? customerSales[0].customerName : decodeURIComponent(customerId);
  
  // Calculate totals
  const totalAmount = customerSales.reduce((sum, s) => sum + s.total, 0);
  const totalPaid = customerSales.reduce((sum, s) => sum + s.paid, 0);
  const totalDue = customerSales.reduce((sum, s) => sum + s.due, 0);

  const handleRecordPayment = async () => {
    if (!selectedSaleId || !paymentAmount) {
      toast({ title: "Please enter payment amount", variant: "destructive" });
      return;
    }

    const amount = parseFloat(paymentAmount);
    const sale = customerSales.find(s => s.id === selectedSaleId);
    if (!sale) return;

    if (amount <= 0 || amount > sale.due) {
      toast({ 
        title: "Invalid amount", 
        description: `Please enter amount between 0 and ${formatCurrency(sale.due)}`,
        variant: "destructive" 
      });
      return;
    }

    setIsSaving(true);
    try {
      const newPaid = sale.paid + amount;
      const newDue = sale.total - newPaid;
      const newStatus = newDue === 0 ? "Paid" : newPaid > 0 ? "Partial" : "Due";

      await apiUpdateSale(sale.id, {
        party_id: sale.customerId && sale.customerId !== "0" ? sale.customerId : undefined,
        saleDate: sale.date,
        products: sale.items.map((item) => ({
          product_id: item.productId,
          stock_id: item.stockId ?? "",
          quantities: item.quantity,
          price: item.unitPrice,
          discount: item.discount ?? 0,
          product_name: item.name,
        })),
        payments: [{ type: "cash", amount: newPaid }],
        discountAmount: sale.discount,
        totalAmount: sale.total,
        paidAmount: newPaid,
        dueAmount: newDue,
      });

      await syncLiveBusinessData();
      setPaymentDialog(false);
      setSelectedSaleId(null);
      setPaymentAmount("");
      showSaved(`Payment of ${formatCurrency(amount)} recorded successfully`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment recording failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const header = "Invoice,Date,Customer,Total,Paid,Debt,Status\n";
    const rows = customerSales.map(s =>
      `${s.invoiceNo},${s.date},${s.customerName},"${formatCurrency(s.total)}","${formatCurrency(s.paid)}","${formatCurrency(s.due)}",${paymentStatusLabel(s.status)}`
    ).join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${customerName}_sales.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader 
        title={`${customerName} - Sales Detail`}
        backButton
      />
      
      <div className="px-4 py-4 space-y-4">
        {/* Customer Info Card */}
        {customer && (
          <div className="bg-card rounded-xl p-4 border border-border space-y-2">
            <h2 className="font-semibold text-base">{customer.name}</h2>
            {customer.phone && (
              <p className="text-xs text-muted-foreground">📞 {customer.phone}</p>
            )}
            {customer.email && (
              <p className="text-xs text-muted-foreground">✉️ {customer.email}</p>
            )}
            {customer.address && (
              <p className="text-xs text-muted-foreground">📍 {customer.address}</p>
            )}
            <p className="text-xs text-muted-foreground">Type: {customer.type}</p>
          </div>
        )}
        
        {/* Walk-in Customer Info Card */}
        {!customer && customerSales.length > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border space-y-2">
            <h2 className="font-semibold text-base">{customerName}</h2>
            <p className="text-xs text-muted-foreground italic">No customer profile on record</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-bold text-sm text-green-600">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="font-bold text-sm text-blue-600">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-xs text-muted-foreground">Debt</p>
            <p className="font-bold text-sm text-red-600">{formatCurrency(totalDue)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-muted px-3 py-2 rounded-lg border border-border font-medium hover:bg-muted/80 transition"
          >
            <Download size={14} /> Export
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-muted px-3 py-2 rounded-lg border border-border font-medium hover:bg-muted/80 transition"
          >
            <Printer size={14} /> Print
          </button>
        </div>

        {/* Sales Transactions */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Sales Transactions ({customerSales.length})</h3>
          </div>
          
          {customerSales.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No sales found for this customer
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Invoice</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Total</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Paid</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Debt</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customerSales.map((sale, idx) => (
                    <tr key={idx} className="border-t border-border hover:bg-muted/30 transition">
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium">{sale.invoiceNo}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{sale.date}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-green-600">{formatCurrency(sale.total)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{formatCurrency(sale.paid)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-destructive font-semibold">
                        {sale.due > 0 ? formatCurrency(sale.due) : "-"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                          sale.status === "Paid" ? "bg-green-100 text-green-700" : 
                          sale.status === "Due" ? "bg-red-100 text-red-700" : 
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {paymentStatusLabel(sale.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {sale.due > 0 && (
                          <button
                            onClick={() => {
                              setSelectedSaleId(sale.id);
                              setPaymentAmount("");
                              setPaymentDialog(true);
                            }}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition font-semibold flex items-center gap-1"
                          >
                            <DollarSign size={12} /> Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Items View */}
        {customerSales.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">Purchase Items Detail</h3>
            </div>
            <div className="space-y-3 p-4">
              {customerSales.map((sale) => (
                <div key={sale.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-xs">{sale.invoiceNo} - {sale.date}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.status === "Paid" ? "✓ Paid" : sale.status === "Due" ? "⏱ Debt" : "⚠ Partial"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-xs">{formatCurrency(sale.total)}</p>
                      <p className="text-xs text-muted-foreground">Paid: {formatCurrency(sale.paid)}</p>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 rounded p-2">
                    {sale.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="py-1.5 flex justify-between items-start text-xs border-b border-border/30 last:border-b-0">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                            {item.discount > 0 && ` (Discount: ${formatCurrency(item.discount)})`}
                          </p>
                        </div>
                        <p className="font-semibold text-right ml-2">
                          {formatCurrency((item.quantity * item.unitPrice) - item.discount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedSaleId && (
            <div className="space-y-4">
              {(() => {
                const sale = customerSales.find(s => s.id === selectedSaleId);
                if (!sale) return null;
                return (
                  <>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Invoice:</span>
                        <span className="font-semibold">{sale.invoiceNo}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="font-semibold">{formatCurrency(sale.total)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Already Paid:</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(sale.paid)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-border pt-2">
                        <span className="text-muted-foreground">Remaining Debt:</span>
                        <span className="font-semibold text-red-600">{formatCurrency(sale.due)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentAmount" className="text-sm font-semibold">Payment Amount</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">₵</span>
                        <Input
                          id="paymentAmount"
                          type="number"
                          placeholder="0.00"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          min="0"
                          max={sale.due}
                          step="0.01"
                          disabled={isSaving}
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Max payment: {formatCurrency(sale.due)}
                      </p>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">After Payment:</p>
                      {paymentAmount ? (
                        <>
                          <p className="text-sm font-semibold">
                            New Paid: <span className="text-blue-600">{formatCurrency(sale.paid + parseFloat(paymentAmount))}</span>
                          </p>
                          <p className="text-sm font-semibold">
                            New Debt: <span className="text-red-600">{formatCurrency(Math.max(0, sale.due - parseFloat(paymentAmount)))}</span>
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Enter amount to see preview</p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => setPaymentDialog(false)}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRecordPayment}
                        disabled={isSaving || !paymentAmount}
                        className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <DollarSign size={16} />
                            Record Payment
                          </>
                        )}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default CustomerSalesDetail;
