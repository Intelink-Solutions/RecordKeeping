import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus, ArrowLeftRight, PackageCheck, RefreshCw,
  WifiOff, ChevronDown, ChevronUp, Warehouse, GitBranch, CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { store } from "@/lib/store";
import { apiGet, apiPost, NetworkDownError } from "@/lib/api";
import { enqueueOfflineOp } from "@/lib/offline-queue";
import { formatCurrency } from "@/lib/currency";
import { useAppContext } from "@/hooks/use-app-context";

interface TransferProduct {
  name: string;
  quantity: number;
  unitPrice?: number;
}

interface TransferListItem {
  id: string;
  invoiceNo?: string;
  fromBranchId?: string;
  toBranchId?: string;
  fromBranchName?: string;
  toBranchName?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  fromWarehouseName?: string;
  toWarehouseName?: string;
  transferDate?: string;
  note?: string;
  shippingCharge?: number;
  status: string;
  products?: TransferProduct[];
}

interface StockRow {
  id: string;
  productId: string;
  productName: string;
  productStock: number;
  productPurchasePrice: number;
}

const NONE = "none";
const CACHE_KEY = "pos_transfers_cache";

function unwrapList(raw: unknown): Record<string, unknown>[] {
  const obj = raw as { data?: unknown } | undefined;
  const inner = obj?.data;
  if (Array.isArray(inner)) return inner as Record<string, unknown>[];
  const nested = (inner as { data?: unknown } | undefined)?.data;
  return Array.isArray(nested) ? (nested as Record<string, unknown>[]) : [];
}

function mapRow(t: Record<string, unknown>): TransferListItem {
  // The API returns line items under `transfer_products`, not `products` —
  // confirmed against the live backend's TransferController response shape.
  const productsRaw = Array.isArray(t.transfer_products)
    ? (t.transfer_products as Record<string, unknown>[])
    : Array.isArray(t.products) ? (t.products as Record<string, unknown>[]) : [];
  const products: TransferProduct[] = productsRaw.map((p) => {
    const prod = p.product as Record<string, unknown> | undefined;
    return {
      name: String(prod?.productName ?? prod?.name ?? p.product_name ?? p.name ?? "Product"),
      quantity: Number(p.quantity ?? p.qty ?? 0),
      unitPrice: Number(p.unit_price ?? p.unitPrice ?? 0) || undefined,
    };
  });
  return {
    id: String(t.id),
    invoiceNo: t.invoice_no as string | undefined,
    fromBranchId: t.from_branch_id != null ? String(t.from_branch_id) : undefined,
    toBranchId: t.to_branch_id != null ? String(t.to_branch_id) : undefined,
    fromBranchName: (t.from_branch as Record<string, unknown> | undefined)?.name as string | undefined,
    toBranchName: (t.to_branch as Record<string, unknown> | undefined)?.name as string | undefined,
    fromWarehouseId: t.from_warehouse_id != null ? String(t.from_warehouse_id) : undefined,
    toWarehouseId: t.to_warehouse_id != null ? String(t.to_warehouse_id) : undefined,
    fromWarehouseName: (t.from_warehouse as Record<string, unknown> | undefined)?.name as string | undefined,
    toWarehouseName: (t.to_warehouse as Record<string, unknown> | undefined)?.name as string | undefined,
    transferDate: t.transfer_date as string | undefined,
    note: t.note as string | undefined,
    shippingCharge: t.shipping_charge != null ? Number(t.shipping_charge) : undefined,
    status: (t.status as string) || "pending",
    products: products.length > 0 ? products : undefined,
  };
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed" || status === "received")
    return <Badge className="bg-green-100 text-green-700 border-green-200 capitalize">Received</Badge>;
  if (status === "cancelled")
    return <Badge variant="destructive" className="capitalize">Cancelled</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 capitalize">Pending</Badge>;
}

const Transfers = () => {
  const { toast } = useToast();
  const { isOwner } = useAppContext();
  const branches = store.getBranches();
  const warehouses = store.getWarehouses();
  const effectiveBranchId = store.getEffectiveBranchId();

  const [transfers, setTransfers] = useState<TransferListItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]") as TransferListItem[]; } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [shippingCharge, setShippingCharge] = useState("");
  const [fromBranchId, setFromBranchId] = useState(effectiveBranchId ?? "");
  const [toBranchId, setToBranchId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState(NONE);
  const [toWarehouseId, setToWarehouseId] = useState(NONE);
  const [note, setNote] = useState("");
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockLoadAttempted, setStockLoadAttempted] = useState(false);
  const [qtyByStock, setQtyByStock] = useState<Record<string, string>>({});

  // Accept confirm
  const [acceptTarget, setAcceptTarget] = useState<TransferListItem | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  // Expand product lines on cards
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fromWarehouses = warehouses.filter((w) => !w.branchId || w.branchId === fromBranchId);
  const toWarehouses = warehouses.filter((w) => !w.branchId || w.branchId === toBranchId);

  // Incoming = pending transfers TO my branch (or owner sees all pending)
  const incomingPending = transfers.filter(
    (t) => t.status === "pending" && (isOwner || t.toBranchId === effectiveBranchId)
  );
  const otherTransfers = transfers.filter(
    (t) => !(t.status === "pending" && (isOwner || t.toBranchId === effectiveBranchId))
  );

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    setOffline(false);
    try {
      const raw = await apiGet<unknown>("/transfers");
      const rows = unwrapList(raw).map(mapRow);
      setTransfers(rows);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(rows)); } catch { /* ignore */ }
    } catch (err) {
      if (err instanceof NetworkDownError) {
        setOffline(true);
      } else {
        toast({ title: "Failed to load transfers", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  function resetForm() {
    setTransferDate(new Date().toISOString().split("T")[0]);
    setShippingCharge("");
    setFromBranchId(effectiveBranchId ?? "");
    setToBranchId("");
    setFromWarehouseId(NONE);
    setToWarehouseId(NONE);
    setNote("");
    setStockRows([]);
    setStockLoadAttempted(false);
    setQtyByStock({});
  }

  async function loadAvailableStock() {
    if (!fromBranchId) {
      toast({ title: "Select a From Branch first", variant: "destructive" });
      return;
    }
    setLoadingStock(true);
    setStockRows([]);
    setStockLoadAttempted(true);
    try {
      const params: Record<string, string> = { branch_id: fromBranchId };
      if (fromWarehouseId !== NONE) params.warehouse_id = fromWarehouseId;
      const raw = await apiGet<unknown>("/branch-stock", params);
      const obj = raw as { data?: unknown[] };
      const rows = Array.isArray(obj?.data) ? obj.data : [];
      // No local fallback here on purpose: the locally-synced product cache
      // only keeps ONE stock id per product (whichever branch's stock row
      // happened to sync first — see mapProduct in live-sync.ts), so it can't
      // tell branches apart. Substituting it silently sent the wrong
      // branch's stock_id and the backend correctly rejected it ("Stock ID
      // X not found in source branch"). /branch-stock is the only source
      // that's actually scoped to the selected branch.
      setStockRows(
        (rows as Record<string, unknown>[]).map((s) => ({
          id: String(s.id),
          productId: String(s.product_id),
          productName: ((s.product as Record<string, unknown> | undefined)?.productName as string)
            || ((s.product as Record<string, unknown> | undefined)?.name as string)
            || "Product",
          productStock: Number(s.productStock ?? s.product_stock ?? 0),
          productPurchasePrice: Number(s.productPurchasePrice ?? s.purchase_price ?? 0),
        }))
      );
      if (rows.length === 0) {
        toast({
          title: "No stock available",
          description: fromWarehouseId !== NONE
            ? "No stock is assigned to this specific warehouse yet. Try \"None\" to see all of this branch's stock, or add stock to this warehouse first from Branch Stock."
            : "This branch has no stock to transfer yet — add some from Branch Stock or record a purchase first.",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to load stock",
        description: err instanceof Error ? err.message : "Could not load stock for this branch — please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingStock(false);
    }
  }

  async function handleCreate() {
    if (!fromBranchId || !toBranchId) {
      toast({ title: "From and To branch are required", variant: "destructive" });
      return;
    }
    if (fromBranchId === toBranchId) {
      toast({ title: "Source and destination must be different", variant: "destructive" });
      return;
    }
    if (stockRows.length === 0) {
      toast({ title: "Click \"Load Available Stock\" first", variant: "destructive" });
      return;
    }
    const products = stockRows
      .filter((r) => Number(qtyByStock[r.id]) > 0)
      .map((r) => ({
        stock_id: Number(r.id),
        product_id: Number(r.productId),
        quantity: Number(qtyByStock[r.id]),
        unit_price: r.productPurchasePrice,
      }));
    if (products.length === 0) {
      toast({ title: "Enter a quantity for at least one product", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await apiPost("/transfers", {
        to_branch_id: Number(toBranchId),
        from_branch_id: Number(fromBranchId),
        from_warehouse_id: fromWarehouseId !== NONE ? Number(fromWarehouseId) : undefined,
        to_warehouse_id: toWarehouseId !== NONE ? Number(toWarehouseId) : undefined,
        transfer_date: transferDate,
        note: note || undefined,
        shipping_charge: shippingCharge ? Number(shippingCharge) : undefined,
        products,
      });
      toast({ title: "Transfer created", description: "Destination branch will be notified to receive." });
      setShowCreate(false);
      resetForm();
      fetchTransfers();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Could not create transfer", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function confirmReceive() {
    if (!acceptTarget) return;
    const id = acceptTarget.id;
    const target = acceptTarget;
    setAcceptTarget(null);
    setReceivingId(id);

    // Optimistic update — show as received immediately
    const updateStatus = (list: TransferListItem[]) =>
      list.map((t) => t.id === id ? { ...t, status: "completed" } : t);
    setTransfers((prev) => {
      const updated = updateStatus(prev);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });

    // Notify owner
    const branchName = target.toBranchName || "Branch";
    const fromName = target.fromBranchName || target.fromWarehouseName || "source";
    store.saveNotifications([
      {
        id: crypto.randomUUID(),
        title: "Stock received",
        message: `${branchName} accepted transfer from ${fromName}.`,
        createdAt: new Date().toISOString(),
        type: "success" as const,
        read: false,
      },
      ...store.getNotifications(),
    ]);

    try {
      await apiPost(`/transfers/${id}/receive`, {});
      toast({ title: "Transfer accepted", description: `Stock from ${fromName} successfully received.` });
      fetchTransfers(); // re-fetch to get server's canonical status
    } catch (err) {
      if (err instanceof NetworkDownError) {
        enqueueOfflineOp("POST", `/transfers/${id}/receive`, {});
        toast({ title: "Accepted offline", description: "Will sync with server when internet is restored." });
      } else {
        // Revert optimistic update
        setTransfers((prev) => prev.map((t) => t.id === id ? { ...t, status: "pending" } : t));
        toast({ title: "Error", description: err instanceof Error ? err.message : "Could not receive transfer", variant: "destructive" });
      }
    } finally {
      setReceivingId(null);
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function TransferCard({ t, showReceive }: { t: TransferListItem; showReceive: boolean }) {
    const expanded = expandedIds.has(t.id);
    const from = [t.fromBranchName, t.fromWarehouseName ? `(${t.fromWarehouseName})` : null].filter(Boolean).join(" ");
    const to = [t.toBranchName, t.toWarehouseName ? `(${t.toWarehouseName})` : null].filter(Boolean).join(" ");
    return (
      <div className={`rounded-xl border bg-card ${showReceive ? "border-primary/40 shadow-sm" : ""}`}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{t.invoiceNo || `Transfer #${t.id}`}</p>
                <StatusBadge status={t.status} />
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                {t.fromWarehouseId ? <Warehouse size={10} className="shrink-0" /> : <GitBranch size={10} className="shrink-0" />}
                <span className="truncate">{from || "?"}</span>
                <ArrowLeftRight size={10} className="mx-1 shrink-0" />
                {t.toWarehouseId ? <Warehouse size={10} className="shrink-0" /> : <GitBranch size={10} className="shrink-0" />}
                <span className="truncate">{to || "?"}</span>
              </div>
              {t.transferDate && <p className="text-[11px] text-muted-foreground mt-0.5">{t.transferDate}</p>}
              {t.note && <p className="text-[11px] text-muted-foreground italic mt-0.5">"{t.note}"</p>}
            </div>
            {t.products && t.products.length > 0 && (
              <button
                onClick={() => toggleExpand(t.id)}
                className="shrink-0 flex items-center gap-0.5 text-[11px] text-primary font-medium mt-0.5"
              >
                {t.products.length} item{t.products.length > 1 ? "s" : ""}
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>

          {/* Expanded product lines */}
          {expanded && t.products && (
            <div className="mt-3 space-y-1.5 border-t pt-3">
              {t.products.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-foreground font-medium truncate flex-1">{p.name}</span>
                  <span className="text-muted-foreground ml-2 shrink-0">× {p.quantity}</span>
                  {p.unitPrice ? <span className="ml-2 shrink-0 font-semibold">{formatCurrency(p.unitPrice * p.quantity)}</span> : null}
                </div>
              ))}
              {t.shippingCharge ? (
                <div className="flex justify-between text-xs border-t pt-1.5 mt-1.5">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">{formatCurrency(t.shippingCharge)}</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Accept button */}
          {showReceive && (
            <Button
              size="sm"
              className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={receivingId === t.id}
              onClick={() => setAcceptTarget(t)}
            >
              <PackageCheck size={14} className="mr-1.5" />
              {receivingId === t.id ? "Accepting…" : "Accept & Receive Transfer"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader
        title="Stock Transfers"
        rightAction={
          <div className="flex items-center gap-2">
            <button onClick={fetchTransfers} className="p-2 rounded-full" aria-label="Refresh">
              <RefreshCw size={15} className={`text-white/80 ${loading ? "animate-spin" : ""}`} />
            </button>
            {isOwner && (
              <button
                onClick={() => { resetForm(); setShowCreate(true); }}
                className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Plus size={14} /> New
              </button>
            )}
          </div>
        }
      />

      <div className="px-4 pt-4 space-y-4">
        {offline && (
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 text-warning rounded-xl px-3 py-2 text-xs">
            <WifiOff size={13} />
            <span>Offline — showing cached transfers. <button className="underline font-semibold" onClick={fetchTransfers}>Retry</button></span>
          </div>
        )}

        {loading && transfers.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground text-sm">Loading transfers…</div>
        ) : (
          <>
            {/* ── Incoming pending transfers ─────────────────────────── */}
            {incomingPending.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    Awaiting Your Acceptance ({incomingPending.length})
                  </p>
                </div>
                <div className="space-y-3">
                  {incomingPending.map((t) => (
                    <TransferCard key={t.id} t={t} showReceive />
                  ))}
                </div>
              </section>
            )}

            {/* ── Transfer history ───────────────────────────────────── */}
            {otherTransfers.length > 0 && (
              <section>
                {incomingPending.length > 0 && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">History</p>
                )}
                <div className="space-y-3">
                  {otherTransfers.map((t) => (
                    <TransferCard key={t.id} t={t} showReceive={false} />
                  ))}
                </div>
              </section>
            )}

            {transfers.length === 0 && (
              <div className="text-center py-14 text-muted-foreground">
                <ArrowLeftRight size={44} className="mx-auto mb-3 opacity-25" />
                <p className="text-sm font-medium">No transfers yet</p>
                {isOwner && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => { resetForm(); setShowCreate(true); }}>
                    <Plus size={14} className="mr-1" /> Create Transfer
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Accept Confirm Dialog ──────────────────────────────────────── */}
      <Dialog open={!!acceptTarget} onOpenChange={() => setAcceptTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Transfer?</DialogTitle>
          </DialogHeader>
          {acceptTarget && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-semibold">{acceptTarget.fromBranchName || acceptTarget.fromWarehouseName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-semibold">{acceptTarget.toBranchName || acceptTarget.toWarehouseName || "—"}</span>
                </div>
                {acceptTarget.transferDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{acceptTarget.transferDate}</span>
                  </div>
                )}
              </div>

              {acceptTarget.products && acceptTarget.products.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Products</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {acceptTarget.products.map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <span className="font-medium truncate flex-1">{p.name}</span>
                        <span className="text-muted-foreground ml-2">× {p.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {acceptTarget.note && (
                <p className="text-xs text-muted-foreground italic bg-muted/40 rounded-lg px-3 py-2">
                  Note: {acceptTarget.note}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Accepting will mark this transfer as <strong>Received</strong>. The stock will be added to your branch.
              </p>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setAcceptTarget(null)}>Cancel</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={confirmReceive}>
                  <PackageCheck size={14} className="mr-1.5" /> Confirm Accept
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Transfer Dialog ─────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle>Create Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Transfer Date *</Label>
                <Input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Shipping Charge</Label>
                <Input type="number" value={shippingCharge} onChange={(e) => setShippingCharge(e.target.value)} placeholder="0" />
              </div>
            </div>

            {/* From */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From Branch *</Label>
                <Select value={fromBranchId} onValueChange={(v) => { setFromBranchId(v); setFromWarehouseId(NONE); setStockRows([]); setStockLoadAttempted(false); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">From Warehouse</Label>
                <Select value={fromWarehouseId} onValueChange={(v) => { setFromWarehouseId(v); setStockRows([]); setStockLoadAttempted(false); }}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {fromWarehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* To */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">To Branch *</Label>
                <Select value={toBranchId} onValueChange={(v) => { setToBranchId(v); setToWarehouseId(NONE); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {branches.filter((b) => b.id !== fromBranchId).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">To Warehouse</Label>
                <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {toWarehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Textarea placeholder="Note (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

            {/* Products */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Products</Label>
                <Button size="sm" variant="outline" onClick={loadAvailableStock} disabled={loadingStock}>
                  <RefreshCw size={13} className={`mr-1 ${loadingStock ? "animate-spin" : ""}`} />
                  Load Stock
                </Button>
              </div>

              {stockRows.length === 0 ? (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                  {stockLoadAttempted
                    ? (fromWarehouseId !== NONE
                        ? "No stock is assigned to this specific warehouse yet. Switch \"From Warehouse\" to None to see all of this branch's stock instead."
                        : "This branch has no stock to transfer yet.")
                    : "Select a source branch then tap \"Load Stock\" to see available products."}
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stockRows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2 rounded-lg border p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{row.productName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Available: {row.productStock} · {formatCurrency(row.productPurchasePrice)}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={row.productStock}
                        placeholder="Qty"
                        className="w-20 h-8 text-xs"
                        value={qtyByStock[row.id] || ""}
                        onChange={(e) => setQtyByStock((q) => ({ ...q, [row.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={saving}>
                {saving ? "Saving…" : "Create Transfer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Transfers;
