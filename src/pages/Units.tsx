import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Unit } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Units = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Unit[]>(store.getUnits());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [form, setForm] = useState({ name: "", shortName: "" });

  const save = () => {
    if (!form.name.trim()) return;
    const data: Unit = { id: editing?.id || Date.now().toString(), ...form };
    const updated = editing ? items.map(i => i.id === editing.id ? data : i) : [...items, data];
    setItems(updated);
    store.saveUnits(updated);
    setShowForm(false);
    setEditing(null);
    setForm({ name: "", shortName: "" });
    toast({ title: editing ? "Updated" : "Created" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Units" rightAction={
        <button onClick={() => { setEditing(null); setForm({ name: "", shortName: "" }); setShowForm(true); }} className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><Plus size={16} className="text-primary-foreground" /></button>
      } />
      <div className="px-4 py-3 space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-sm">{item.name}</p>
              <p className="text-[11px] text-muted-foreground">Short: {item.shortName}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setForm({ name: item.name, shortName: item.shortName }); setEditing(item); setShowForm(true); }} className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning"><Edit size={14} /></button>
              <button onClick={() => { const u = items.filter(x => x.id !== item.id); setItems(u); store.saveUnits(u); }} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Unit" : "Add Unit"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Unit Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Short Name" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} />
            <button onClick={save} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">{editing ? "Update" : "Save"}</button>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default Units;
