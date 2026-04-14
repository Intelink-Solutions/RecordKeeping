import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, MoreVertical, Edit2, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CrudListPageProps<T extends { id: string }> {
  title: string;
  items: T[];
  onSave: (items: T[]) => void;
  columns: { key: keyof T; label: string }[];
  renderForm: (item: Partial<T>, onChange: (field: keyof T, value: any) => void) => React.ReactNode;
  createDefaults: () => Partial<T>;
  searchKey: keyof T;
  displayName: string;
}

function CrudListPage<T extends { id: string }>({
  title, items: initialItems, onSave, columns, renderForm, createDefaults, searchKey, displayName,
}: CrudListPageProps<T>) {
  const { toast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Partial<T> | null>(null);
  const [showView, setShowView] = useState<T | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = items.filter((item) =>
    String(item[searchKey]).toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditItem(createDefaults()); setShowForm(true); };
  const openEdit = (item: T) => { setEditItem({ ...item }); setShowForm(true); setActiveMenu(null); };

  const handleSave = () => {
    if (!editItem) return;
    let updated: T[];
    if ((editItem as T).id && items.find((i) => i.id === (editItem as T).id)) {
      updated = items.map((i) => (i.id === (editItem as T).id ? (editItem as T) : i));
    } else {
      const newItem = { ...editItem, id: Date.now().toString() + Math.random().toString(36).slice(2, 6) } as T;
      updated = [newItem, ...items];
    }
    setItems(updated);
    onSave(updated);
    setShowForm(false);
    setEditItem(null);
    toast({ title: `${displayName} saved!` });
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    onSave(updated);
    setActiveMenu(null);
    toast({ title: `${displayName} deleted` });
  };

  const handleMultiDelete = () => {
    const updated = items.filter((i) => !selectedIds.includes(i.id));
    setItems(updated);
    onSave(updated);
    setSelectedIds([]);
    toast({ title: `${selectedIds.length} items deleted` });
  };

  const updateField = (field: keyof T, value: any) => {
    setEditItem((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title={title} rightAction={
        <button onClick={openAdd} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
          <Plus size={14} /> Add New
        </button>
      } />

      <div className="px-4 py-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={`Search ${displayName}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {selectedIds.length > 0 && (
          <button onClick={handleMultiDelete} className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-xs font-semibold">
            Delete Selected ({selectedIds.length})
          </button>
        )}

        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={(e) => {
                  setSelectedIds(e.target.checked ? [...selectedIds, item.id] : selectedIds.filter((id) => id !== item.id));
                }}
                className="w-4 h-4 rounded border-border"
              />
              <div className="flex-1 min-w-0">
                {columns.slice(0, 2).map((col) => (
                  <p key={String(col.key)} className={col.key === columns[0].key ? "font-semibold text-sm truncate" : "text-xs text-muted-foreground truncate"}>
                    {String(item[col.key] ?? "")}
                  </p>
                ))}
              </div>
              <div className="relative">
                <button onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)} className="p-1">
                  <MoreVertical size={18} className="text-muted-foreground" />
                </button>
                {activeMenu === item.id && (
                  <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                    <button onClick={() => { setShowView(item); setActiveMenu(null); }} className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-muted">
                      <Eye size={14} /> View
                    </button>
                    <button onClick={() => openEdit(item)} className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-muted">
                      <Edit2 size={14} /> Edit
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-muted text-destructive">
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No {displayName.toLowerCase()} found</div>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem && (editItem as T).id && items.find(i => i.id === (editItem as T).id) ? "Edit" : "Add"} {displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {editItem && renderForm(editItem, updateField)}
            <button onClick={handleSave} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Save</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!showView} onOpenChange={() => setShowView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{displayName} Details</DialogTitle></DialogHeader>
          {showView && (
            <div className="space-y-2">
              {columns.map((col) => (
                <div key={String(col.key)} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{col.label}</span>
                  <span className="font-medium">{String(showView[col.key] ?? "")}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

export default CrudListPage;
