import { useState } from "react";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Customer } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Customers = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>(store.getCustomers());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", type: "Retailer" as Customer["type"], initialDue: "0" });

  const resetForm = () => setForm({ name: "", phone: "", email: "", address: "", type: "Retailer", initialDue: "0" });

  const openEdit = (c: Customer) => {
    setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, type: c.type, initialDue: String(c.initialDue) });
    setEditing(c);
    setShowForm(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    const data: Customer = {
      id: editing?.id || Date.now().toString(),
      ...form,
      initialDue: Number(form.initialDue) || 0,
      due: editing ? editing.due : Number(form.initialDue) || 0,
    };
    const updated = editing ? customers.map(c => c.id === editing.id ? data : c) : [...customers, data];
    setCustomers(updated);
    store.saveCustomers(updated);
    setShowForm(false);
    resetForm();
    setEditing(null);
    toast({ title: editing ? "Customer updated" : "Customer added" });
  };

  const deleteCustomer = (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    store.saveCustomers(updated);
    toast({ title: "Customer deleted" });
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Customers" rightAction={
        <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Plus size={16} className="text-primary-foreground" />
        </button>
      } />
      <div className="px-4 py-3">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="pl-9" />
        </div>
        {selected.size > 0 && (
          <button onClick={() => {
            const updated = customers.filter(c => !selected.has(c.id));
            setCustomers(updated); store.saveCustomers(updated); setSelected(new Set());
          }} className="text-xs bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg font-semibold mb-2">Delete Selected ({selected.size})</button>
        )}
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => { const n = new Set(selected); n.has(c.id) ? n.delete(c.id) : n.add(c.id); setSelected(n); }} className="mt-1 accent-primary" />
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{c.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">{c.phone} • {c.type}</p>
                  {c.due > 0 && <p className="text-xs text-warning font-semibold mt-0.5">Due: $ {c.due.toLocaleString()}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setShowView(c)} className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center text-info"><Eye size={14} /></button>
                  <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning"><Edit size={14} /></button>
                  <button onClick={() => deleteCustomer(c.id)} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">No customers</p>}
        </div>
      </div>

      <Dialog open={!!showView} onOpenChange={() => setShowView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{showView?.name}</DialogTitle></DialogHeader>
          {showView && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{showView.phone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{showView.email || "-"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{showView.address || "-"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-semibold">{showView.type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span className="font-bold text-warning">$ {showView.due.toLocaleString()}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { resetForm(); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Customer["type"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Retailer">Retailer</SelectItem>
                <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                <SelectItem value="Dealer">Dealer</SelectItem>
              </SelectContent>
            </Select>
            <div><label className="text-[11px] text-muted-foreground">Initial Due</label><Input type="number" value={form.initialDue} onChange={(e) => setForm({ ...form, initialDue: e.target.value })} /></div>
            <button onClick={save} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">{editing ? "Update" : "Save"}</button>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default Customers;
