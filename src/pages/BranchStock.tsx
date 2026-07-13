import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Trash2, RefreshCw, PackageSearch, GitBranch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { store } from "@/lib/store";
import { apiGetBranchStock, apiAddBranchStock, apiUpdateBranchStock, apiDeleteBranchStock } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useAppContext } from "@/hooks/use-app-context";
import { getImageUrl } from "@/lib/image-utils";
import { useDebounce } from "@/hooks/use-debounce";

const NONE = "none";

interface BranchStockRow {
  id: string;
  productId: string;
  productName: string;
  productCode?: string;
  warehouseId?: string;
  warehouseName?: string;
  batchNo?: string;
  stock: number;
  purchasePrice: number;
  salePrice: number;
  wholesalePrice?: number;
  dealerPrice?: number;
  expireDate?: string;
  receivedViaTransfer?: boolean;
}

function mapRow(s: Record<string, unknown>): BranchStockRow {
  const product = s.product as Record<string, unknown> | undefined;
  const warehouse = s.warehouse as Record<string, unknown> | undefined;
  return {
    id: String(s.id),
    productId: String(s.product_id),
    productName: String(product?.productName ?? product?.name ?? "Product"),
    productCode: product?.productCode ? String(product.productCode) : undefined,
    warehouseId: s.warehouse_id != null ? String(s.warehouse_id) : undefined,
    warehouseName: warehouse?.name ? String(warehouse.name) : undefined,
    batchNo: s.batch_no ? String(s.batch_no) : undefined,
    stock: Number(s.productStock ?? 0),
    purchasePrice: Number(s.productPurchasePrice ?? 0),
    salePrice: Number(s.productSalePrice ?? 0),
    wholesalePrice: s.productWholeSalePrice != null ? Number(s.productWholeSalePrice) : undefined,
    dealerPrice: s.productDealerPrice != null ? Number(s.productDealerPrice) : undefined,
    expireDate: s.expire_date ? String(s.expire_date) : undefined,
    receivedViaTransfer: Boolean(s.received_via_transfer),
  };
}

interface StockForm {
  productId: string;
  quantity: string;
  purchasePrice: string;
  salePrice: string;
  wholesalePrice: string;
  dealerPrice: string;
  batchNo: string;
  mfgDate: string;
  expireDate: string;
  warehouseId: string;
}

const emptyForm: StockForm = {
  productId: "", quantity: "", purchasePrice: "", salePrice: "",
  wholesalePrice: "", dealerPrice: "", batchNo: "", mfgDate: "", expireDate: "", warehouseId: NONE,
};

/**
 * Add/adjust/remove a specific branch's stock directly — for the "this
 * branch just started carrying an existing product" case that isn't a
 * purchase (no supplier invoice) or a transfer (no source branch to pull
 * from). Backed by /branch-stock, which already existed on the backend
 * (BranchStockController) but had no frontend UI at all until now.
 */
const BranchStock = () => {
  const { toast } = useToast();
  const { isOwner } = useAppContext();
  const branches = store.getBranches().filter((b) => b.status === "Active");
  const allWarehouses = store.getWarehouses();
  const allProducts = store.getProducts();
  const effectiveBranchId = store.getEffectiveBranchId();
  const userBranchId = store.getUserBranchId();

  const [branchId, setBranchId] = useState(effectiveBranchId ?? userBranchId ?? branches[0]?.id ?? "");
  const [warehouseFilter, setWarehouseFilter] = useState(NONE);
  const [rows, setRows] = useState<BranchStockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<StockForm>(emptyForm);
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [editRow, setEditRow] = useState<BranchStockRow | null>(null);
  const [editForm, setEditForm] = useState<StockForm>(emptyForm);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<BranchStockRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const warehousesForBranch = allWarehouses.filter((w) => !w.branchId || w.branchId === branchId);
  const activeBranch = branches.find((b) => b.id === branchId);

  const fetchStock = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const raw = await apiGetBranchStock(branchId, warehouseFilter !== NONE ? warehouseFilter : undefined);
      const obj = raw as { data?: unknown[] };
      const list = Array.isArray(obj?.data) ? obj.data : [];
      setRows((list as Record<string, unknown>[]).map(mapRow));
    } catch (err) {
      toast({ title: "Failed to load branch stock", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [branchId, warehouseFilter, toast]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const filteredRows = rows.filter((r) => !debouncedSearch || r.productName.toLowerCase().includes(debouncedSearch.toLowerCase()));
  const filteredCatalog = allProducts.filter((p) => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()));
  const selectedProduct = allProducts.find((p) => p.id === form.productId);

  function openAdd() {
    setForm(emptyForm);
    setProductSearch("");
    setShowAdd(true);
  }

  function selectProductForAdd(p: typeof allProducts[number]) {
    setForm((f) => ({
      ...f,
      productId: p.id,
      purchasePrice: f.purchasePrice || (p.costPrice ? String(p.costPrice) : ""),
      salePrice: f.salePrice || (p.price ? String(p.price) : ""),
      wholesalePrice: f.wholesalePrice || (p.wholesalePrice ? String(p.wholesalePrice) : ""),
      dealerPrice: f.dealerPrice || (p.dealerPrice ? String(p.dealerPrice) : ""),
    }));
  }

  async function handleAdd() {
    if (!branchId) { toast({ title: "Select a branch first", variant: "destructive" }); return; }
    if (!form.productId) { toast({ title: "Select a product", variant: "destructive" }); return; }
    const qty = Number(form.quantity);
    if (!form.quantity || !(qty > 0)) { toast({ title: "Enter a quantity greater than 0", variant: "destructive" }); return; }
    if (form.purchasePrice === "" || Number(form.purchasePrice) < 0) { toast({ title: "Enter a purchase price", variant: "destructive" }); return; }
    if (form.salePrice === "" || Number(form.salePrice) < 0) { toast({ title: "Enter a sale price", variant: "destructive" }); return; }

    setSaving(true);
    try {
      await apiAddBranchStock(branchId, {
        product_id: Number(form.productId),
        productStock: qty,
        productPurchasePrice: Number(form.purchasePrice),
        productSalePrice: Number(form.salePrice),
        productWholeSalePrice: form.wholesalePrice ? Number(form.wholesalePrice) : undefined,
        productDealerPrice: form.dealerPrice ? Number(form.dealerPrice) : undefined,
        batch_no: form.batchNo || undefined,
        mfg_date: form.mfgDate || undefined,
        expire_date: form.expireDate || undefined,
        warehouse_id: form.warehouseId !== NONE ? Number(form.warehouseId) : undefined,
      });
      toast({ title: "Stock added", description: `${selectedProduct?.name ?? "Product"} is now stocked at ${activeBranch?.name ?? "this branch"}.` });
      setShowAdd(false);
      fetchStock();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Could not add stock", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function openEdit(row: BranchStockRow) {
    setEditRow(row);
    setEditForm({
      productId: row.productId,
      quantity: String(row.stock),
      purchasePrice: String(row.purchasePrice),
      salePrice: String(row.salePrice),
      wholesalePrice: row.wholesalePrice != null ? String(row.wholesalePrice) : "",
      dealerPrice: row.dealerPrice != null ? String(row.dealerPrice) : "",
      batchNo: row.batchNo || "",
      mfgDate: "",
      expireDate: row.expireDate || "",
      warehouseId: row.warehouseId || NONE,
    });
  }

  async function handleEditSave() {
    if (!editRow || !branchId) return;
    if (editForm.quantity !== "" && Number(editForm.quantity) < 0) {
      toast({ title: "Quantity can't be negative", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await apiUpdateBranchStock(editRow.id, branchId, {
        productStock: editForm.quantity !== "" ? Number(editForm.quantity) : undefined,
        productPurchasePrice: editForm.purchasePrice !== "" ? Number(editForm.purchasePrice) : undefined,
        productSalePrice: editForm.salePrice !== "" ? Number(editForm.salePrice) : undefined,
        productWholeSalePrice: editForm.wholesalePrice !== "" ? Number(editForm.wholesalePrice) : undefined,
        productDealerPrice: editForm.dealerPrice !== "" ? Number(editForm.dealerPrice) : undefined,
        batch_no: editForm.batchNo || undefined,
        expire_date: editForm.expireDate || undefined,
        warehouse_id: editForm.warehouseId !== NONE ? Number(editForm.warehouseId) : undefined,
      });
      toast({ title: "Stock updated" });
      setEditRow(null);
      fetchStock();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Could not update stock", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDeleteRow || !branchId) return;
    setDeleting(true);
    try {
      await apiDeleteBranchStock(confirmDeleteRow.id, branchId);
      toast({ title: "Stock removed" });
      setConfirmDeleteRow(null);
      fetchStock();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Could not remove stock", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader
        title="Branch Stock"
        rightAction={
          <button onClick={fetchStock} className="p-2 rounded-full" aria-label="Refresh">
            <RefreshCw size={15} className={`text-white/80 ${loading ? "animate-spin" : ""}`} />
          </button>
        }
      />

      <div className="px-4 pt-4 space-y-3">
        {/* Branch / warehouse scope */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Branch</Label>
            {isOwner ? (
              <Select value={branchId} onValueChange={(v) => { setBranchId(v); setWarehouseFilter(NONE); }}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-10 flex items-center gap-1.5 text-sm font-medium px-3 rounded-md border border-border bg-muted/40">
                <GitBranch size={13} className="text-muted-foreground shrink-0" />
                <span className="truncate">{activeBranch?.name ?? "Your branch"}</span>
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs">Warehouse</Label>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>All warehouses</SelectItem>
                {warehousesForBranch.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search stocked products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="text-center py-14 text-muted-foreground text-sm">Loading stock…</div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <PackageSearch size={40} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm font-medium">No stock at this branch yet</p>
            <p className="text-xs mt-1">Add an existing product to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRows.map((row) => (
              <div key={row.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{row.productName}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    {row.productCode && <span>{row.productCode}</span>}
                    {row.warehouseName && <span>· {row.warehouseName}</span>}
                    {row.batchNo && <span>· Batch {row.batchNo}</span>}
                    {row.receivedViaTransfer && <span className="text-primary">· via transfer</span>}
                  </div>
                  <p className="text-xs mt-0.5">
                    <span className="font-semibold">{row.stock}</span> in stock · {formatCurrency(row.salePrice)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(row)} className="p-1.5" aria-label="Edit stock"><Pencil size={14} className="text-muted-foreground" /></button>
                  <button onClick={() => setConfirmDeleteRow(row)} className="p-1.5" aria-label="Remove stock"><Trash2 size={14} className="text-destructive" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={openAdd}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center"
        aria-label="Add stock to this branch"
      >
        <Plus size={24} />
      </button>

      {/* Add stock dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader><DialogTitle>Add Stock — {activeBranch?.name ?? "Branch"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            {!form.productId ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search catalog..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9" autoFocus />
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {filteredCatalog.map((p) => {
                    const img = getImageUrl(p.image);
                    return (
                      <button
                        key={p.id}
                        onClick={() => selectProductForAdd(p)}
                        className="w-full flex items-center gap-2.5 rounded-lg border border-border p-2 text-left hover:bg-accent/50"
                      >
                        {img ? (
                          <img src={img} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.code}</p>
                        </div>
                      </button>
                    );
                  })}
                  {filteredCatalog.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No products match.</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-sm font-semibold truncate">{selectedProduct?.name}</p>
                  <button onClick={() => setForm((f) => ({ ...f, productId: "" }))} className="text-xs text-primary font-medium shrink-0 ml-2">
                    Change
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Quantity *</Label>
                    <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs">Warehouse</Label>
                    <Select value={form.warehouseId} onValueChange={(v) => setForm((f) => ({ ...f, warehouseId: v }))}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {warehousesForBranch.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Purchase Price *</Label>
                    <Input type="number" min={0} value={form.purchasePrice} onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div>
                    <Label className="text-xs">Sale Price *</Label>
                    <Input type="number" min={0} value={form.salePrice} onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Wholesale Price</Label>
                    <Input type="number" min={0} value={form.wholesalePrice} onChange={(e) => setForm((f) => ({ ...f, wholesalePrice: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div>
                    <Label className="text-xs">Dealer Price</Label>
                    <Input type="number" min={0} value={form.dealerPrice} onChange={(e) => setForm((f) => ({ ...f, dealerPrice: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <Label className="text-xs">Batch No.</Label>
                    <Input value={form.batchNo} onChange={(e) => setForm((f) => ({ ...f, batchNo: e.target.value }))} placeholder="Optional" />
                  </div>
                  <div>
                    <Label className="text-xs">Mfg. Date</Label>
                    <Input type="date" value={form.mfgDate} onChange={(e) => setForm((f) => ({ ...f, mfgDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Expiry</Label>
                    <Input type="date" value={form.expireDate} onChange={(e) => setForm((f) => ({ ...f, expireDate: e.target.value }))} />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={handleAdd} disabled={saving}>{saving ? "Saving…" : "Add Stock"}</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit stock dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader><DialogTitle>Edit Stock{editRow ? ` — ${editRow.productName}` : ""}</DialogTitle></DialogHeader>
          {editRow && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" min={0} value={editForm.quantity} onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Warehouse</Label>
                  <Select value={editForm.warehouseId} onValueChange={(v) => setEditForm((f) => ({ ...f, warehouseId: v }))}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {warehousesForBranch.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Purchase Price</Label>
                  <Input type="number" min={0} value={editForm.purchasePrice} onChange={(e) => setEditForm((f) => ({ ...f, purchasePrice: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Sale Price</Label>
                  <Input type="number" min={0} value={editForm.salePrice} onChange={(e) => setEditForm((f) => ({ ...f, salePrice: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Wholesale Price</Label>
                  <Input type="number" min={0} value={editForm.wholesalePrice} onChange={(e) => setEditForm((f) => ({ ...f, wholesalePrice: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Dealer Price</Label>
                  <Input type="number" min={0} value={editForm.dealerPrice} onChange={(e) => setEditForm((f) => ({ ...f, dealerPrice: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Batch No.</Label>
                  <Input value={editForm.batchNo} onChange={(e) => setEditForm((f) => ({ ...f, batchNo: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Expiry</Label>
                  <Input type="date" value={editForm.expireDate} onChange={(e) => setEditForm((f) => ({ ...f, expireDate: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setEditRow(null)}>Cancel</Button>
                <Button className="flex-1" onClick={handleEditSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteRow}
        title="Remove Stock"
        message={`Remove ${confirmDeleteRow?.productName ?? "this product"} from ${activeBranch?.name ?? "this branch"}'s stock? This cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteRow(null)}
        loading={deleting}
      />

      <BottomNav />
    </div>
  );
};

export default BranchStock;
