import { useEffect, useState } from "react";
import { Plus, Search, MoreVertical, Eye, Edit, Trash2, Upload, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Product } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/use-app-context";
import { formatCurrency } from "@/lib/currency";
import { getImageUrl, fileToBase64, getIconForType } from "@/lib/image-utils";
import { useDebounce } from "@/hooks/use-debounce";
import { syncLiveBusinessData } from "@/lib/live-sync";

const Products = () => {
  const { toast } = useToast();
  const { canManageData, roleLabel } = useAppContext();
  const categories = store.getCategories();
  const brands = store.getBrands();
  const [products, setProducts] = useState<Product[]>(store.getProducts());
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [filterCat, setFilterCat] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const hydrateProducts = async () => {
      if (store.getBusinessProfile().isOnline) {
        try {
          await syncLiveBusinessData();
        } catch {
          // Keep local fallback if live sync fails.
        }
      }

      if (mounted) {
        setProducts(store.getProducts());
      }
    };

    hydrateProducts();

    return () => {
      mounted = false;
    };
  }, []);

  // Form state
  const [form, setForm] = useState({ name: "", code: store.getNextProductCode(), categoryId: "", brandId: "", price: "", costPrice: "", retailPrice: "", wholesalePrice: "", dealerPrice: "", stock: "", alertQty: "10", image: "" });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const filtered = products.filter(p => {
    const matchSearch = !debouncedSearch || p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.code.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchCat = !filterCat || filterCat === "all" || p.categoryId === filterCat;
    const matchBrand = !filterBrand || filterBrand === "all" || p.brandId === filterBrand;
    return matchSearch && matchCat && matchBrand;
  });

  const resetForm = () => {
    setForm({ name: "", code: store.getNextProductCode(), categoryId: "", brandId: "", price: "", costPrice: "", retailPrice: "", wholesalePrice: "", dealerPrice: "", stock: "", alertQty: "10", image: "" });
    setImagePreview(null);
  };

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
      image: form.image || undefined,
    };
    const updated = [...products, p];
    setProducts(updated); store.saveProducts(updated);
    setProducts(store.getProducts());
    resetForm(); setShowAdd(false);
    toast({ title: "Product added!" });
  };

  const saveEdit = () => {
    if (!editProduct) return;
    const updated = products.map(p => p.id === editProduct.id ? editProduct : p);
    setProducts(updated); store.saveProducts(updated);
    setProducts(store.getProducts());
    setEditProduct(null);
    toast({ title: "Product updated!" });
  };

  const deleteProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated); store.saveProducts(updated); setMenuId(null);
    setProducts(store.getProducts());
    toast({ title: "Product deleted" });
  };

  const getCatName = (id?: string) => categories.find(c => c.id === id)?.name || "-";
  const getBrandName = (id?: string) => brands.find(b => b.id === id)?.name || "-";

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Products" />
      <div className="px-4 py-3 space-y-3">
        {!canManageData && (
          <div className="text-xs rounded-lg border border-warning/30 bg-warning/10 text-warning px-3 py-2">
            {roleLabel} access: view-only mode
          </div>
        )}
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
            <div className="w-11 h-11 rounded-lg bg-accent flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
              {p.image ? (
                <img src={getImageUrl(p.image) || "#"} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; const sib = e.currentTarget.nextElementSibling as HTMLElement | null; if (sib) sib.style.display = "flex"; }} />
              ) : null}
              <span style={{ display: p.image ? "none" : "flex" }} className="w-full h-full bg-accent flex items-center justify-center">
                {getIconForType("product", p.name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.code} · {getCatName(p.categoryId)}</p>
              <p className="text-[11px] text-muted-foreground">Stock: <span className={p.stock <= p.alertQty ? "text-destructive font-semibold" : ""}>{p.stock}</span></p>
            </div>
            <p className="font-bold text-sm">{formatCurrency(p.price)}</p>
            <div className="relative">
              <button onClick={() => setMenuId(menuId === p.id ? null : p.id)}><MoreVertical size={18} className="text-muted-foreground" /></button>
              {menuId === p.id && (
                <div className="absolute right-0 top-7 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                  <button onClick={() => { setViewProduct(p); setMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><Eye size={14} /> View</button>
                  {canManageData && (
                    <>
                      <button onClick={() => { setEditProduct(p); setMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><Edit size={14} /> Edit</button>
                      <button onClick={() => deleteProduct(p.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-destructive"><Trash2 size={14} /> Delete</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No products found</p>}
      </div>

      {canManageData && (
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center"><Plus size={24} /></button>
      )}

      {/* Add Product Dialog */}
      <Dialog open={canManageData && showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Image Upload */}
            <div className="flex items-center gap-2">
              <div className="w-16 h-16 rounded-lg bg-accent flex items-center justify-center border-2 border-dashed border-border overflow-hidden flex-shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{getIconForType("product")}</span>
                )}
              </div>
              <div className="flex-1">
                <label className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer text-sm font-medium hover:bg-primary/90">
                  <Upload size={14} />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const base64 = await fileToBase64(file);
                        setForm({ ...form, image: base64 });
                        setImagePreview(base64);
                      }
                    }}
                  />
                </label>
                {form.image && (
                  <button
                    onClick={() => {
                      setForm({ ...form, image: "" });
                      setImagePreview(null);
                    }}
                    className="mt-1 text-xs text-destructive hover:underline"
                  >
                    Remove Image
                  </button>
                )}
              </div>
            </div>
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
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewProduct?.name}</DialogTitle></DialogHeader>
          {viewProduct && (
            <div className="space-y-4">
              {viewProduct.image && (
                <div className="w-full h-48 rounded-lg bg-accent flex items-center justify-center overflow-hidden border border-border">
                  <img src={getImageUrl(viewProduct.image) || "#"} alt={viewProduct.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                </div>
              )}
              <div className="space-y-2 text-sm">
                <Row label="Code" value={viewProduct.code} />
                <Row label="Category" value={getCatName(viewProduct.categoryId)} />
                <Row label="Brand" value={getBrandName(viewProduct.brandId)} />
                <Row label="Sell Price" value={formatCurrency(viewProduct.price)} />
                <Row label="Cost Price" value={formatCurrency(viewProduct.costPrice)} />
                <Row label="Retail" value={formatCurrency(viewProduct.retailPrice)} />
                <Row label="Wholesale" value={formatCurrency(viewProduct.wholesalePrice)} />
                <Row label="Dealer" value={formatCurrency(viewProduct.dealerPrice)} />
                <Row label="Stock" value={String(viewProduct.stock)} />
                <Row label="Alert Qty" value={String(viewProduct.alertQty)} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={canManageData && !!editProduct} onOpenChange={() => setEditProduct(null)}>
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
