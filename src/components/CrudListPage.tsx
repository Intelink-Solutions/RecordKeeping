import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, MoreVertical, Edit2, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { store } from "@/lib/store";
import { UnauthenticatedError, NetworkDownError, tokenStorage } from "@/lib/api";
import { enqueueOfflineOp } from "@/lib/offline-queue";
import ConfirmDialog from "@/components/ConfirmDialog";

interface CrudListPageProps<T extends { id: string }> {
  title: string;
  items: T[];
  onSave: (items: T[]) => void;
  columns: { key: keyof T; label: string }[];
  renderForm: (item: Partial<T>, onChange: (field: keyof T, value: unknown) => void) => React.ReactNode;
  createDefaults: () => Partial<T>;
  searchKey: keyof T;
  displayName: string;
  /** @deprecated kept for API compat with HRM pages that still pass it */
  apiResource?: string;
  onApiCreate?: (data: Partial<T>) => Promise<T | null>;
  onApiUpdate?: (id: string, data: Partial<T>) => Promise<T | null>;
  onApiDelete?: (id: string) => Promise<void>;
  /** Return an error string to block save, or null/undefined to proceed */
  validate?: (item: Partial<T>) => string | null | undefined;
  /** Hide Add/Edit/Delete UI for read-only viewers (defaults to true — most
   * consumers are fully manageable; pass false for e.g. branch staff who can
   * view but not create/edit). The backend still enforces this independently. */
  canManage?: boolean;
}

function CrudListPage<T extends { id: string }>({
  title, items: initialItems, onSave, columns, renderForm, createDefaults, searchKey, displayName,
  apiResource: _apiResource, onApiCreate, onApiUpdate, onApiDelete, validate, canManage = true,
}: CrudListPageProps<T>) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Partial<T> | null>(null);
  const [showView, setShowView] = useState<T | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmMulti, setConfirmMulti] = useState(false);

  const isOnline = store.getBusinessProfile().isOnline;
  const useApi = isOnline && !tokenStorage.isOffline() && !!(onApiCreate || onApiUpdate || onApiDelete);

  const handleAuthError = () => {
    tokenStorage.clear();
    toast({ title: "Session expired — please log in again.", variant: "destructive" });
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const filtered = items.filter((item) =>
    String(item[searchKey]).toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const openAdd = () => { setEditItem(createDefaults()); setShowForm(true); };
  const openEdit = (item: T) => { setEditItem({ ...item }); setShowForm(true); setActiveMenu(null); };

  const handleSave = async () => {
    if (!editItem || saving) return;

    if (validate) {
      const err = validate(editItem);
      if (err) {
        toast({ title: err, variant: "destructive" });
        return;
      }
    }

    const isEdit = !!(editItem as T).id && items.find((i) => i.id === (editItem as T).id);

    if (useApi) {
      // Prevent double-tap while the optimistic update is being applied
      setSaving(true);

      // Snapshot + optimistic list built before any async work
      const previousItems = items;
      const tempId = isEdit ? (editItem as T).id : `__tmp_${Date.now()}`;
      const optimisticItem = { ...editItem, id: tempId } as T;
      const optimisticList = isEdit
        ? items.map((i) => (i.id === tempId ? optimisticItem : i))
        : [optimisticItem, ...items];

      // Apply immediately — close form + update list before any network round-trip
      setItems(optimisticList);
      onSave(optimisticList);
      setShowForm(false);
      setEditItem(null);
      setSaving(false);
      toast({ title: `${displayName} saved!` });

      // Background sync — revert on failure
      try {
        let result: T | null = null;
        if (isEdit && onApiUpdate) {
          result = await onApiUpdate((editItem as T).id, editItem);
        } else if (!isEdit && onApiCreate) {
          result = await onApiCreate(editItem);
        }
        if (result) {
          // Replace temp item with server-confirmed item (real ID for creates)
          const confirmed = optimisticList.map((i) => (i.id === tempId ? result! : i));
          setItems(confirmed);
          onSave(confirmed);
        }
      } catch (e: unknown) {
        if (e instanceof UnauthenticatedError) {
          setItems(previousItems);
          onSave(previousItems);
          handleAuthError();
          return;
        }
        if (e instanceof NetworkDownError) {
          // Keep the optimistic update — queue for replay when internet returns
          const qPath = _apiResource ? `/hrm/${_apiResource}` : "";
          if (qPath) {
            if (isEdit) {
              enqueueOfflineOp("PUT", `${qPath}/${(editItem as T).id}`, editItem as Record<string, unknown>);
            } else {
              enqueueOfflineOp("POST", qPath, editItem as Record<string, unknown>);
            }
          }
          toast({ title: `${displayName} saved offline`, description: "Will sync when internet returns." });
          return;
        }
        // Revert to pre-save state on other errors
        setItems(previousItems);
        onSave(previousItems);
        const msg = e instanceof Error ? e.message : "Save failed";
        toast({ title: `Could not save — ${msg}`, variant: "destructive" });
      }
      return;
    }

    // Offline / local-only save
    let updated: T[];
    if (isEdit) {
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

  const requestDelete = (id: string) => {
    setActiveMenu(null);
    setConfirmDeleteId(id);
  };

  const executeSingleDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;

    if (useApi && onApiDelete) {
      const previousItems = items;
      const optimisticList = items.filter((i) => i.id !== id);
      setItems(optimisticList);
      onSave(optimisticList);
      setConfirmDeleteId(null);
      toast({ title: `${displayName} deleted` });

      try {
        await onApiDelete(id);
      } catch (e: unknown) {
        if (e instanceof UnauthenticatedError) {
          setItems(previousItems);
          onSave(previousItems);
          handleAuthError();
          return;
        }
        if (e instanceof NetworkDownError) {
          const qPath = _apiResource ? `/hrm/${_apiResource}` : "";
          if (qPath) enqueueOfflineOp("DELETE", `${qPath}/${id}`);
          toast({ title: `${displayName} deleted offline`, description: "Will sync when internet returns." });
          return;
        }
        setItems(previousItems);
        onSave(previousItems);
        const msg = e instanceof Error ? e.message : "Delete failed";
        toast({ title: msg, variant: "destructive" });
      }
      return;
    }

    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    onSave(updated);
    setConfirmDeleteId(null);
    toast({ title: `${displayName} deleted` });
  };

  const executeMultiDelete = async () => {
    if (useApi && onApiDelete) {
      const toDelete = [...selectedIds];
      const previousItems = items;
      const optimisticList = items.filter((i) => !toDelete.includes(i.id));
      setItems(optimisticList);
      onSave(optimisticList);
      setSelectedIds([]);
      setConfirmMulti(false);
      toast({ title: `${toDelete.length} items deleted` });

      try {
        await Promise.all(toDelete.map((id) => onApiDelete(id).catch(() => {})));
      } catch (e: unknown) {
        if (e instanceof UnauthenticatedError) { handleAuthError(); return; }
        // Parallel deletes with .catch absorb per-item errors; revert only on hard failure
        setItems(previousItems);
        onSave(previousItems);
        const msg = e instanceof Error ? e.message : "Delete failed";
        toast({ title: msg, variant: "destructive" });
      }
      return;
    }

    const updated = items.filter((i) => !selectedIds.includes(i.id));
    setItems(updated);
    onSave(updated);
    setSelectedIds([]);
    setConfirmMulti(false);
    toast({ title: `${selectedIds.length} items deleted` });
  };

  const updateField = (field: keyof T, value: unknown) => {
    setEditItem((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const isEditMode = !!(editItem && (editItem as T).id && items.find(i => i.id === (editItem as T).id));

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title={title} rightAction={
        !canManage ? undefined : selectedIds.length > 0 ? (
          <button onClick={() => setConfirmMulti(true)} className="text-destructive text-sm font-semibold">
            Delete ({selectedIds.length})
          </button>
        ) : (
          <button onClick={openAdd} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
            <Plus size={14} /> Add New
          </button>
        )
      } />

      <div className="px-4 py-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={`Search ${displayName}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3 cursor-pointer active:bg-accent/50 transition-colors"
              onClick={() => { setShowView(item); setActiveMenu(null); }}
            >
              {canManage && (
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={(e) => {
                      setSelectedIds(e.target.checked ? [...selectedIds, item.id] : selectedIds.filter((id) => id !== item.id));
                    }}
                    className="w-4 h-4 rounded border-border"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {columns.slice(0, 2).map((col) => (
                  <p key={String(col.key)} className={col.key === columns[0].key ? "font-semibold text-sm truncate" : "text-xs text-muted-foreground truncate"}>
                    {String(item[col.key] ?? "")}
                  </p>
                ))}
              </div>
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)} className="p-1">
                  <MoreVertical size={18} className="text-muted-foreground" />
                </button>
                {activeMenu === item.id && (
                  <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                    <button onClick={() => { setShowView(item); setActiveMenu(null); }} className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-muted">
                      <Eye size={14} /> View
                    </button>
                    {canManage && (
                      <>
                        <button onClick={() => openEdit(item)} className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-muted">
                          <Edit2 size={14} /> Edit
                        </button>
                        <button onClick={() => requestDelete(item.id)} className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-muted text-destructive">
                          <Trash2 size={14} /> Delete
                        </button>
                      </>
                    )}
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

      {/* Add/Edit Form — scrollable dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="flex flex-col max-h-[90vh] w-[calc(100%-2rem)] max-w-md gap-0 p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
            <DialogTitle className="text-base font-bold">
              {isEditMode ? "Edit" : "Add"} {displayName}
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable fields */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {editItem && renderForm(editItem, updateField)}
          </div>

          {/* Sticky save button */}
          <div className="px-5 pb-5 pt-3 border-t border-border flex-shrink-0 bg-background">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl disabled:opacity-50 text-sm active:scale-[0.98] transition-transform"
            >
              {saving ? "Saving…" : isEditMode ? `Update ${displayName}` : `Save ${displayName}`}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog — scrollable */}
      <Dialog open={!!showView} onOpenChange={() => setShowView(null)}>
        <DialogContent className="flex flex-col max-h-[85vh] w-[calc(100%-2rem)] max-w-md gap-0 p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
            <DialogTitle className="text-base font-bold">{displayName} Details</DialogTitle>
          </DialogHeader>
          {showView && (
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {columns.map((col) => (
                <div key={String(col.key)} className="flex justify-between items-start gap-3 text-sm py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground shrink-0">{col.label}</span>
                  <span className="font-medium text-right break-all">{String(showView[col.key] ?? "—")}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title={`Delete ${displayName}`}
        message={`Are you sure you want to delete this ${displayName.toLowerCase()}? This action cannot be undone.`}
        onConfirm={executeSingleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
      <ConfirmDialog
        open={confirmMulti}
        title={`Delete ${selectedIds.length} ${displayName}s`}
        message={`Are you sure you want to delete ${selectedIds.length} selected items? This cannot be undone.`}
        onConfirm={executeMultiDelete}
        onCancel={() => setConfirmMulti(false)}
      />

      <BottomNav />
    </div>
  );
}

export default CrudListPage;
