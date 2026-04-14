import { useState } from "react";
import { Plus, Search, Edit, Trash2, Eye, MoreVertical } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Product } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Products = () => {
  const { toast } = useToast();
  const categories = store.getCategories();
  const brands = store.getBrands();
  const units = store.getUnits();

  const [products, setProducts] = useState<Product[]>(store.getProducts());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({ name: "", code: "", price: "", costPrice: "", stock: "", alertQty: "10", categoryId: "", brandId: "", unitId: "1", expiryDate: "" });

  const resetForm = () => setFormData({ name: "", code: "", price: "", costPrice: "", stock: "", alertQty: "10", categoryId: "", brandId: "", unitId: "1", expiryDate: "" });

  const openAdd = () => {
    resetForm();
    setFormData(prev => ({ ...prev, code: `P${String(products.length + 1).padStart(3, "0")}` }));
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setFormData({ name: p.name, code: p.code, price: String(p.price), costPrice: String(p.costPrice), stock: String(p.stock), alertQty: String(p.alertQty), categoryId: p.categoryId, brandId: p.brandId, unitId: p.unitId, expiryDate: p.expiryDate || "" });
    setEditing(p);
    setShowForm(true);
  };

  const saveProduct = () => {
    if (!formData.name.trim() || !formData.price) return;
    const data: Product = {
      id: editing?.id || Date.now().toString(),
      name: formData.name.trim(), code: formData.code, price: Number(formData.price),
      costPrice: Number(formData.costPrice), stock: Number(formData.stock) || 0,
      alertQty: Number(formData.alertQty) || 10, categoryId: formData.categoryId,
      brandId: formData.brandId, unitId: formData.unitId, expiryDate: formData.expiryDate || undefined,
    };
    const updated = editing ? products.map(p => p.id === editing.id ? data : p) : [...products, data];
    setProducts(updated);
    store.saveProducts(updated);
    setShowForm(false);
    toast({ title: editing ? "Product updated" : "Product added" });
  };

  const deleteProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    store.saveProducts(updated);
    toast({ title: "Product deleted" });
  };

  const deleteSelected = () => {
    const updated = products.filter(p => !selected.has(p.id));
    setProducts(updated);
    store.saveProducts(updated);
    setSelected(new Set());
    toast({ title: `${products.length - updated.length} deleted` });
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || "-";
  const getBrandName = (id: string) => brands.find(b => b.id === id)?.name || "-";

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Products" rightAction={
        <button onClick={openAdd} className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Plus size={16} className="text-primary-foreground" />
        </button>
      } />

      <div className="px-4 py-3 space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or code..." className="pl-9" />
        </div>
        {selected.size > 0 && (
          <button onClick={deleteSelected} className="text-xs bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg font-semibold">Delete Selected ({selected.size})</button>
        )}
      </div>

      <div className="px-4 space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => {
                const next = new Set(selected); next.has(p.id) ? next.delete(p.id) : next.add(p.id); setSelected(next);
              }} className="mt-1 accent-primary" />
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{p.name[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">{p.code} • {getCategoryName(p.categoryId)} • {getBrandName(p.brandId)}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs"><strong>$ {p.price.toLocaleString()}</strong></span>
                  <span className={`text-xs ${p.stock <= p.alertQty ? "text-destructive font-semibold" : "text-muted-foreground"}`}>Stock: {p.stock}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setShowView(p)} className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center text-info"><Eye size={14} /></button>
                <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning"><Edit size={14} /></button>
                <button onClick={() => deleteProduct(p.id)} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">No products found</p>}
      </div>

      {/* View Dialog */}
      <Dialog open={!!showView} onOpenChange={() => setShowView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{showView?.name}</DialogTitle></DialogHeader>
          {showView && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Code</span><span className="font-mono">{showView.code}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-bold">$ {showView.price.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cost Price</span><span>$ {showView.costPrice.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Stock</span><span className={showView.stock <= showView.alertQty ? "text-destructive font-bold" : ""}>{showView.stock}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Alert Qty</span><span>{showView.alertQty}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span>{getCategoryName(showView.categoryId)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Brand</span><span>{getBrandName(showView.brandId)}</span></div>
              {showView.expiryDate && <div className="flex justify-between"><span className="text-muted-foreground">Expiry</span><span>{showView.expiryDate}</span></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Product Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input placeholder="Product Code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[11px] text-muted-foreground">Sell Price *</label><Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} /></div>
              <div><label className="text-[11px] text-muted-foreground">Cost Price *</label><Input type="number" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[11px] text-muted-foreground">Stock</label><Input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} /></div>
              <div><label className="text-[11px] text-muted-foreground">Alert Qty</label><Input type="number" value={formData.alertQty} onChange={(e) => setFormData({ ...formData, alertQty: e.target.value })} /></div>
            </div>
            <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={formData.brandId} onValueChange={(v) => setFormData({ ...formData, brandId: v })}>
              <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
              <SelectContent>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={formData.unitId} onValueChange={(v) => setFormData({ ...formData, unitId: v })}>
              <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
              <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
            </Select>
            <div><label className="text-[11px] text-muted-foreground">Expiry Date (optional)</label><Input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} /></div>
            <button onClick={saveProduct} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">{editing ? "Update" : "Save"}</button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Products;
