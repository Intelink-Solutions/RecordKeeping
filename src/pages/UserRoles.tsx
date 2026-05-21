import { useCallback, useEffect, useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Eye, Search, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/use-app-context";
import { tokenStorage } from "@/lib/api";
import { store } from "@/lib/store";

interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: string;
  visibility: Record<string, boolean>;
}

const PERMISSION_LABELS: { key: string; label: string }[] = [
  { key: "profileEditPermission", label: "Profile Edit" },
  { key: "salePermission", label: "Sales" },
  { key: "salesListPermission", label: "Sales List" },
  { key: "purchasePermission", label: "Purchase" },
  { key: "purchaseListPermission", label: "Purchase List" },
  { key: "productPermission", label: "Products" },
  { key: "stockPermission", label: "Stock" },
  { key: "partiesPermission", label: "Parties" },
  { key: "addIncomePermission", label: "Income" },
  { key: "addExpensePermission", label: "Expense" },
  { key: "dueListPermission", label: "Due List" },
  { key: "lossProfitPermission", label: "Loss Profit" },
  { key: "reportsPermission", label: "Reports" },
  { key: "departmentsPermission", label: "Departments" },
  { key: "designationsPermission", label: "Designations" },
  { key: "shiftsPermission", label: "Shifts" },
  { key: "employeesPermission", label: "Employees" },
  { key: "leaveTypesPermission", label: "Leave Types" },
  { key: "leavesPermission", label: "Leaves" },
  { key: "holidaysPermission", label: "Holidays" },
  { key: "attendancePermission", label: "Attendance" },
  { key: "payrollPermission", label: "Payroll" },
  { key: "attendanceReportPermission", label: "Attendance Report" },
  { key: "payrollReportPermission", label: "Payroll Report" },
  { key: "leaveReportPermission", label: "Leave Report" },
];

const defaultVisibility = (): Record<string, boolean> => {
  const v: Record<string, boolean> = {};
  PERMISSION_LABELS.forEach((p) => (v[p.key] = true));
  return v;
};

const UserRoles = () => {
  const { isOwner } = useAppContext();
  const { toast } = useToast();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState<StaffUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [editUser, setEditUser] = useState<{
    id?: number;
    name: string;
    email: string;
    password: string;
    visibility: Record<string, boolean>;
  } | null>(null);

  const baseUrl = useMemo(() => 
    store.getBusinessProfile().isOnline ? "" : "", 
  []);

  const headers = useCallback((): HeadersInit => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenStorage.get()}`,
  }), []);

  const normalizeVisibility = useCallback((v: unknown): Record<string, boolean> => {
    if (!v || typeof v !== "object") return defaultVisibility();
    const raw = v as Record<string, unknown>;
    const result: Record<string, boolean> = {};
    PERMISSION_LABELS.forEach((p) => {
      const val = raw[p.key];
      result[p.key] = val === true || val === "1" || val === 1 || val === "true";
    });
    return result;
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/v1/users`, { headers: headers() });
      const json = await res.json();
      const data = Array.isArray(json.data) ? json.data : [];
      setUsers(
        data.map((u: Record<string, unknown>) => ({
          id: u.id as number,
          name: (u.name as string) || "",
          email: (u.email as string) || "",
          role: (u.role as string) || "staff",
          visibility: normalizeVisibility(u.visibility),
        }))
      );
    } catch {
      toast({ title: "Failed to load staff users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [baseUrl, headers, normalizeVisibility, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Only shop-owner can access this page
  if (!isOwner) return <Navigate to="/home" replace />;

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditUser({
      name: "",
      email: "",
      password: "",
      visibility: defaultVisibility(),
    });
    setShowForm(true);
  };

  const openEdit = (u: StaffUser) => {
    setEditUser({
      id: u.id,
      name: u.name,
      email: u.email,
      password: "",
      visibility: { ...u.visibility },
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!editUser || saving) return;
    if (!editUser.name.trim() || !editUser.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    if (!editUser.id && !editUser.password) {
      toast({ title: "Password is required for new users", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: editUser.name,
        email: editUser.email,
        visibility: editUser.visibility,
      };
      if (editUser.password) body.password = editUser.password;

      const url = editUser.id
        ? `${baseUrl}/api/v1/users/${editUser.id}`
        : `${baseUrl}/api/v1/users`;
      const method = editUser.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: headers(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as Record<string, string>).message || "Save failed");
      }

      toast({ title: `Staff user ${editUser.id ? "updated" : "created"}!` });
      setShowForm(false);
      setEditUser(null);
      fetchUsers();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${baseUrl}/api/v1/users/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast({ title: "Staff user deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const toggleAll = (checked: boolean) => {
    if (!editUser) return;
    const v: Record<string, boolean> = {};
    PERMISSION_LABELS.forEach((p) => (v[p.key] = checked));
    setEditUser({ ...editUser, visibility: v });
  };

  const allChecked = editUser
    ? PERMISSION_LABELS.every((p) => editUser.visibility[p.key])
    : false;

  const permissionCount = (v: Record<string, boolean>) =>
    PERMISSION_LABELS.filter((p) => v[p.key]).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title="User Roles"
        rightAction={
          <button
            onClick={openAdd}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
          >
            <Plus size={14} /> Add Staff
          </button>
        }
      />

      <div className="px-4 py-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading staff users...</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="bg-card rounded-xl p-4 shadow-sm border border-border cursor-pointer active:bg-accent/50 transition-colors"
                onClick={() => setShowView(u)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {permissionCount(u.visibility)}/{PERMISSION_LABELS.length} permissions
                    </p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(u)} className="p-2 hover:bg-muted rounded-lg">
                      <Edit2 size={14} className="text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="p-2 hover:bg-muted rounded-lg">
                      <Trash2 size={14} className="text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No staff users found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editUser?.id ? "Edit" : "Add"} Staff User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div>
                <Label>User Title</Label>
                <Input
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <Label>{editUser.id ? "Update Password (leave blank to keep)" : "Password"}</Label>
                <Input
                  type="password"
                  value={editUser.password}
                  onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>

              {/* Permissions */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold">Permissions</Label>
                  <div className="flex items-center gap-2">
                    <Switch checked={allChecked} onCheckedChange={toggleAll} />
                    <span className="text-xs text-muted-foreground">Select All</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSION_LABELS.map((p) => (
                    <label
                      key={p.key}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    >
                      <Switch
                        checked={editUser.visibility[p.key] ?? false}
                        onCheckedChange={(checked) =>
                          setEditUser({
                            ...editUser,
                            visibility: { ...editUser.visibility, [p.key]: checked },
                          })
                        }
                      />
                      <span className="text-xs font-medium">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!showView} onOpenChange={() => setShowView(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
          </DialogHeader>
          {showView && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{showView.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{showView.email}</span>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-semibold mb-2">Permissions</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PERMISSION_LABELS.map((p) => (
                    <div key={p.key} className="flex items-center gap-2 text-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          showView.visibility[p.key] ? "bg-green-500" : "bg-red-400"
                        }`}
                      />
                      <span className={showView.visibility[p.key] ? "" : "text-muted-foreground"}>
                        {p.label}
                      </span>
                    </div>
                  ))}
                </div>
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