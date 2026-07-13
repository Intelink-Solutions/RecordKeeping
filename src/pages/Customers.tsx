import { useState } from "react";
import { Plus, Search, Edit, Trash2, ChevronRight, CreditCard } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import ConfirmDialog from "@/components/ConfirmDialog";
import PayDueDialog, { PayDueParty } from "@/components/PayDueDialog";
import { store, Customer } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/use-app-context";
import { formatCurrency } from "@/lib/currency";
import { useDebounce } from "@/hooks/use-debounce";
import { apiCreateParty, apiUpdateParty, apiDeleteParty } from "@/lib/api";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { useLiveData, showSaved } from "@/hooks/use-live-data";
import { validateOptionalEmail, validateOptionalPhone } from "@/lib/validators";

const typeColors: Record<string, string> = { Dealer: "#e74c3c", Retailer: "#e67e22", Wholesaler: "#27ae60" };

const Customers = () => {
  const { toast } = useToast();
  const { canManageData, roleLabel } = useAppContext();
  const customers = useLiveData(() => store.getCustomers());
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [payParty, setPayParty] = useState<PayDueParty | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", type: "Retailer" as Customer["type"], initialDue: "0" });

  const filtered = customers.filter(c => c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || c.phone?.includes(debouncedSearch));

  const resetForm = () => setForm({ name: "", phone: "", email: "", address: "", type: "Retailer", initialDue: "0" });

  const [saving, setSaving] = useState(false);

  const addCustomer = async () => {
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
        type: form.type,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        opening_balance: due,
        opening_balance_type: "due",
      });
      await syncLiveBusinessData();
      resetForm(); setShowAdd(false);
      showSaved("Customer added!");
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to add customer", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editCustomer) return;
    const emailError = validateOptionalEmail(editCustomer.email);
    if (emailError) { toast({ title: emailError, variant: "destructive" }); return; }
    const phoneError = validateOptionalPhone(editCustomer.phone);
    if (phoneError) { toast({ title: phoneError, variant: "destructive" }); return; }
    setSaving(true);
    try {
      await apiUpdateParty(editCustomer.id, {
        name: editCustomer.name,
        type: editCustomer.type,
        phone: editCustomer.phone || undefined,
        email: editCustomer.email || undefined,
        address: editCustomer.address || undefined,
      });
      await syncLiveBusinessData();
      setEditCustomer(null);
      showSaved("Customer updated!");
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to update customer", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const executeDeleteCustomer = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await apiDeleteParty(confirmDeleteId);
      await syncLiveBusinessData();
      showSaved("Customer deleted");
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to delete customer", variant: "destructive" });
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="Customers" />
      <div className="px-4 py-3 space-y-3">
        {!canManageData && (
          <div className="text-xs rounded-lg border border-warning/30 bg-warning/10 text-warning px-3 py-2">
            {roleLabel} access: view-only mode
          </div>
        )}
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {filtered.map(c => (
          <div key={c.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-lg font-bold text-accent-foreground">{c.name[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{c.name}</p>
              <p className="text-xs font-semibold" style={{ color: typeColors[c.type] }}>{c.type}</p>
              {c.phone && <p className="text-[11px] text-muted-foreground">{c.phone}</p>}
            </div>
            <div className="text-right">
              {c.due > 0 && <><p className="font-bold text-sm">{formatCurrency(c.due)}</p><p className="text-[10px] text-warning font-medium">Debt</p></>}
            </div>
            <div className="flex gap-1">
              {canManageData && c.due > 0 && (
                <button
                  onClick={() => { setPayParty({ id: c.id, name: c.name, due: c.due, source: "customer" }); setPayDialogOpen(true); }}
                  className="p-1"
                  aria-label="Record payment"
                >
                  <CreditCard size={14} className="text-primary" />
                </button>
              )}
              {canManageData && (
                <>
                  <button onClick={() => setEditCustomer(c)} className="p-1"><Edit size={14} className="text-muted-foreground" /></button>
                  <button onClick={() => setConfirmDeleteId(c.id)} className="p-1"><Trash2 size={14} className="text-destructive" /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {canManageData && (
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center"><Plus size={24} /></button>
      )}

      <Dialog open={canManageData && showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as Customer["type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Retailer">Retailer</SelectItem><SelectItem value="Wholesaler">Wholesaler</SelectItem><SelectItem value="Dealer">Dealer</SelectItem></SelectContent></Select>
            <Input placeholder="Initial Debt" type="number" value={form.initialDue} onChange={e => setForm({ ...form, initialDue: e.target.value })} />
            <button onClick={addCustomer} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={canManageData && !!editCustomer} onOpenChange={() => setEditCustomer(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
          {editCustomer && (
            <div className="space-y-3">
              <Input value={editCustomer.name} onChange={e => setEditCustomer({ ...editCustomer, name: e.target.value })} />
              <Input value={editCustomer.phone || ""} onChange={e => setEditCustomer({ ...editCustomer, phone: e.target.value })} placeholder="Phone" />
              <Select value={editCustomer.type} onValueChange={v => setEditCustomer({ ...editCustomer, type: v as Customer["type"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Retailer">Retailer</SelectItem><SelectItem value="Wholesaler">Wholesaler</SelectItem><SelectItem value="Dealer">Dealer</SelectItem></SelectContent></Select>
              <button onClick={saveEdit} disabled={saving} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60">{saving ? "Updating..." : "Update"}</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        onConfirm={executeDeleteCustomer}
        onCancel={() => setConfirmDeleteId(null)}
        loading={deleting}
      />
      <PayDueDialog party={payParty} open={payDialogOpen} onOpenChange={setPayDialogOpen} />

      <BottomNav />
    </div>
  );
};

export default Customers;
