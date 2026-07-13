import { useCallback, useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Search, Shield, Users, GitBranch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/use-app-context";
import { apiGetUsers, apiCreateUser, apiUpdateUser, apiDeleteUser } from "@/lib/api";
import { store } from "@/lib/store";
import { isValidEmail } from "@/lib/validators";

// ── Permission groups matching the web form exactly ───────────────────────────
interface PermGroup {
  label: string;
  perms: { key: string; label: string }[];
}

const PERMISSION_GROUPS: PermGroup[] = [
  {
    label: "Sales",
    perms: [
      { key: "salePermission",      label: "New Sale" },
      { key: "salesListPermission", label: "Sale List" },
    ],
  },
  {
    label: "Purchases",
    perms: [
      { key: "purchasePermission",     label: "New Purchase" },
      { key: "purchaseListPermission", label: "Purchase List" },
    ],
  },
  {
    label: "Inventory",
    perms: [
      { key: "productPermission",    label: "Inventory" },
      { key: "stockPermission",      label: "Stock" },
      { key: "transfersPermission",  label: "Transfers" },
    ],
  },
  {
    label: "Finance",
    perms: [
      { key: "financePermission",    label: "Finance" },
      { key: "dueListPermission",    label: "Debt List" },
      { key: "partiesPermission",    label: "Parties" },
    ],
  },
  {
    label: "Reports",
    perms: [
      { key: "reportsPermission",    label: "Reports" },
      { key: "lossProfitPermission", label: "Loss & Profit" },
    ],
  },
  {
    label: "HRM — Staff",
    perms: [
      { key: "employeesPermission",   label: "Employees" },
      { key: "departmentsPermission", label: "Departments" },
      { key: "designationsPermission",label: "Designations" },
      { key: "shiftsPermission",      label: "Shifts" },
    ],
  },
  {
    label: "HRM — Leave & Time",
    perms: [
      { key: "leaveTypesPermission", label: "Leave Types" },
      { key: "leavesPermission",     label: "Leaves" },
      { key: "holidaysPermission",   label: "Holidays" },
      { key: "attendancePermission", label: "Attendance" },
    ],
  },
  {
    label: "HRM — Payroll & Reports",
    perms: [
      { key: "payrollPermission",           label: "Payroll" },
      { key: "attendanceReportPermission",  label: "Attendance Reports" },
      { key: "payrollReportPermission",     label: "Payroll Reports" },
      { key: "leaveReportPermission",       label: "Leave Reports" },
    ],
  },
  {
    label: "Branches & Warehouses",
    perms: [
      { key: "branchesPermission",    label: "Branches" },
      { key: "warehousesPermission",  label: "Warehouses" },
      { key: "branchRolesPermission", label: "Branch Roles" },
    ],
  },
  {
    label: "Account",
    perms: [
      { key: "profileEditPermission", label: "Profile Edit" },
    ],
  },
];

// Flat list for permission counting / normalization
const ALL_PERMS = PERMISSION_GROUPS.flatMap((g) => g.perms);

interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: string;
  branchId?: string;
  visibility: Record<string, boolean>;
}

function defaultVisibility(): Record<string, boolean> {
  const v: Record<string, boolean> = {};
  ALL_PERMS.forEach((p) => (v[p.key] = true));
  return v;
}

function normalizeVisibility(v: unknown): Record<string, boolean> {
  if (!v || typeof v !== "object") return defaultVisibility();
  const raw = v as Record<string, unknown>;
  const result: Record<string, boolean> = {};
  ALL_PERMS.forEach((p) => {
    const val = raw[p.key];
    result[p.key] = val === true || val === "1" || val === 1 || val === "true";
  });
  return result;
}

function permCount(vis: Record<string, boolean>): number {
  return ALL_PERMS.filter((p) => vis[p.key]).length;
}

// ── Component ─────────────────────────────────────────────────────────────────
const UserRoles = () => {
  const { isOwner } = useAppContext();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const preselectedBranchId = searchParams.get("branch_id") ?? "";

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<{
    id?: number;
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    branchId: string;
    visibility: Record<string, boolean>;
  } | null>(null);

  const branches = store.getBranches();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiGetUsers();
      // Extract array from various response shapes: [], {data:[]}, {data:{data:[]}}
      let raw: Record<string, unknown>[] = [];
      if (Array.isArray(json)) {
        raw = json as Record<string, unknown>[];
      } else if (json && typeof json === "object") {
        const obj = json as Record<string, unknown>;
        if (Array.isArray(obj.data)) {
          raw = obj.data as Record<string, unknown>[];
        } else if (obj.data && typeof obj.data === "object") {
          const nested = obj.data as Record<string, unknown>;
          if (Array.isArray(nested.data)) raw = nested.data as Record<string, unknown>[];
        }
        for (const key of ["users", "staff", "items", "results"]) {
          if (raw.length === 0 && Array.isArray(obj[key])) {
            raw = obj[key] as Record<string, unknown>[];
          }
        }
      }
      setUsers(
        raw.map((u) => ({
          id: Number(u.id),
          name: String(u.name || ""),
          email: String(u.email || ""),
          role: String(u.role || "staff"),
          branchId: u.branch_id != null ? String(u.branch_id) : undefined,
          visibility: normalizeVisibility(u.visibility),
        }))
      );
    } catch {
      toast({ title: "Failed to load staff users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  if (!isOwner) return <Navigate to="/home" replace />;

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      branchId: preselectedBranchId || store.getActiveBranchId() || "",
      visibility: defaultVisibility(),
    });
    setShowForm(true);
  }

  function openEdit(u: StaffUser) {
    setForm({
      id: u.id,
      name: u.name,
      email: u.email,
      password: "",
      confirmPassword: "",
      branchId: u.branchId ?? "",
      visibility: { ...u.visibility },
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form || saving) return;
    if (!form.name.trim()) {
      toast({ title: "Full name is required", variant: "destructive" }); return;
    }
    if (!form.email.trim()) {
      toast({ title: "Email address is required", variant: "destructive" }); return;
    }
    if (!isValidEmail(form.email)) {
      toast({ title: "Enter a valid email address", variant: "destructive" }); return;
    }
    if (!form.id && !form.password) {
      toast({ title: "Password is required for new users", variant: "destructive" }); return;
    }
    if (form.password && form.password !== form.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" }); return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: "staff",
        branch_id: form.branchId || undefined,
        visibility: form.visibility,
      };
      if (form.password) {
        body.password = form.password;
        body.password_confirmation = form.password;
      }

      if (form.id) {
        await apiUpdateUser(String(form.id), body);
      } else {
        await apiCreateUser(body);
      }

      toast({ title: `User ${form.id ? "updated" : "created"} successfully` });
      setShowForm(false);
      setForm(null);
      fetchUsers();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this user?")) return;
    try {
      await apiDeleteUser(String(id));
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast({ title: "User deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  function toggleAll(checked: boolean) {
    if (!form) return;
    const v: Record<string, boolean> = {};
    ALL_PERMS.forEach((p) => (v[p.key] = checked));
    setForm({ ...form, visibility: v });
  }

  function toggleGroup(group: PermGroup, checked: boolean) {
    if (!form) return;
    const v = { ...form.visibility };
    group.perms.forEach((p) => (v[p.key] = checked));
    setForm({ ...form, visibility: v });
  }

  const allChecked = form ? ALL_PERMS.every((p) => form.visibility[p.key]) : false;

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader
        title="User Roles"
        rightAction={
          <Button size="sm" onClick={openAdd} className="h-8 px-3 text-xs gap-1">
            <Plus size={13} /> Add User
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* User list */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <Users size={44} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm font-medium">No staff users yet</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={openAdd}>
              <Plus size={13} className="mr-1" /> Add First User
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => {
              const branch = branches.find((b) => b.id === u.branchId);
              const activePerms = ALL_PERMS.filter((p) => u.visibility[p.key]);
              const shownPerms = activePerms.slice(0, 9);
              const extraCount = activePerms.length - shownPerms.length;
              return (
                <div
                  key={u.id}
                  className="bg-card rounded-xl p-4 border border-border"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Shield size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{u.name}</p>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}>
                            <Edit2 size={13} className="text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(u.id)}>
                            <Trash2 size={13} className="text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      {branch && (
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-primary">
                          <GitBranch size={9} />
                          <span className="truncate max-w-[140px]">{branch.name}</span>
                        </div>
                      )}
                      {/* Permission tags matching the web backend display */}
                      {activePerms.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {shownPerms.map((p) => (
                            <Badge
                              key={p.key}
                              variant="secondary"
                              className="text-[9px] px-1.5 h-4 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-0"
                            >
                              {p.label}
                            </Badge>
                          ))}
                          {extraCount > 0 && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 h-4">
                              +{extraCount} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground mt-1">No permissions assigned</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setForm(null); } }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="text-base">
              {form?.id ? "Edit User" : "Add New User"}
            </DialogTitle>
          </DialogHeader>

          {form && (
            <div className="px-5 py-4 space-y-5">
              {/* Basic info */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name *</Label>
                  <Input
                    className="mt-1"
                    placeholder="Enter full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email Address *</Label>
                  <Input
                    className="mt-1"
                    type="email"
                    placeholder="Enter email address"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {form.id ? "New Password" : "Password *"}
                    </Label>
                    <Input
                      className="mt-1"
                      type="password"
                      placeholder={form.id ? "Leave blank to keep" : "Min 4 chars"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confirm Password</Label>
                    <Input
                      className="mt-1"
                      type="password"
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>

                {/* Assign to Branch */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assign to Branch</Label>
                  <Select
                    value={form.branchId || "__none__"}
                    onValueChange={(v) => setForm({ ...form, branchId: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— No branch assigned —</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.branchId && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 leading-snug">
                      User will only see data for the assigned branch.
                    </p>
                  )}
                </div>
              </div>

              {/* Permissions */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold">Permissions</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => toggleAll(!allChecked)}
                  >
                    {allChecked ? "Deselect All" : "Toggle All"}
                  </Button>
                </div>

                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((group) => {
                    const groupAllChecked = group.perms.every((p) => form.visibility[p.key]);
                    return (
                      <div key={group.label}>
                        {/* Group header with toggle-all for group */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {group.label}
                          </span>
                          <button
                            className="text-[10px] text-primary underline"
                            onClick={() => toggleGroup(group, !groupAllChecked)}
                          >
                            {groupAllChecked ? "Deselect" : "Select all"}
                          </button>
                        </div>
                        {/* Permission rows */}
                        <div className="rounded-xl border bg-muted/30 overflow-hidden divide-y divide-border/50">
                          {group.perms.map((p) => (
                            <label
                              key={p.key}
                              className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-muted/60 transition-colors"
                            >
                              <span className="text-sm text-foreground">{p.label}</span>
                              <Switch
                                checked={form.visibility[p.key] ?? false}
                                onCheckedChange={(checked) =>
                                  setForm({
                                    ...form,
                                    visibility: { ...form.visibility, [p.key]: checked },
                                  })
                                }
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Save button */}
              <div className="pt-2 pb-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowForm(false); setForm(null); }}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : form.id ? "Update User" : "Save User"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default UserRoles;
