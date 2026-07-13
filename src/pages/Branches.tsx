import { useState } from "react";
import {
  GitBranch, Plus, Pencil, Trash2, Phone, MapPin, Mail,
  CheckCircle2, Building2, ArrowLeftRight, KeyRound, Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { store, Branch } from "@/lib/store";
import { useApiList, invalidateApiListCache } from "@/hooks/use-api-list";
import { apiCreateBranch, apiUpdateBranch, apiDeleteBranch, BRANCH_API_PATHS } from "@/lib/api";
import { useAppContext } from "@/hooks/use-app-context";
import { validateOptionalEmail, validateOptionalPhone } from "@/lib/validators";

function toBranchPayload(form: Partial<Branch>): Record<string, unknown> {
  const bal = form.branchOpeningBalance ?? undefined;
  return {
    name: form.name,
    phone: form.phone || undefined,
    email: form.email || undefined,
    address: form.address || undefined,
    // send both naming conventions — backend uses whichever matches its fillable list
    branchOpeningBalance: bal,
    opening_balance: bal,
    description: form.description || undefined,
    status: form.status === "Inactive" ? 0 : 1,
  };
}

const Branches = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOwner } = useAppContext();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Branch>>({});
  const [activeBranchId, setActiveBranchIdState] = useState<string>(store.getActiveBranchId() ?? "");

  const { items: branches, saveItems } = useApiList<Branch>({
    cacheKey: "branches",
    paths: BRANCH_API_PATHS,
    localGet: () => store.getBranches(),
    localSave: (next) => store.saveBranches(next),
  });

  const activeCount = branches.filter((b) => b.status === "Active").length;
  const inactiveCount = branches.length - activeCount;
  const filtered = branches.filter(
    (b) => !search || b.name.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setForm({ name: "", address: "", phone: "", email: "", status: "Active" });
    setShowForm(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setForm({ ...branch });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      toast({ title: "Branch name is required", variant: "destructive" });
      return;
    }
    const emailError = validateOptionalEmail(form.email);
    if (emailError) { toast({ title: emailError, variant: "destructive" }); return; }
    const phoneError = validateOptionalPhone(form.phone);
    if (phoneError) { toast({ title: phoneError, variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = toBranchPayload(form);
      if (editing) {
        const result = await apiUpdateBranch<Branch>(editing.id, payload);
        invalidateApiListCache("branches");
        saveItems(branches.map((b) => b.id === editing.id ? (result ?? { ...editing, ...form } as Branch) : b));
        toast({ title: "Branch updated" });
      } else {
        const result = await apiCreateBranch<Branch>(payload);
        invalidateApiListCache("branches");
        if (result) saveItems([...branches, result]);
        toast({ title: "Branch created" });
      }
      setShowForm(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this branch?")) return;
    setDeleting(id);
    try {
      await apiDeleteBranch(id);
      invalidateApiListCache("branches");
      saveItems(branches.filter((b) => b.id !== id));
      if (activeBranchId === id) {
        store.setActiveBranchId(null);
        setActiveBranchIdState("");
      }
      toast({ title: "Branch deleted" });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Could not delete branch",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  }

  function setActiveBranch(branch: Branch) {
    store.setActiveBranchId(branch.id);
    setActiveBranchIdState(branch.id);
    toast({ title: `Switched to ${branch.name}` });
  }

  function clearActiveBranch() {
    store.setActiveBranchId(null);
    setActiveBranchIdState("");
    toast({ title: "Viewing all branches" });
  }

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title="Branches" />

      <div className="px-4 pt-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{branches.length}</p>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">Total</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/40 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{activeCount}</p>
            <p className="text-xs font-medium text-green-600 dark:text-green-400 mt-0.5">Active</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/40 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">{inactiveCount}</p>
            <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-0.5">Inactive</p>
          </div>
        </div>

        {/* Quick links to related pages */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Building2, label: "Warehouses", path: "/warehouses", color: "#27ae60" },
            { icon: ArrowLeftRight, label: "Transfers", path: "/transfers", color: "#e67e22" },
            { icon: KeyRound, label: "Roles", path: "/branch-roles", color: "#8e44ad" },
          ].map(({ icon: Icon, label, path, color }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 hover:bg-muted transition-colors"
            >
              <Icon size={20} style={{ color }} />
              <span className="text-[11px] font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>

        {/* Active branch banner */}
        {activeBranchId && (() => {
          const ab = branches.find((b) => b.id === activeBranchId);
          return ab ? (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-primary" />
                <span className="text-xs font-semibold text-primary">Active: {ab.name}</span>
              </div>
              {isOwner && (
                <button onClick={clearActiveBranch} className="text-[10px] text-primary underline">
                  Clear
                </button>
              )}
            </div>
          ) : null;
        })()}

        {/* Search + Add */}
        <div className="flex gap-2">
          <Input
            placeholder="Search branches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          {isOwner && (
            <Button onClick={openCreate} size="sm" className="shrink-0">
              <Plus size={15} className="mr-1" /> Add
            </Button>
          )}
        </div>

        {/* Branch cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <GitBranch size={44} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm font-medium">No branches yet</p>
            <p className="text-xs mt-1 max-w-[220px] mx-auto">
              Branches created in the web backend will appear here after sync.
            </p>
            {isOwner && (
              <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                <Plus size={14} className="mr-1" /> Create Branch
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((branch) => (
              <div
                key={branch.id}
                className={`rounded-xl border bg-card p-4 transition-all ${
                  activeBranchId === branch.id
                    ? "border-primary ring-1 ring-primary/20 bg-primary/5"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <GitBranch size={15} className="text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{branch.name}</span>
                      <Badge
                        variant={branch.status === "Active" ? "default" : "secondary"}
                        className="text-[9px] px-1.5 h-4"
                      >
                        {branch.status}
                      </Badge>
                      {activeBranchId === branch.id && (
                        <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-primary text-primary">
                          Current
                        </Badge>
                      )}
                    </div>

                    {branch.address && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin size={10} className="shrink-0" />
                        <span className="truncate">{branch.address}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        <Phone size={10} className="shrink-0" />
                        <span>{branch.phone}</span>
                      </div>
                    )}
                    {branch.email && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        <Mail size={10} className="shrink-0" />
                        <span className="truncate">{branch.email}</span>
                      </div>
                    )}
                  </div>

                  {isOwner && (
                    <div className="flex flex-col gap-1 shrink-0">
                      {branch.status === "Active" && activeBranchId !== branch.id && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 border-primary/40 text-primary"
                          title="Set as active branch"
                          onClick={() => setActiveBranch(branch)}
                        >
                          <CheckCircle2 size={13} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-blue-600"
                        title="Manage users for this branch"
                        onClick={() => navigate(`/user-roles?branch_id=${branch.id}`)}
                      >
                        <Users size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(branch)}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(branch.id)}
                        disabled={deleting === branch.id}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg mx-auto max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editing ? "Edit Branch" : "Add New Branch"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Branch Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Branch Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Accra Main Branch"
                value={form.name || ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Address
              </label>
              <Input
                placeholder="Street, City, Region"
                value={form.address || ""}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>

            {/* Phone + Email row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Phone / Mobile
                </label>
                <Input
                  placeholder="e.g. 0244000000"
                  value={form.phone || ""}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="branch@company.com"
                  value={form.email || ""}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            {/* Opening Balance + Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Opening Balance
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.branchOpeningBalance ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, branchOpeningBalance: e.target.value ? Number(e.target.value) : undefined }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </label>
                <Select
                  value={form.status || "Active"}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as Branch["status"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Description / Notes
              </label>
              <Textarea
                placeholder="Optional notes about this branch…"
                rows={3}
                value={form.description || ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editing ? "Update Branch" : "Create Branch"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Branches;
