import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Supplier } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Suppliers = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState(store.getSuppliers());
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", initialDue: "0" });

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const addSupplier = () => {
    if (!form.name.trim()) return;
    const due = Number(form.initialDue) || 0;
    const updated = [...suppliers, { id: store.nextId(), name: form.name.trim(), phone: form.phone, email: form.email, address: form.address, initialDue: due, due }];
    setSuppliers(updated); store.saveSuppliers(updated);
    setForm({ name: "", phone: "", email: "", address: "", initialDue: "0" }); setShowAdd(false);
    toast({ title: "Supplier added!" });
  };

  const saveEdit = () => {
    if (!editSupplier) return;
    const updated = suppliers.map(s => s.id === editSupplier.id ? editSupplier : s);
    setSuppliers(updated); store.saveSuppliers(updated);
    setEditSupplier(null);
  };

  const deleteSupplier = (id: string) => {
    const updated = suppliers.filter(s => s.id !== id);
    setSuppliers(updated); store.saveSuppliers(updated);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Suppliers" />
      <div className="px-4 py-3 space-y-3">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {filtered.map(s => (
          <div key={s.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-info/15 flex items-center justify-center text-lg font-bold text-info">{s.name[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{s.name}</p>
              {s.phone && <p className="text-[11px] text-muted-foreground">{s.phone}</p>}
            </div>
            <div className="text-right">
              {s.due > 0 && <><p className="font-bold text-sm">$ {s.due.toLocaleString()}</p><p className="text-[10px] text-warning font-medium">Due</p></>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditSupplier(s)} className="p-1"><Edit size={14} className="text-muted-foreground" /></button>
              <button onClick={() => deleteSupplier(s.id)} className="p-1"><Trash2 size={14} className="text-destructive" /></button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setShowAdd(true)} className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center"><Plus size={24} /></button>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <Input placeholder="Initial Due" type="number" value={form.initialDue} onChange={e => setForm({ ...form, initialDue: e.target.value })} />
            <button onClick={addSupplier} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Save</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSupplier} onOpenChange={() => setEditSupplier(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Supplier</DialogTitle></DialogHeader>
          {editSupplier && (
            <div className="space-y-3">
              <Input value={editSupplier.name} onChange={e => setEditSupplier({ ...editSupplier, name: e.target.value })} />
              <Input value={editSupplier.phone || ""} onChange={e => setEditSupplier({ ...editSupplier, phone: e.target.value })} placeholder="Phone" />
              <button onClick={saveEdit} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Update</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default Suppliers;
