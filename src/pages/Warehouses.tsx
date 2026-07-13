import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, Warehouse } from "@/lib/store";
import { useApiList, invalidateApiListCache } from "@/hooks/use-api-list";
import { apiCreateWarehouse, apiUpdateWarehouse, apiDeleteWarehouse, WAREHOUSE_API_PATHS } from "@/lib/api";
import { useAppContext } from "@/hooks/use-app-context";
import { validateOptionalEmail, validateOptionalPhone } from "@/lib/validators";

// The backend's `status` column is a real boolean, but the UI (matching
// Branches/BranchRoles) represents it as "Active"/"Inactive" — convert only
// at the API boundary so local storage/display stays consistent.
function toWarehouseApiPayload(data: Record<string, unknown>): Record<string, unknown> {
  return { ...data, status: data.status === "Inactive" ? false : true };
}

const Warehouses = () => {
  const { isOwner } = useAppContext();
  const branches = store.getBranches();

  const { items, saveItems } = useApiList<Warehouse>({
    cacheKey: "warehouses",
    paths: WAREHOUSE_API_PATHS,
    localGet: () => store.getWarehouses(),
    localSave: (next) => store.saveWarehouses(next),
  });

  return (
    <CrudListPage<Warehouse>
      title="Warehouse List"
      items={items}
      onSave={saveItems}
      canManage={isOwner}
      onApiCreate={async (data) => {
        const result = await apiCreateWarehouse<Warehouse>(toWarehouseApiPayload(data as Record<string, unknown>));
        invalidateApiListCache("warehouses");
        return result;
      }}
      onApiUpdate={async (id, data) => {
        const result = await apiUpdateWarehouse<Warehouse>(id, toWarehouseApiPayload(data as Record<string, unknown>));
        invalidateApiListCache("warehouses");
        return result;
      }}
      onApiDelete={async (id) => {
        await apiDeleteWarehouse(id);
        invalidateApiListCache("warehouses");
      }}
      columns={[
        { key: "name", label: "Name" },
        { key: "branchName", label: "Branch" },
        { key: "address", label: "Address" },
        { key: "status", label: "Status" },
      ]}
      renderForm={(item, onChange) => (
        <>
          <Input
            placeholder="Warehouse Name *"
            value={item.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
          />
          {branches.length > 0 && (
            <Select
              value={item.branchId || ""}
              onValueChange={(v) => {
                onChange("branchId", v);
                const branch = branches.find((b) => b.id === v);
                onChange("branchName", branch?.name || "");
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            placeholder="Address"
            value={item.address || ""}
            onChange={(e) => onChange("address", e.target.value)}
          />
          <Input
            placeholder="Phone"
            value={item.phone || ""}
            onChange={(e) => onChange("phone", e.target.value)}
          />
          <Input
            placeholder="Email"
            value={item.email || ""}
            onChange={(e) => onChange("email", e.target.value)}
          />
          <Select value={item.status || "Active"} onValueChange={(v) => onChange("status", v)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
      createDefaults={() => ({ name: "", branchId: "", branchName: "", address: "", phone: "", email: "", status: "Active" as const })}
      validate={(item) =>
        (!item.name?.trim() ? "Warehouse name is required." : null) ??
        validateOptionalEmail(item.email) ??
        validateOptionalPhone(item.phone)
      }
      searchKey="name"
      displayName="Warehouse"
    />
  );
};

export default Warehouses;
