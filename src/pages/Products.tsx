import { useEffect, useState, useCallback } from "react";
import { Plus, Search, MoreVertical, Eye, Edit, Trash2, Upload } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import ConfirmDialog from "@/components/ConfirmDialog";
import { store, Product } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/use-app-context";
import { formatCurrency } from "@/lib/currency";
import { getImageUrl, fileToBase64, getIconForType } from "@/lib/image-utils";
import { useDebounce } from "@/hooks/use-debounce";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { apiCreateProduct, apiUpdateProduct, apiDeleteProduct, NetworkDownError } from "@/lib/api";
import { useLiveData, showSaved, emitStoreUpdate } from "@/hooks/use-live-data";
import { useScrollRefresh } from "@/hooks/use-scroll-refresh";
import { enqueueOfflineOp } from "@/lib/offline-queue";

const ProductThumb = ({ image, name }: { image?: string; name: string }) => {
  const [imgError, setImgError] = useState(false);
  const url = image ? getImageUrl(image) : null;
  return (
    <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
      {url && !imgError ? (
        <img
          src={url}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-xs font-bold text-muted-foreground">
          {name.substring(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
};

const Products = () => {
  const { toast } = useToast();
  const { canManageData, roleLabel, isOwner } = useAppContext();
  const categories = useLiveData(() => store.getCategories());
  const brands = useLiveData(() => store.getBrands());
  const units = useLiveData(() => store.getUnits());
  const vatRates = useLiveData(() => store.getVatRates().filter(v => v.status === "Active"));
  const allProducts = useLiveData(() => store.getProducts());
  const branches = useLiveData(() => store.getBranches());
  const effectiveBranchId = store.getEffectiveBranchId();
  // Show only products belonging to the active/assigned branch; owner with no branch set sees all
  const products = effectiveBranchId
    ? allProducts.filter(p => !p.branchId || p.branchId === effectiveBranchId)
    : allProducts;
  useScrollRefresh(() => syncLiveBusinessData().catch(() => {}));
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [filterCat, setFilterCat] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editBranchId, setEditBranchId] = useState<string>("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  // Show branch picker only when the owner is in "All Branches" mode and needs to assign a branch.
  // When a specific branch is active (or user is staff), branch is auto-filled — no picker needed.
  const showBranchPicker = isOwner && branches.length > 1 && !store.getActiveBranchId();

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
        emitStoreUpdate();
      }
    };

    hydrateProducts();

    return () => {
      mounted = false;
    };
  }, []);

  // Form state – matches web product form field order
  const [form, setForm] = useState({
    name: "",
    code: store.getNextProductCode(),
    productType: "single",
    branchId: store.getEffectiveBranchId() ?? "",
    categoryId: "",
    brandId: "",
    unitId: "",
    stock: "",
    alertQty: "10",
    expiryDate: "",
    vatId: "",
    vatType: "exclusive",
    exclusivePrice: "",    // Purchase Price Exclusive
    inclusivePrice: "",    // Purchase Price Inclusive (auto-calculated)
    profitMargin: "",      // Profit Margin (%)
    price: "",             // MRP / Sale Price
    wholesalePrice: "",
    dealerPrice: "",
    manufacturer: "",
    image: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Auto-calculate inclusive price, profit margin, and MRP
  const getSelectedVatRate = useCallback((): number => {
    if (!form.vatId) return 0;
    const vat = vatRates.find(v => v.id === form.vatId);
    return vat?.rate ?? 0;
  }, [form.vatId, vatRates]);

  const recalcInclusive = useCallback((exclusive: string, vatRate: number) => {
    const ex = Number(exclusive) || 0;
    return ex > 0 ? String(Math.round((ex + (ex * vatRate / 100)) * 100) / 100) : "";
  }, []);

  const recalcMrpFromMargin = useCallback((inclusive: string, margin: string) => {
    const incl = Number(inclusive) || 0;
    const m = Number(margin) || 0;
    return incl > 0 && m >= 0 ? String(Math.round((incl + (incl * m / 100)) * 100) / 100) : "";
  }, []);

  const recalcMarginFromMrp = useCallback((inclusive: string, mrp: string) => {
    const incl = Number(inclusive) || 0;
    const m = Number(mrp) || 0;
    return incl > 0 && m > 0 ? String(Math.round(((m - incl) / incl) * 100 * 100) / 100) : "";
  }, []);

  // When exclusive price changes → recalc inclusive, then margin
  const handleExclusiveChange = (val: string) => {
    const vatRate = getSelectedVatRate();
    const newInclusive = recalcInclusive(val, vatRate);
    const newMargin = form.price ? recalcMarginFromMrp(newInclusive, form.price) : form.profitMargin;
    setForm(f => ({ ...f, exclusivePrice: val, inclusivePrice: newInclusive, profitMargin: newMargin }));
  };

  // When VAT selection changes → recalc inclusive, then margin
  const handleVatChange = (vatId: string) => {
    const vat = vatRates.find(v => v.id === vatId);
    const vatRate = vat?.rate ?? 0;
    const newInclusive = recalcInclusive(form.exclusivePrice, vatRate);
    const newMargin = form.price ? recalcMarginFromMrp(newInclusive, form.price) : form.profitMargin;
    setForm(f => ({ ...f, vatId, inclusivePrice: newInclusive, profitMargin: newMargin }));
  };

  // When profit margin changes → recalc MRP
  const handleMarginChange = (val: string) => {
    const inclusive = form.inclusivePrice || form.exclusivePrice;
    const newMrp = recalcMrpFromMargin(inclusive, val);
    setForm(f => ({ ...f, profitMargin: val, price: newMrp || f.price }));
  };

  // When MRP changes → recalc margin
  const handleMrpChange = (val: string) => {
    const inclusive = form.inclusivePrice || form.exclusivePrice;
    const newMargin = recalcMarginFromMrp(inclusive, val);
    setForm(f => ({ ...f, price: val, profitMargin: newMargin }));
  };

  const filtered = products.filter(p => {
    const matchSearch = !debouncedSearch || p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.code.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchCat = !filterCat || filterCat === "all" || p.categoryId === filterCat;
    const matchBrand = !filterBrand || filterBrand === "all" || p.brandId === filterBrand;
    return matchSearch && matchCat && matchBrand;
  });

  const resetForm = () => {
    setForm({
      name: "",
      code: store.getNextProductCode(),
      productType: "single",
      branchId: store.getEffectiveBranchId() ?? "",
      categoryId: "",
      brandId: "",
      unitId: "",
      stock: "",
      alertQty: "10",
      expiryDate: "",
      vatId: "",
      vatType: "exclusive",
      exclusivePrice: "",
      inclusivePrice: "",
      profitMargin: "",
      price: "",
      wholesalePrice: "",
      dealerPrice: "",
      manufacturer: "",
      image: "",
    });
    setImagePreview(null);
    setImageFile(null);
  };

  const addProduct = async () => {
    if (!form.name.trim() || !form.categoryId || !form.exclusivePrice) return;

    const exclusivePrice = Number(form.exclusivePrice) || 0;
    const inclusivePrice = Number(form.inclusivePrice) || exclusivePrice;
    const salePrice = Number(form.price) || inclusivePrice;
    const profitMargin = Number(form.profitMargin) || 0;
    const wholesalePrice = Number(form.wholesalePrice) || salePrice;
    const dealerPrice = Number(form.dealerPrice) || salePrice;
    const stockQty = Number(form.stock) || 0;

    // ── Instant local save ────────────────────────────────────────────────────
    const localProduct: Product = {
      id: store.nextId(), name: form.name.trim(), code: form.code,
      branchId: form.branchId || undefined,
      categoryId: form.categoryId, brandId: form.brandId, unitId: form.unitId,
      vatId: form.vatId || undefined,
      price: salePrice, costPrice: exclusivePrice,
      retailPrice: salePrice,
      wholesalePrice, dealerPrice,
      stock: stockQty, alertQty: Number(form.alertQty) || 10,
      profitMargin: profitMargin || undefined,
      manufacturer: form.manufacturer || undefined,
      expiryDate: form.expiryDate || undefined,
      image: form.image || undefined,
    };
    store.saveProducts([...store.getProducts(), localProduct]);
    emitStoreUpdate();
    resetForm(); setShowAdd(false);
    showSaved("Product added!");

    // ── Background API ────────────────────────────────────────────────────────
    const createPayload = {
      productName: localProduct.name,
      productCode: form.code || undefined,
      product_type: (form.productType as "single" | "variant" | "combo") || "single",
      vat_type: (form.vatType as "inclusive" | "exclusive") || "exclusive",
      vat_id: (form.vatId && form.vatId !== "none") ? form.vatId : null,
      category_id: form.categoryId || null,
      brand_id: form.brandId || null,
      unit_id: form.unitId || null,
      branch_id: form.branchId || null,
      alert_qty: Number(form.alertQty) || 10,
      productManufacturer: form.manufacturer || undefined,
      productSalePrice: salePrice,
      productPurchasePrice: exclusivePrice,
      productWholeSalePrice: wholesalePrice,
      productDealerPrice: dealerPrice,
      productStock: stockQty,
      productPicture: imageFile,
      stocks: [{
        productStock: stockQty,
        exclusive_price: exclusivePrice,
        inclusive_price: inclusivePrice,
        profit_percent: profitMargin,
        productSalePrice: salePrice,
        productWholeSalePrice: wholesalePrice,
        productDealerPrice: dealerPrice,
        expire_date: form.expiryDate || null,
      }],
    };

    (async () => {
      try {
        let payload = createPayload;
        try {
          await apiCreateProduct(payload);
        } catch (err) {
          const msg = err instanceof Error ? err.message.toLowerCase() : "";
          if (msg.includes("selected unit id is invalid")) {
            payload = { ...payload, unit_id: null };
            await apiCreateProduct(payload);
          } else {
            throw err;
          }
        }
        syncLiveBusinessData().catch(() => {});
      } catch (err) {
        if (err instanceof NetworkDownError) {
          enqueueOfflineOp("POST", "/products", createPayload as unknown as Record<string, unknown>);
        } else {
          const msg = err instanceof Error ? err.message : "Sync failed";
          toast({ title: "Product sync issue", description: msg, variant: "destructive" });
        }
      }
    })();
  };

  const saveEdit = async () => {
    if (!editProduct) return;
    setSaving(true);
    const isOnline = store.getBusinessProfile().isOnline;

    if (isOnline) {
      try {
        // Build the update payload with image support
        const updatePayload = {
          productName: editProduct.name,
          product_type: "single" as const,
          vat_type: "exclusive" as const,
          vat_id: (editProduct.vatId && editProduct.vatId !== "none") ? editProduct.vatId : null,
          alert_qty: editProduct.alertQty,
          productManufacturer: editProduct.manufacturer || undefined,
          productSalePrice: editProduct.price,
          productPurchasePrice: editProduct.costPrice,
          productWholeSalePrice: editProduct.wholesalePrice,
          productDealerPrice: editProduct.dealerPrice,
          productStock: editProduct.stock,
          category_id: editProduct.categoryId || null,
          brand_id: editProduct.brandId || null,
          unit_id: editProduct.unitId || null,
          branch_id: editBranchId || null,
          // Include image file if a new one was uploaded, otherwise use existing image
          productPicture: editImageFile || (editProduct.image ? null : undefined),
          stocks: [{
            productStock: editProduct.stock,
            exclusive_price: editProduct.costPrice,
            inclusive_price: editProduct.costPrice,
            profit_percent: editProduct.costPrice > 0
              ? (((editProduct.price - editProduct.costPrice) / editProduct.costPrice) * 100)
              : 0,
            productSalePrice: editProduct.price,
            productWholeSalePrice: editProduct.wholesalePrice,
            productDealerPrice: editProduct.dealerPrice,
          }],
        };

        await apiUpdateProduct(editProduct.id, updatePayload);
        await syncLiveBusinessData();
        // Reset edit image state
        setEditImageFile(null);
        setEditImagePreview(null);
        setEditProduct(null);
        showSaved("Product updated!");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update product";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setSaving(false);
      }
    } else {
      // Offline mode - update local store
      const updatedProduct = {
        ...editProduct,
        image: editImagePreview || editProduct.image || undefined,
      };
      const updated = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
      store.saveProducts(updated);
      emitStoreUpdate();
      // Reset edit image state
      setEditImageFile(null);
      setEditImagePreview(null);
      setEditProduct(null);
      showSaved("Product updated locally (offline)");
      setSaving(false);
    }
  };

  const requestDeleteProduct = (id: string) => {
    setMenuId(null);
    setConfirmDeleteId(id);
  };

  const executeDeleteProduct = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    setDeleting(true);
    const isOnline = store.getBusinessProfile().isOnline;
    if (isOnline) {
      try {
        await apiDeleteProduct(id);
        await syncLiveBusinessData();
        showSaved("Product deleted");
      } catch (err) {
        // Backend may error (e.g. stock constraint) even when delete succeeds.
        // Sync and check whether the product is actually gone.
        await syncLiveBusinessData();
        const stillExists = store.getProducts().some((p) => p.id === id);
        if (!stillExists) {
          showSaved("Product deleted");
        } else {
          const msg = err instanceof Error ? err.message : "Failed to delete product";
          toast({ title: "Error", description: msg, variant: "destructive" });
        }
      }
    } else {
      const updated = products.filter((p) => p.id !== id);
      store.saveProducts(updated);
      emitStoreUpdate();
      showSaved("Product deleted");
    }
    setDeleting(false);
    setConfirmDeleteId(null);
  };

  const getCatName = (id?: string) => categories.find(c => c.id === id)?.name || "-";
  const getBrandName = (id?: string) => brands.find(b => b.id === id)?.name || "-";

  return (
    <div className="min-h-screen bg-background pb-nav">
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
          <div key={p.id} className="flex items-center gap-3 bg-card rounded-xl p-3.5 border border-border cursor-pointer active:bg-accent/50 transition-colors" onClick={() => setViewProduct(p)}>
            <ProductThumb image={p.image} name={p.name} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{p.name}</p>
              <p className="text-[11px] text-muted-foreground">{p.code} · {getCatName(p.categoryId)}</p>
              <p className="text-[11px] text-muted-foreground">Stock: <span className={p.stock <= p.alertQty ? "text-destructive font-semibold" : ""}>{p.stock}</span></p>
            </div>
            <p className="font-bold text-sm">{formatCurrency(p.price)}</p>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setMenuId(menuId === p.id ? null : p.id)}><MoreVertical size={18} className="text-muted-foreground" /></button>
              {menuId === p.id && (
                <div className="absolute right-0 top-7 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                  <button onClick={() => { setViewProduct(p); setMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><Eye size={14} /> View</button>
                  {canManageData && (
                    <>
                      <button onClick={() => { setEditProduct(p); setEditBranchId(p.branchId ?? store.getEffectiveBranchId() ?? ""); setMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><Edit size={14} /> Edit</button>
                      <button onClick={() => requestDeleteProduct(p.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-destructive"><Trash2 size={14} /> Delete</button>
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

      {/* Add Product Dialog – matches web product form layout */}
      <Dialog open={canManageData && showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Product Name */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Product Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Enter Product Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            {/* Branch */}
            {showBranchPicker && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Branch <span className="text-destructive">*</span></Label>
                <Select value={form.branchId} onValueChange={v => setForm({ ...form, branchId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {/* Category */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Product Category <span className="text-destructive">*</span></Label>
              <Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select One" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Brand */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Product Brand</Label>
              <Select value={form.brandId} onValueChange={v => setForm({ ...form, brandId: v })}>
                <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                <SelectContent>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Unit */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Product Unit</Label>
              <Select value={form.unitId} onValueChange={v => setForm({ ...form, unitId: v })}>
                <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.shortName})</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Product Code */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Product Code</Label>
              <Input placeholder="Auto-generated" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </div>

            {/* Stock & Alert Qty */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Stock</Label>
                <Input placeholder="Enter stock qty" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Low Stock Quantity</Label>
                <Input placeholder="Enter alert qty" type="number" value={form.alertQty} onChange={e => setForm({ ...form, alertQty: e.target.value })} />
              </div>
            </div>

            {/* Expire Date */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Expire Date</Label>
              <Input type="date" placeholder="mm/dd/yyyy" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
            </div>

            {/* Vat & Vat Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Select Vat</Label>
                <Select value={form.vatId} onValueChange={handleVatChange}>
                  <SelectTrigger><SelectValue placeholder="Select vat" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No VAT</SelectItem>
                    {vatRates.map(v => <SelectItem key={v.id} value={v.id}>{v.name} ({v.rate}%)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Vat Type</Label>
                <Select value={form.vatType} onValueChange={v => setForm({ ...form, vatType: v })}>
                  <SelectTrigger><SelectValue placeholder="Vat Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">Exclusive</SelectItem>
                    <SelectItem value="inclusive">Inclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Purchase Price Exclusive & Inclusive */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Purchase Price Exclusive <span className="text-destructive">*</span></Label>
                <Input placeholder="Enter purchase price" type="number" value={form.exclusivePrice} onChange={e => handleExclusiveChange(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Purchase Price Inclusive</Label>
                <Input placeholder="Auto-calculated" type="number" value={form.inclusivePrice} readOnly className="bg-muted" />
              </div>
            </div>

            {/* Profit Margin & MRP */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Profit Margin (%)</Label>
                <Input placeholder="Enter profit margin" type="number" value={form.profitMargin} onChange={e => handleMarginChange(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">MRP <span className="text-destructive">*</span></Label>
                <Input placeholder="Enter sale price" type="number" value={form.price} onChange={e => handleMrpChange(e.target.value)} />
              </div>
            </div>

            {/* Wholesale & Dealer */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Wholesale Price</Label>
                <Input placeholder="Enter wholesale price" type="number" value={form.wholesalePrice} onChange={e => setForm({ ...form, wholesalePrice: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Dealer Price</Label>
                <Input placeholder="Enter dealer price" type="number" value={form.dealerPrice} onChange={e => setForm({ ...form, dealerPrice: e.target.value })} />
              </div>
            </div>

            {/* Manufacturer */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Manufacturer</Label>
              <Input placeholder="Enter manufacturer name" value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} />
            </div>

            {/* Image Upload */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Image</Label>
              <div className="flex items-center gap-3">
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
                      accept="image/jpg,image/jpeg,image/png,image/svg+xml"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const base64 = await fileToBase64(file);
                          setImageFile(file);
                          setForm(f => ({ ...f, image: base64 }));
                          setImagePreview(base64);
                        }
                      }}
                    />
                  </label>
                  {form.image && (
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setForm(f => ({ ...f, image: "" }));
                        setImagePreview(null);
                      }}
                      className="mt-1 text-xs text-destructive hover:underline"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={addProduct}
              disabled={saving || !form.name.trim() || !form.categoryId || !form.exclusivePrice}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Product"}
            </button>
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
                <div className="w-full max-h-64 rounded-lg bg-accent flex items-center justify-center overflow-hidden border border-border">
                  <img src={getImageUrl(viewProduct.image) || "#"} alt={viewProduct.name} loading="lazy" className="w-full h-full object-contain" style={{ maxWidth: '100%', maxHeight: '16rem' }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                </div>
              )}
              <div className="space-y-2 text-sm">
                <Row label="Code" value={viewProduct.code} />
                <Row label="Category" value={getCatName(viewProduct.categoryId)} />
                <Row label="Brand" value={getBrandName(viewProduct.brandId)} />
                <Row label="Purchase Price" value={formatCurrency(viewProduct.costPrice)} />
                <Row label="MRP (Sale Price)" value={formatCurrency(viewProduct.price)} />
                <Row label="Wholesale" value={formatCurrency(viewProduct.wholesalePrice)} />
                <Row label="Dealer" value={formatCurrency(viewProduct.dealerPrice)} />
                <Row label="Stock" value={String(viewProduct.stock)} />
                <Row label="Alert Qty" value={String(viewProduct.alertQty)} />
                {viewProduct.manufacturer && <Row label="Manufacturer" value={viewProduct.manufacturer} />}
                {viewProduct.expiryDate && <Row label="Expiry Date" value={viewProduct.expiryDate} />}
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
              <div className="space-y-1">
                <Label className="text-xs font-medium">Product Name</Label>
                <Input value={editProduct.name} onChange={e => setEditProduct({ ...editProduct, name: e.target.value })} />
              </div>
              {showBranchPicker && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Branch</Label>
                  <Select value={editBranchId} onValueChange={setEditBranchId}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Category</Label>
                  <Select value={editProduct.categoryId || ""} onValueChange={v => setEditProduct({ ...editProduct, categoryId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Brand</Label>
                  <Select value={editProduct.brandId || ""} onValueChange={v => setEditProduct({ ...editProduct, brandId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Unit</Label>
                <Select value={editProduct.unitId || ""} onValueChange={v => setEditProduct({ ...editProduct, unitId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.shortName})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Purchase Price</Label>
                  <Input type="number" value={editProduct.costPrice} onChange={e => setEditProduct({ ...editProduct, costPrice: Number(e.target.value) })} placeholder="Purchase price" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">MRP (Sale Price)</Label>
                  <Input type="number" value={editProduct.price} onChange={e => setEditProduct({ ...editProduct, price: Number(e.target.value) })} placeholder="Sale price" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Wholesale Price</Label>
                  <Input type="number" value={editProduct.wholesalePrice} onChange={e => setEditProduct({ ...editProduct, wholesalePrice: Number(e.target.value) })} placeholder="Wholesale" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Dealer Price</Label>
                  <Input type="number" value={editProduct.dealerPrice} onChange={e => setEditProduct({ ...editProduct, dealerPrice: Number(e.target.value) })} placeholder="Dealer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Stock</Label>
                  <Input type="number" value={editProduct.stock} onChange={e => setEditProduct({ ...editProduct, stock: Number(e.target.value) })} placeholder="Stock" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Alert Qty</Label>
                  <Input type="number" value={editProduct.alertQty} onChange={e => setEditProduct({ ...editProduct, alertQty: Number(e.target.value) })} placeholder="Alert Qty" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Manufacturer</Label>
                <Input value={editProduct.manufacturer || ""} onChange={e => setEditProduct({ ...editProduct, manufacturer: e.target.value })} placeholder="Manufacturer" />
              </div>

              {/* Image Upload for Edit */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Product Image</Label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-accent flex items-center justify-center border-2 border-dashed border-border overflow-hidden flex-shrink-0">
                    {editImagePreview ? (
                      <img src={editImagePreview} alt="edit preview" className="w-full h-full object-cover" />
                    ) : editProduct.image ? (
                      <img src={getImageUrl(editProduct.image) || "#"} alt={editProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{getIconForType("product")}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer text-sm font-medium hover:bg-primary/90">
                      <Upload size={14} />
                      <span>Upload New Image</span>
                      <input
                        type="file"
                        accept="image/jpg,image/jpeg,image/png,image/svg+xml"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const base64 = await fileToBase64(file);
                            setEditImageFile(file);
                            setEditImagePreview(base64);
                          }
                        }}
                      />
                    </label>
                    {(editImagePreview || editProduct.image) && (
                      <button
                        onClick={() => {
                          setEditImageFile(null);
                          setEditImagePreview(null);
                        }}
                        className="mt-1 text-xs text-destructive hover:underline"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button onClick={saveEdit} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60">{saving ? "Updating..." : "Update"}</button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={executeDeleteProduct}
        onCancel={() => setConfirmDeleteId(null)}
        loading={deleting}
      />

      <BottomNav />
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>
);

export default Products;
