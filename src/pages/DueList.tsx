import { useState } from "react";
import { Search, DollarSign } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Tab = "customers" | "suppliers" | "guests";

const DueList = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("customers");
  const [search, setSearch] = useState("");
  const [collectDialog, setCollectDialog] = useState<{ type: "customer" | "supplier"; id: string; name: string; due: number } | null>(null);
  const [collectAmount, setCollectAmount] = useState("");

  const customers = store.getCustomers();
  const suppliers = store.getSuppliers();
  const sales = store.getSales();

  const customerDues = customers.filter(c => c.due > 0 && c.name.toLowerCase().includes(search.toLowerCase()));
  const supplierDues = suppliers.filter(s => s.due > 0 && s.name.toLowerCase().includes(search.toLowerCase()));
  const guestDues = sales.filter(s => !s.customerId && s.due > 0 && s.customerName.toLowerCase().includes(search.toLowerCase()));

  const totalCustomerDue = customers.reduce((s, c) => s + c.due, 0);
  const totalSupplierDue = suppliers.reduce((s, su) => s + su.due, 0);
  const totalGuestDue = guestDues.reduce((s, sale) => s + sale.due, 0);

  const collectDue = () => {
    if (!collectDialog) return;
    const amount = Number(collectAmount);
    if (amount <= 0 || amount > collectDialog.due) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (collectDialog.type === "customer") {
      const updated = customers.map(c => c.id === collectDialog.id ? { ...c, due: c.due - amount } : c);
      store.saveCustomers(updated);
    } else {
      const updated = suppliers.map(s => s.id === collectDialog.id ? { ...s, due: s.due - amount } : s);
      store.saveSuppliers(updated);
    }
    toast({ title: `$ ${amount.toLocaleString()} collected!` });
    setCollectDialog(null);
    setCollectAmount("");
    // Force re-render
    window.location.reload();
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "customers", label: "Customers", count: customerDues.length },
    { key: "suppliers", label: "Suppliers", count: supplierDues.length },
    { key: "guests", label: "Guests", count: guestDues.length },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Due List" />

      {/* Summary */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2">
        <div className="bg-warning/10 rounded-xl p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Customer Due</p>
          <p className="font-bold text-sm text-warning">$ {totalCustomerDue.toLocaleString()}</p>
        </div>
        <div className="bg-info/10 rounded-xl p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Supplier Due</p>
          <p className="font-bold text-sm text-info">$ {totalSupplierDue.toLocaleString()}</p>
        </div>
        <div className="bg-primary/10 rounded-xl p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Guest Due</p>
          <p className="font-bold text-sm text-primary">$ {totalGuestDue.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2 mb-3">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="px-4 mb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
        </div>
      </div>

      <div className="px-4 space-y-2">
        {tab === "customers" && customerDues.map(c => (
          <div key={c.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{c.name[0]}</div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{c.name}</p>
              <p className="text-[11px] text-muted-foreground">{c.type} • {c.phone}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm text-warning">$ {c.due.toLocaleString()}</p>
              <button onClick={() => setCollectDialog({ type: "customer", id: c.id, name: c.name, due: c.due })} className="text-[10px] text-primary font-bold mt-0.5">Collect</button>
            </div>
          </div>
        ))}
        {tab === "suppliers" && supplierDues.map(s => (
          <div key={s.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center text-info font-bold text-sm">{s.name[0]}</div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{s.name}</p>
              <p className="text-[11px] text-muted-foreground">{s.phone}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm text-warning">$ {s.due.toLocaleString()}</p>
              <button onClick={() => setCollectDialog({ type: "supplier", id: s.id, name: s.name, due: s.due })} className="text-[10px] text-primary font-bold mt-0.5">Pay</button>
            </div>
          </div>
        ))}
        {tab === "guests" && guestDues.map(s => (
          <div key={s.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">G</div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{s.invoiceNo}</p>
              <p className="text-[11px] text-muted-foreground">{s.date}</p>
            </div>
            <p className="font-bold text-sm text-warning">$ {s.due.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <Dialog open={!!collectDialog} onOpenChange={() => setCollectDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Collect Due - {collectDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Outstanding: <strong className="text-warning">$ {collectDialog?.due.toLocaleString()}</strong></p>
            <Input type="number" placeholder="Amount to collect" value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)} />
            <button onClick={collectDue} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Collect</button>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default DueList;
