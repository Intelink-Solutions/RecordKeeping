import { useState } from "react";
import { Plus, Search, MoreVertical, Eye, Edit, Trash2 } from "lucide-react";
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
  const [products, setProducts] = useState<Product[]>(store.getProducts());
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({ name: "", code: store.getNextProductCode(), categoryId: "", brandId: "", price: "", costPrice: "", retailPrice: "", wholesalePrice: "", dealerPrice: "", stock: "", alertQty: "10" });

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || p.categoryId === filterCat;
    const matchBrand = !filterBrand || p.brandId === filterBrand;
    return matchSearch && matchCat && matchBrand;
  });

  const resetForm = () => setForm({ name: "", code: store.getNextProductCode(), categoryId: "", brandId: "", price: "", costPrice: "", retailPrice: "", wholesalePrice: "", dealerPrice: "", stock: "", alertQty: "10" });

  const addProduct = () => {
    if (!form.name.trim() || !form.price) return;
    const p: Product = {
      id: store.nextId(), name: form.name.trim(), code: form.code,
      categoryId: form.categoryId, brandId: form.brandId,
      price: Number(form.price), costPrice: Number(form.costPrice) || Number(form.price) * 0.7,
      retailPrice: Number(form.retailPrice) || Number(form.price),
      wholesalePrice: Number(form.wholesalePrice) || Number(form.price) * 0.9,
      dealerPrice: Number(form.dealerPrice) || Number(form.price) * 0.85,
      stock: Number(form.stock) || 0, alertQty: Number(form.alertQty) || 10,
    };
    const updated = [...products, p];
    setProducts(updated); store.saveProducts(updated);
    resetForm(); setShowAdd(false);
    toast({ title: "Product added!" });
  };

  const saveEdit = () => {
    if (!editProduct) return;
    const updated = products.map(p => p.id === editProduct.id ? editProduct : p);
    setProducts(updated); store.saveProducts(updated);
    setEditProduct(null);
    toast({ title: "Product updated!" });
  };

  const deleteProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated); store.saveProducts(updated); setMenuId(null);
    toast({ title: "Product deleted" });
  };

  const getCatName = (id?: string) => categories.find(c => c.id === id)?.name || "-";
  const getBrandName = (id?: string) => brands.find(b => b.id === id)?.name || "-";

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Products" />
      <div className="px-4 py-3 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterBrand} onValueChange={setFilterBrand}>
            <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Brand" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Brands</SelectItem>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {filtered.map(p => (
          <div key={p.id} className="flex items-center gap-3 bg-card rounded-xl p-3.5 border border-border">
            <div className="w-11 h-11 rounded-lg bg-accent flex items-center justify-center text-lg">📦</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.code} · {getCatName(p.categoryId)}</p>
              <p className="text-[11px] text-muted-foreground">Stock: <span className={p.stock <= p.alertQty ? "text-destructive font-semibold" : ""}>{p.stock}</span></p>
            </div>
            <p className="font-bold text-sm">$ {p.price}</p>
            <div className="relative">
              <button onClick={() => setMenuId(menuId === p.id ? null : p.id)}><MoreVertical size={18} className="text-muted-foreground" /></button>
              {menuId === p.id && (
                <div className="absolute right-0 top-7 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                  <button onClick={() => { setViewProduct(p); setMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><Eye size={14} /> View</button>
                  <button onClick={() => { setEditProduct(p); setMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><Edit size={14} /> Edit</button>
                  <button onClick={() => deleteProduct(p.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-destructive"><Trash2 size={14} /> Delete</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No products found</p>}
      </div>

      <button onClick={() => { resetForm(); setShowAdd(true); }} className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center"><Plus size={24} /></button>

      {/* Add Product Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Product Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Product Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            <Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}><SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            <Select value={form.brandId} onValueChange={v => setForm({ ...form, brandId: v })}><SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger><SelectContent>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Sell Price *" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              <Input placeholder="Cost Price" type="number" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} />
              <Input placeholder="Retail Price" type="number" value={form.retailPrice} onChange={e => setForm({ ...form, retailPrice: e.target.value })} />
              <Input placeholder="Wholesale Price" type="number" value={form.wholesalePrice} onChange={e => setForm({ ...form, wholesalePrice: e.target.value })} />
              <Input placeholder="Dealer Price" type="number" value={form.dealerPrice} onChange={e => setForm({ ...form, dealerPrice: e.target.value })} />
              <Input placeholder="Stock" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
            </div>
            <Input placeholder="Alert Qty" type="number" value={form.alertQty} onChange={e => setForm({ ...form, alertQty: e.target.value })} />
            <button onClick={addProduct} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Save Product</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Product Dialog */}
      <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewProduct?.name}</DialogTitle></DialogHeader>
          {viewProduct && (
            <div className="space-y-2 text-sm">
              <Row label="Code" value={viewProduct.code} />
              <Row label="Category" value={getCatName(viewProduct.categoryId)} />
              <Row label="Brand" value={getBrandName(viewProduct.brandId)} />
              <Row label="Sell Price" value={`$ ${viewProduct.price}`} />
              <Row label="Cost Price" value={`$ ${viewProduct.costPrice}`} />
              <Row label="Retail" value={`$ ${viewProduct.retailPrice}`} />
              <Row label="Wholesale" value={`$ ${viewProduct.wholesalePrice}`} />
              <Row label="Dealer" value={`$ ${viewProduct.dealerPrice}`} />
              <Row label="Stock" value={String(viewProduct.stock)} />
              <Row label="Alert Qty" value={String(viewProduct.alertQty)} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
          {editProduct && (
            <div className="space-y-3">
              <Input value={editProduct.name} onChange={e => setEditProduct({ ...editProduct, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={editProduct.price} onChange={e => setEditProduct({ ...editProduct, price: Number(e.target.value) })} placeholder="Sell Price" />
                <Input type="number" value={editProduct.costPrice} onChange={e => setEditProduct({ ...editProduct, costPrice: Number(e.target.value) })} placeholder="Cost Price" />
                <Input type="number" value={editProduct.stock} onChange={e => setEditProduct({ ...editProduct, stock: Number(e.target.value) })} placeholder="Stock" />
                <Input type="number" value={editProduct.alertQty} onChange={e => setEditProduct({ ...editProduct, alertQty: Number(e.target.value) })} placeholder="Alert Qty" />
              </div>
              <button onClick={saveEdit} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Update</button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>
);

export default Products;
