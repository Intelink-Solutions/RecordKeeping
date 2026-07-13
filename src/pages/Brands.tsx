import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Brand } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiCreateBrand, apiUpdateBrand, apiDeleteBrand } from "@/lib/api";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { useLiveData, showSaved } from "@/hooks/use-live-data";

const Brands = () => {
  const { toast } = useToast();
  const brands = useLiveData(() => store.getBrands());
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [name, setName] = useState("");
  const [editItem, setEditItem] = useState<Brand | null>(null);

  const filtered = brands.filter(b => b.name.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiCreateBrand(name.trim());
      await syncLiveBusinessData();
      setName(""); setShowAdd(false); showSaved("Brand added!");
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to add brand", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await apiUpdateBrand(editItem.id, editItem.name);
      await syncLiveBusinessData();
      setEditItem(null);
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to update brand", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deleteItem = async (id: string) => {
    try {
      await apiDeleteBrand(id);
      await syncLiveBusinessData();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to delete brand", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="Brands" />
      <div className="px-4 py-3 space-y-3">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {filtered.map(b => (
          <div key={b.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
            <div className="flex-1"><p className="font-semibold text-sm">{b.name}</p></div>
            <button onClick={() => setEditItem(b)} className="p-1"><Edit size={14} className="text-muted-foreground" /></button>
            <button onClick={() => deleteItem(b.id)} className="p-1"><Trash2 size={14} className="text-destructive" /></button>
          </div>
        ))}
      </div>
      <button onClick={() => setShowAdd(true)} className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center"><Plus size={24} /></button>
      <Dialog open={showAdd} onOpenChange={setShowAdd}><DialogContent><DialogHeader><DialogTitle>Add Brand</DialogTitle></DialogHeader>
        <div className="space-y-3"><Input placeholder="Brand Name *" value={name} onChange={e => setName(e.target.value)} /><button onClick={add} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60">{saving ? "Saving..." : "Save"}</button></div>
      </DialogContent></Dialog>
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}><DialogContent><DialogHeader><DialogTitle>Edit Brand</DialogTitle></DialogHeader>
        {editItem && <div className="space-y-3"><Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} /><button onClick={saveEdit} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60">{saving ? "Updating..." : "Update"}</button></div>}
      </DialogContent></Dialog>
      <BottomNav />
    </div>
  );
};

export default Brands;
