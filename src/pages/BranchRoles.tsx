import { Navigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import CrudListPage from "@/components/CrudListPage";
import { store, BranchRole } from "@/lib/store";
import { useApiList, invalidateApiListCache } from "@/hooks/use-api-list";
import { apiCreateBranchRole, apiUpdateBranchRole, apiDeleteBranchRole, BRANCH_ROLE_API_PATHS } from "@/lib/api";
import { useAppContext } from "@/hooks/use-app-context";

// BranchRole.permissions is still a plain comma-separated string on the
// backend — these tags are joined/split from that string client-side so the
// UI gets a switch-based multi-select without needing a schema change.
const PERMISSION_TAGS = [
  "Sales", "Purchases", "Products", "Stock", "Customers",
  "Suppliers", "Due List", "Reports", "Transfers", "Warehouses", "Branches",
];

// Display-only relabel — the stored tag stays "Due List" so existing branch
// roles' saved permission strings keep matching.
const TAG_LABELS: Record<string, string> = { "Due List": "Debt List" };

function parsePermissions(value?: string): Set<string> {
  return new Set((value || "").split(",").map((s) => s.trim()).filter(Boolean));
}

// BranchRoleController's `status` column is a real boolean — convert only at
// the API boundary so local storage/display keeps the "Active"/"Inactive"
// string used everywhere else in the UI.
function toBranchRoleApiPayload(data: Record<string, unknown>): Record<string, unknown> {
  return { ...data, status: data.status === "Inactive" ? false : true };
}

const BranchRoles = () => {
  const { isOwner } = useAppContext();
  const { items, saveItems } = useApiList<BranchRole>({
    cacheKey: "branch-roles",
    paths: BRANCH_ROLE_API_PATHS,
    localGet: () => store.getBranchRoles(),
    localSave: (next) => store.saveBranchRoles(next),
  });

  // Role/permission management is a shop-owner-only action — staff should
  // never see or edit this screen, matching UserRoles.tsx's own guard.
  if (!isOwner) return <Navigate to="/home" replace />;

  return (
    <CrudListPage<BranchRole>
      title="Branch Roles"
      items={items}
      onSave={saveItems}
      onApiCreate={async (data) => {
        const result = await apiCreateBranchRole<BranchRole>(toBranchRoleApiPayload(data as Record<string, unknown>));
        invalidateApiListCache("branch-roles");
        return result;
      }}
      onApiUpdate={async (id, data) => {
        const result = await apiUpdateBranchRole<BranchRole>(id, toBranchRoleApiPayload(data as Record<string, unknown>));
        invalidateApiListCache("branch-roles");
        return result;
      }}
      onApiDelete={async (id) => {
        await apiDeleteBranchRole(id);
        invalidateApiListCache("branch-roles");
      }}
      columns={[
        { key: "name", label: "Role Name" },
        { key: "description", label: "Description" },
        { key: "status", label: "Status" },
      ]}
      renderForm={(item, onChange) => (
        <>
          <Input
            placeholder="Role Name *"
            value={item.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
          />
          <Textarea
            placeholder="Description"
            value={item.description || ""}
            onChange={(e) => onChange("description", e.target.value)}
            rows={3}
          />
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Permissions</Label>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSION_TAGS.map((tag) => {
                const selected = parsePermissions(item.permissions);
                const checked = selected.has(tag);
                return (
                  <label
                    key={tag}
                    className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted cursor-pointer"
                  >
                    <Switch
                      checked={checked}
                      onCheckedChange={(next) => {
                        const updated = new Set(selected);
                        if (next) updated.add(tag); else updated.delete(tag);
                        onChange("permissions", Array.from(updated).join(", "));
                      }}
                    />
                    <span className="text-xs font-medium">{TAG_LABELS[tag] || tag}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <Select value={item.status || "Active"} onValueChange={(v) => onChange("status", v)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
      createDefaults={() => ({ name: "", description: "", permissions: "", status: "Active" as const })}
      validate={(item) => (!item.name?.trim() ? "Role name is required." : null)}
      searchKey="name"
      displayName="Branch Role"
    />
  );
};

export default BranchRoles;
