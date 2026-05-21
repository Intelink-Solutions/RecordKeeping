import { useState } from "react";
import { Plus, Search, Edit, Trash2, Upload } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Category } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { fileToBase64, getIconForType } from "@/lib/image-utils";
import { useDebounce } from "@/hooks/use-debounce";
import { apiCreateCategory, apiUpdateCategory, apiDeleteCategory } from "@/lib/api";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { useLiveData, showSaved } from "@/hooks/use-live-data";

const Categories = () => {
  const { toast } = useToast();
  const categories = useLiveData(() => store.getCategories());
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState("");
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Category | null>(null);

  const filtered = categories.filter(c => c.name.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await apiCreateCategory(name.trim());
      await syncLiveBusinessData();
      setName(""); setDesc(""); setIcon(""); setIconPreview(null); setShowAdd(false);
      showSaved("Category added!");
    } catch (e: any) {
      toast({ title: e.message || "Failed to add category", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await apiUpdateCategory(editItem.id, editItem.name);
      await syncLiveBusinessData();
      setEditItem(null);
    } catch (e: any) {
      toast({ title: e.message || "Failed to update category", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deleteItem = async (id: string) => {
    try {
      await apiDeleteCategory(id);
      await syncLiveBusinessData();
    } catch (e: any) {
      toast({ title: e.message || "Failed to delete category", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Categories" />
      <div className="px-4 py-3 space-y-3">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {filtered.map(c => (
          <div key={c.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-lg flex-shrink-0">
              {c.icon ? (
                <img src={c.icon} alt={c.name} className="w-full h-full object-cover rounded" onError={(e) => { e.currentTarget.style.display = "none"; if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = "flex"; }} />
              ) : null}
              <span style={{ display: c.icon ? "none" : "flex" }} className="w-full h-full bg-accent flex items-center justify-center">
                {getIconForType("category", c.name)}
              </span>
            </div>
            <div className="flex-1"><p className="font-semibold text-sm">{c.name}</p>{c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}</div>
            <button onClick={() => setEditItem(c)} className="p-1"><Edit size={14} className="text-muted-foreground" /></button>
            <button onClick={() => deleteItem(c.id)} className="p-1"><Trash2 size={14} className="text-destructive" /></button>
          </div>
        ))}
      </div>
      <button onClick={() => setShowAdd(true)} className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center"><Plus size={24} /></button>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Icon Upload */}
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center text-xl border-2 border-dashed border-border overflow-hidden flex-shrink-0">
                {iconPreview ? (
                  <img src={iconPreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <span>{getIconForType("category")}</span>
                )}
              </div>
              <label className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer text-sm font-medium hover:bg-primary/90">
                <Upload size={14} />
                <span>Icon</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const base64 = await fileToBase64(file);
                      setIcon(base64);
                      setIconPreview(base64);
                    }
                  }}
                />
              </label>
            </div>
            <Input placeholder="Name *" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
            <button onClick={add} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
          {editItem && <div className="space-y-3">
            {/* Icon Display */}
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center text-xl border-2 border-dashed border-border overflow-hidden flex-shrink-0">
                {editItem.icon ? (
                  <img src={editItem.icon} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <span>{getIconForType("category", editItem.name)}</span>
                )}
              </div>
              <label className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer text-sm font-medium hover:bg-primary/90">
                <Upload size={14} />
                <span>Icon</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const base64 = await fileToBase64(file);
                      setEditItem({ ...editItem, icon: base64 });
                    }
                  }}
                />
              </label>
            </div>
            <Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} />
            <Input value={editItem.description || ""} onChange={e => setEditItem({ ...editItem, description: e.target.value })} />
            <button onClick={saveEdit} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60">{saving ? "Updating..." : "Update"}</button>
          </div>}
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default Categories;
