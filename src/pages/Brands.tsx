import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Brand } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Brands = () => {
  const { toast } = useToast();
  const [brands, setBrands] = useState(store.getBrands());
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [name, setName] = useState("");
  const [editItem, setEditItem] = useState<Brand | null>(null);

  const filtered = brands.filter(b => b.name.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const add = () => {
    if (!name.trim()) return;
    const updated = [...brands, { id: store.nextId(), name: name.trim() }];
    setBrands(updated); store.saveBrands(updated);
    setName(""); setShowAdd(false); toast({ title: "Brand added!" });
  };

  const saveEdit = () => {
    if (!editItem) return;
    const updated = brands.map(b => b.id === editItem.id ? editItem : b);
    setBrands(updated); store.saveBrands(updated); setEditItem(null);
  };

  const deleteItem = (id: string) => {
    const updated = brands.filter(b => b.id !== id);
    setBrands(updated); store.saveBrands(updated);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
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
        <div className="space-y-3"><Input placeholder="Brand Name *" value={name} onChange={e => setName(e.target.value)} /><button onClick={add} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Save</button></div>
      </DialogContent></Dialog>
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}><DialogContent><DialogHeader><DialogTitle>Edit Brand</DialogTitle></DialogHeader>
        {editItem && <div className="space-y-3"><Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} /><button onClick={saveEdit} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Update</button></div>}
      </DialogContent></Dialog>
      <BottomNav />
    </div>
  );
};

export default Brands;
