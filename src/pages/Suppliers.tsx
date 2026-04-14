import { useState } from "react";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Supplier } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Suppliers = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>(store.getSuppliers());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState<Supplier | null>(null);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", due: "0" });

  const resetForm = () => setForm({ name: "", phone: "", email: "", address: "", due: "0" });

  const save = () => {
    if (!form.name.trim()) return;
    const data: Supplier = { id: editing?.id || Date.now().toString(), ...form, due: editing ? editing.due : Number(form.due) || 0 };
    const updated = editing ? suppliers.map(s => s.id === editing.id ? data : s) : [...suppliers, data];
    setSuppliers(updated);
    store.saveSuppliers(updated);
    setShowForm(false);
    resetForm();
    setEditing(null);
    toast({ title: editing ? "Supplier updated" : "Supplier added" });
  };

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search));

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Suppliers" rightAction={
        <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><Plus size={16} className="text-primary-foreground" /></button>
      } />
      <div className="px-4 py-3">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." className="pl-9" />
        </div>
        {selected.size > 0 && (
          <button onClick={() => {
            const updated = suppliers.filter(s => !selected.has(s.id));
            setSuppliers(updated); store.saveSuppliers(updated); setSelected(new Set());
          }} className="text-xs bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg font-semibold mb-2">Delete Selected ({selected.size})</button>
        )}
        <div className="space-y-2">
          {filtered.map(s => (
            <div key={s.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => { const n = new Set(selected); n.has(s.id) ? n.delete(s.id) : n.add(s.id); setSelected(n); }} className="mt-1 accent-primary" />
                <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center text-info font-bold text-sm">{s.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.phone}</p>
                  {s.due > 0 && <p className="text-xs text-warning font-semibold mt-0.5">Due: $ {s.due.toLocaleString()}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setShowView(s)} className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center text-info"><Eye size={14} /></button>
                  <button onClick={() => { setForm({ name: s.name, phone: s.phone, email: s.email, address: s.address, due: String(s.due) }); setEditing(s); setShowForm(true); }} className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning"><Edit size={14} /></button>
                  <button onClick={() => { const u = suppliers.filter(x => x.id !== s.id); setSuppliers(u); store.saveSuppliers(u); }} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">No suppliers</p>}
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
              <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span className="font-bold text-warning">$ {showView.due.toLocaleString()}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { resetForm(); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            {!editing && <div><label className="text-[11px] text-muted-foreground">Initial Due</label><Input type="number" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></div>}
            <button onClick={save} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">{editing ? "Update" : "Save"}</button>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default Suppliers;
