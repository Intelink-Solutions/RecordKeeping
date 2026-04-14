import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, VatRate } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const VatSettings = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<VatRate[]>(store.getVatRates());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VatRate | null>(null);
  const [form, setForm] = useState({ name: "", rate: "" });

  const save = () => {
    if (!form.name.trim()) return;
    const data: VatRate = { id: editing?.id || Date.now().toString(), name: form.name, rate: Number(form.rate) || 0 };
    const updated = editing ? items.map(i => i.id === editing.id ? data : i) : [...items, data];
    setItems(updated);
    store.saveVatRates(updated);
    setShowForm(false);
    setEditing(null);
    setForm({ name: "", rate: "" });
    toast({ title: editing ? "Updated" : "Created" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="VAT Settings" rightAction={
        <button onClick={() => { setEditing(null); setForm({ name: "", rate: "" }); setShowForm(true); }} className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><Plus size={16} className="text-primary-foreground" /></button>
      } />
      <div className="px-4 py-3 space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-sm">{item.name}</p>
              <p className="text-[11px] text-muted-foreground">{item.rate}%</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setForm({ name: item.name, rate: String(item.rate) }); setEditing(item); setShowForm(true); }} className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning"><Edit size={14} /></button>
              <button onClick={() => { const u = items.filter(x => x.id !== item.id); setItems(u); store.saveVatRates(u); }} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit VAT" : "Add VAT"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="VAT Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input type="number" placeholder="Rate (%)" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
            <button onClick={save} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">{editing ? "Update" : "Save"}</button>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default VatSettings;
