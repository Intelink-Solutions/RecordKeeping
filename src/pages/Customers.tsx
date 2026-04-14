import { useState } from "react";
import { Plus, Search, Edit, Trash2, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Customer } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const typeColors: Record<string, string> = { Dealer: "#e74c3c", Retailer: "#e67e22", Wholesaler: "#27ae60" };

const Customers = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState(store.getCustomers());
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", type: "Retailer" as Customer["type"], initialDue: "0" });

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));

  const resetForm = () => setForm({ name: "", phone: "", email: "", address: "", type: "Retailer", initialDue: "0" });

  const addCustomer = () => {
    if (!form.name.trim()) return;
    const due = Number(form.initialDue) || 0;
    const updated = [...customers, { id: store.nextId(), name: form.name.trim(), phone: form.phone, email: form.email, address: form.address, type: form.type, initialDue: due, due }];
    setCustomers(updated); store.saveCustomers(updated);
    resetForm(); setShowAdd(false);
    toast({ title: "Customer added!" });
  };

  const saveEdit = () => {
    if (!editCustomer) return;
    const updated = customers.map(c => c.id === editCustomer.id ? editCustomer : c);
    setCustomers(updated); store.saveCustomers(updated);
    setEditCustomer(null); toast({ title: "Updated!" });
  };

  const deleteCustomer = (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated); store.saveCustomers(updated);
    toast({ title: "Deleted" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Customers" />
      <div className="px-4 py-3 space-y-3">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {filtered.map(c => (
          <div key={c.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-lg font-bold text-accent-foreground">{c.name[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{c.name}</p>
              <p className="text-xs font-semibold" style={{ color: typeColors[c.type] }}>{c.type}</p>
              {c.phone && <p className="text-[11px] text-muted-foreground">{c.phone}</p>}
            </div>
            <div className="text-right">
              {c.due > 0 && <><p className="font-bold text-sm">$ {c.due.toLocaleString()}</p><p className="text-[10px] text-warning font-medium">Due</p></>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditCustomer(c)} className="p-1"><Edit size={14} className="text-muted-foreground" /></button>
              <button onClick={() => deleteCustomer(c.id)} className="p-1"><Trash2 size={14} className="text-destructive" /></button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => { resetForm(); setShowAdd(true); }} className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center"><Plus size={24} /></button>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as Customer["type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Retailer">Retailer</SelectItem><SelectItem value="Wholesaler">Wholesaler</SelectItem><SelectItem value="Dealer">Dealer</SelectItem></SelectContent></Select>
            <Input placeholder="Initial Due" type="number" value={form.initialDue} onChange={e => setForm({ ...form, initialDue: e.target.value })} />
            <button onClick={addCustomer} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Save</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCustomer} onOpenChange={() => setEditCustomer(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
          {editCustomer && (
            <div className="space-y-3">
              <Input value={editCustomer.name} onChange={e => setEditCustomer({ ...editCustomer, name: e.target.value })} />
              <Input value={editCustomer.phone || ""} onChange={e => setEditCustomer({ ...editCustomer, phone: e.target.value })} placeholder="Phone" />
              <Select value={editCustomer.type} onValueChange={v => setEditCustomer({ ...editCustomer, type: v as Customer["type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Retailer">Retailer</SelectItem><SelectItem value="Wholesaler">Wholesaler</SelectItem><SelectItem value="Dealer">Dealer</SelectItem></SelectContent></Select>
              <button onClick={saveEdit} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Update</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default Customers;
