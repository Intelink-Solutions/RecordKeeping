import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import ConfirmDialog from "@/components/ConfirmDialog";
import { store, Supplier } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/use-app-context";
import { formatCurrency } from "@/lib/currency";
import { useDebounce } from "@/hooks/use-debounce";
import { apiCreateParty, apiUpdateParty, apiDeleteParty } from "@/lib/api";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { useLiveData, showSaved } from "@/hooks/use-live-data";
import { validateOptionalEmail, validateOptionalPhone } from "@/lib/validators";

const Suppliers = () => {
  const { toast } = useToast();
  const { canManageData, roleLabel } = useAppContext();
  const suppliers = useLiveData(() => store.getSuppliers());
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", initialDue: "0" });

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const [saving, setSaving] = useState(false);

  const addSupplier = async () => {
    if (!form.name.trim()) return;
    const emailError = validateOptionalEmail(form.email);
    if (emailError) { toast({ title: emailError, variant: "destructive" }); return; }
    const phoneError = validateOptionalPhone(form.phone);
    if (phoneError) { toast({ title: phoneError, variant: "destructive" }); return; }
    setSaving(true);
    try {
      const due = Number(form.initialDue) || 0;
      await apiCreateParty({
        name: form.name.trim(),
        type: "Supplier",
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        opening_balance: due,
        opening_balance_type: "due",
      });
      await syncLiveBusinessData();
      setForm({ name: "", phone: "", email: "", address: "", initialDue: "0" }); setShowAdd(false);
      showSaved("Supplier added!");
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to add supplier", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editSupplier) return;
    const emailError = validateOptionalEmail(editSupplier.email);
    if (emailError) { toast({ title: emailError, variant: "destructive" }); return; }
    const phoneError = validateOptionalPhone(editSupplier.phone);
    if (phoneError) { toast({ title: phoneError, variant: "destructive" }); return; }
    setSaving(true);
    try {
      await apiUpdateParty(editSupplier.id, {
        name: editSupplier.name,
        type: "Supplier",
        phone: editSupplier.phone || undefined,
        email: editSupplier.email || undefined,
        address: editSupplier.address || undefined,
      });
      await syncLiveBusinessData();
      setEditSupplier(null);
      showSaved("Supplier updated!");
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to update supplier", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const executeDeleteSupplier = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await apiDeleteParty(confirmDeleteId);
      await syncLiveBusinessData();
      showSaved("Supplier deleted");
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to delete supplier", variant: "destructive" });
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="Suppliers" />
      <div className="px-4 py-3 space-y-3">
        {!canManageData && (
          <div className="text-xs rounded-lg border border-warning/30 bg-warning/10 text-warning px-3 py-2">
            {roleLabel} access: view-only mode
          </div>
        )}
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {filtered.map(s => (
          <div key={s.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-info/15 flex items-center justify-center text-lg font-bold text-info">{s.name[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{s.name}</p>
              {s.phone && <p className="text-[11px] text-muted-foreground">{s.phone}</p>}
            </div>
            <div className="text-right">
              {s.due > 0 && <><p className="font-bold text-sm">{formatCurrency(s.due)}</p><p className="text-[10px] text-warning font-medium">Debt</p></>}
            </div>
            <div className="flex gap-1">
              {canManageData && (
                <>
                  <button onClick={() => setEditSupplier(s)} className="p-1"><Edit size={14} className="text-muted-foreground" /></button>
                  <button onClick={() => setConfirmDeleteId(s.id)} className="p-1"><Trash2 size={14} className="text-destructive" /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {canManageData && (
        <button onClick={() => setShowAdd(true)} className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center"><Plus size={24} /></button>
      )}

      <Dialog open={canManageData && showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <Input placeholder="Initial Debt" type="number" value={form.initialDue} onChange={e => setForm({ ...form, initialDue: e.target.value })} />
            <button onClick={addSupplier} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={canManageData && !!editSupplier} onOpenChange={() => setEditSupplier(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Supplier</DialogTitle></DialogHeader>
          {editSupplier && (
            <div className="space-y-3">
              <Input value={editSupplier.name} onChange={e => setEditSupplier({ ...editSupplier, name: e.target.value })} />
              <Input value={editSupplier.phone || ""} onChange={e => setEditSupplier({ ...editSupplier, phone: e.target.value })} placeholder="Phone" />
              <button onClick={saveEdit} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60">{saving ? "Updating..." : "Update"}</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This action cannot be undone."
        onConfirm={executeDeleteSupplier}
        onCancel={() => setConfirmDeleteId(null)}
        loading={deleting}
      />

      <BottomNav />
    </div>
  );
};

export default Suppliers;
