import { useState } from "react";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Department } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Departments = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Department[]>(store.getDepartments());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", description: "", status: "Active" as Department["status"] });

  const save = () => {
    if (!form.name.trim()) return;
    const data: Department = { id: editing?.id || Date.now().toString(), ...form };
    const updated = editing ? items.map(i => i.id === editing.id ? data : i) : [...items, data];
    setItems(updated);
    store.saveDepartments(updated);
    setShowForm(false); setEditing(null); setForm({ name: "", description: "", status: "Active" });
    toast({ title: editing ? "Updated" : "Created" });
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Departments" rightAction={
        <button onClick={() => { setEditing(null); setForm({ name: "", description: "", status: "Active" }); setShowForm(true); }} className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><Plus size={16} className="text-primary-foreground" /></button>
      } />
      <div className="px-4 py-3">
        <div className="relative mb-3"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" /></div>
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold text-sm">{item.name}</p>
                <p className="text-[11px] text-muted-foreground">{item.description}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{item.status}</span>
              <div className="flex gap-1">
                <button onClick={() => { setForm({ name: item.name, description: item.description, status: item.status }); setEditing(item); setShowForm(true); }} className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning"><Edit size={14} /></button>
                <button onClick={() => { const u = items.filter(x => x.id !== item.id); setItems(u); store.saveDepartments(u); }} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Department" : "Add Department"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Department Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Department["status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
            </Select>
            <button onClick={save} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">{editing ? "Update" : "Save"}</button>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default Departments;
