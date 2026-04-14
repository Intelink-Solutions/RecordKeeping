import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Category } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Categories = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Category[]>(store.getCategories());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const save = () => {
    if (!form.name.trim()) return;
    const data: Category = { id: editing?.id || Date.now().toString(), ...form };
    const updated = editing ? items.map(i => i.id === editing.id ? data : i) : [...items, data];
    setItems(updated);
    store.saveCategories(updated);
    setShowForm(false);
    setEditing(null);
    setForm({ name: "", description: "" });
    toast({ title: editing ? "Updated" : "Created" });
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Categories" rightAction={
        <button onClick={() => { setEditing(null); setForm({ name: "", description: "" }); setShowForm(true); }} className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><Plus size={16} className="text-primary-foreground" /></button>
      } />
      <div className="px-4 py-3">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
        </div>
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold text-sm">{item.name}</p>
                <p className="text-[11px] text-muted-foreground">{item.description}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setForm({ name: item.name, description: item.description }); setEditing(item); setShowForm(true); }} className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning"><Edit size={14} /></button>
                <button onClick={() => { const u = items.filter(x => x.id !== item.id); setItems(u); store.saveCategories(u); }} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Category Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <button onClick={save} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">{editing ? "Update" : "Save"}</button>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default Categories;
