import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Sale } from "@/lib/store";
import { Search, Trash2, Eye, Edit, RotateCcw, MoreVertical, Printer, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InvoiceModal from "@/components/InvoiceModal";
import { useAppContext } from "@/hooks/use-app-context";
import { formatCurrency } from "@/lib/currency";
import { useDebounce } from "@/hooks/use-debounce";

const SalesList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canManageData, roleLabel } = useAppContext();
  const [sales, setSales] = useState(store.getSales());
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [menuSaleId, setMenuSaleId] = useState<string | null>(null);
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const biz = store.getBusinessProfile();

  const sanitizePhoneForWhatsapp = (phone?: string): string => {
    if (!phone) return "";
    return phone.replace(/[^\d]/g, "");
  };

  const buildSaleWhatsappMessage = (sale: Sale): string => {
    const toMoney = (n: number) => formatCurrency(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const lines = [
      `*${biz.companyName}*`,
      "Sale Invoice",
      `Invoice: ${sale.invoiceNo}`,
      `Date: ${sale.date}`,
      `Customer: ${sale.customerName}`,
      ...(sale.customerPhone ? [`Phone: ${sale.customerPhone}`] : []),
      "",
      "*Items:*",
      ...sale.items.map((item, i) => `${i + 1}. ${item.name} x${item.quantity} = ${toMoney(item.unitPrice * item.quantity)}`),
      "",
      `Subtotal: ${toMoney(sale.subtotal)}`,
      ...(sale.vat > 0 ? [`VAT (${sale.vatPercent}%): ${toMoney(sale.vat)}`] : []),
      ...(sale.discount > 0 ? [`Discount: -${toMoney(sale.discount)}`] : []),
      `*Total: ${toMoney(sale.total)}*`,
      `Paid: ${toMoney(sale.paid)}`,
      ...(sale.due > 0 ? [`Due: ${toMoney(sale.due)}`] : []),
      ...((sale.change ?? 0) > 0 ? [`Change: ${toMoney(sale.change ?? 0)}`] : []),
      "",
      "Thank you for your business!",
    ];
    return lines.join("\n");
  };

  const shareSaleOnWhatsapp = (sale: Sale) => {
    const text = encodeURIComponent(buildSaleWhatsappMessage(sale));
    const phone = sanitizePhoneForWhatsapp(sale.customerPhone);
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setMenuSaleId(null);
  };

  const filtered = sales.filter(s =>
    s.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    s.invoiceNo.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const deleteSale = (id: string) => {
    const sale = sales.find(s => s.id === id);
    if (sale?.returned) {
      toast({ title: "Cannot delete returned sale", variant: "destructive" });
      return;
    }
    const updated = sales.filter(s => s.id !== id);
    setSales(updated);
    store.saveSales(updated);
    setMenuSaleId(null);
    toast({ title: "Sale deleted" });
  };

  const multiDelete = () => {
    const updated = sales.filter(s => !selectedIds.includes(s.id) || s.returned);
    setSales(updated);
    store.saveSales(updated);
    setSelectedIds([]);
    toast({ title: `${sales.length - updated.length} sales deleted` });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Sales List" rightAction={
        canManageData && selectedIds.length > 0 ? (
          <button onClick={multiDelete} className="text-destructive text-sm font-semibold">Delete ({selectedIds.length})</button>
        ) : undefined
      } />

      <div className="px-4 py-3">
        {!canManageData && (
          <div className="mb-3 text-xs rounded-lg border border-warning/30 bg-warning/10 text-warning px-3 py-2">
            {roleLabel} access: view-only mode
          </div>
        )}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or invoice..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-start gap-3">
                {canManageData ? (
                  <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} className="mt-1 accent-primary" />
                ) : (
                  <span className="w-4" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-semibold text-sm">{s.customerName}</p>
                      <span className={`inline-block mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        s.status === "Paid" ? "bg-success/15 text-success" : s.status === "Due" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                      }`}>{s.status}</span>
                      {s.returned && <span className="ml-1 inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Returned</span>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">#{s.invoiceNo}</p>
                      <p className="text-xs text-muted-foreground">{s.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Total: {formatCurrency(s.total)}</p>
                      {s.due > 0 && <p className="text-xs text-destructive font-semibold">Due: {formatCurrency(s.due)}</p>}
                      <p className="text-xs font-semibold text-primary">Profit: {formatCurrency(s.profit)}</p>
                    </div>
                    <div className="relative">
                      <button onClick={() => setMenuSaleId(menuSaleId === s.id ? null : s.id)} className="p-1"><MoreVertical size={18} className="text-muted-foreground" /></button>
                      {menuSaleId === s.id && (
                        <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[140px]">
                          <button onClick={() => { setViewSale(s); setMenuSaleId(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent"><Eye size={14} /> View Invoice</button>
                          <button onClick={() => shareSaleOnWhatsapp(s)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-success"><MessageCircle size={14} /> WhatsApp</button>
                          <button onClick={() => { setPrintSale(s); setMenuSaleId(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent"><Printer size={14} /> Print</button>
                          {canManageData && !s.returned && (
                            <>
                              <button onClick={() => { navigate(`/sale-return/${s.id}`); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-warning"><RotateCcw size={14} /> Sale Return</button>
                              <button onClick={() => deleteSale(s.id)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-destructive"><Trash2 size={14} /> Delete</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No sales found</p>}
        </div>
      </div>

      {/* Invoice Dialog */}
      <Dialog open={!!viewSale} onOpenChange={() => setViewSale(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invoice #{viewSale?.invoiceNo}</DialogTitle></DialogHeader>
          {viewSale && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-semibold">{viewSale.customerName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{viewSale.date}</span></div>
              <div className="border-t border-border pt-2 space-y-1">
                {viewSale.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{item.name} × {item.quantity}</span>
                    <span>{formatCurrency(item.unitPrice * item.quantity, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2 space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(viewSale.subtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                {viewSale.vat > 0 && <div className="flex justify-between"><span>VAT</span><span>{formatCurrency(viewSale.vat, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                {viewSale.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(viewSale.discount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                <div className="flex justify-between font-bold text-primary"><span>Total</span><span>{formatCurrency(viewSale.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between"><span>Paid</span><span>{formatCurrency(viewSale.paid, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                {viewSale.due > 0 && <div className="flex justify-between text-destructive"><span>Due</span><span>{formatCurrency(viewSale.due, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {printSale && (
        <InvoiceModal
          open={!!printSale}
          onClose={() => setPrintSale(null)}
          data={{
            invoiceNo: printSale.invoiceNo, date: printSale.date,
            customerName: printSale.customerName, phone: printSale.customerPhone,
            items: printSale.items, subtotal: printSale.subtotal,
            vat: printSale.vat, vatPercent: printSale.vatPercent,
            discount: printSale.discount, total: printSale.total,
            paid: printSale.paid, due: printSale.due, change: printSale.change,
            type: "Sale",
          }}
        />
      )}

      {canManageData && (
        <button onClick={() => navigate("/add-sale")} className="fixed bottom-24 right-5 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-xl font-semibold text-sm">+ New Sale</button>
      )}
      <BottomNav />
    </div>
  );
};

export default SalesList;
