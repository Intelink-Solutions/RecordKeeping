import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiCreateExpenseCategory, apiDeleteExpenseCategory } from "@/lib/api";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { useLiveData, showSaved } from "@/hooks/use-live-data";

const ExpenseCategories = () => {
  const { toast } = useToast();
  const categories = useLiveData(() => store.getExpenseCategories());
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebounce(search);

  const filtered = categories.filter(c => c.name.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiCreateExpenseCategory(name.trim());
      await syncLiveBusinessData();
      setName(""); setDesc(""); setShowAdd(false); showSaved("Added!");
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to add", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deleteItem = async (id: string) => {
    try {
      await apiDeleteExpenseCategory(id);
      await syncLiveBusinessData();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to delete", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="Expense Categories" />
      <div className="px-4 py-3 space-y-3">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {filtered.map(c => (
          <div key={c.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
            <div className="flex-1"><p className="font-semibold text-sm">{c.name}</p>{c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}</div>
            <button onClick={() => deleteItem(c.id)} className="p-1"><Trash2 size={14} className="text-destructive" /></button>
          </div>
        ))}
      </div>
      <button onClick={() => setShowAdd(true)} className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center"><Plus size={24} /></button>
      <Dialog open={showAdd} onOpenChange={setShowAdd}><DialogContent><DialogHeader><DialogTitle>Add Expense Category</DialogTitle></DialogHeader>
        <div className="space-y-3"><Input placeholder="Name *" value={name} onChange={e => setName(e.target.value)} /><Input placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} /><button onClick={add} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60">{saving ? "Saving..." : "Save"}</button></div>
      </DialogContent></Dialog>
      <BottomNav />
    </div>
  );
};

export default ExpenseCategories;
