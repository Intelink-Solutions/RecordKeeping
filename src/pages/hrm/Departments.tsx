import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, Department } from "@/lib/store";
import { useHrmLiveList } from "@/hooks/use-hrm-live-list";
import { apiCreateHrmResourceForm, apiUpdateHrmResourceForm, apiDeleteHrmResource } from "@/lib/api";

const Departments = () => {
  const { items, saveItems } = useHrmLiveList<Department>({
    resource: "departments",
    localGet: () => store.getDepartments(),
    localSave: (next) => store.saveDepartments(next),
  });

  return (
  <CrudListPage<Department>
    title="Department List"
    items={items}
    onSave={saveItems}
    apiResource="departments"
    onApiCreate={(data) => apiCreateHrmResourceForm<Department>("departments", data as Record<string, unknown>)}
    onApiUpdate={(id, data) => apiUpdateHrmResourceForm<Department>("departments", id, data as Record<string, unknown>)}
    onApiDelete={(id) => apiDeleteHrmResource("departments", id)}
    columns={[
      { key: "name", label: "Name" },
      { key: "description", label: "Description" },
      { key: "status", label: "Status" },
    ]}
    renderForm={(item, onChange) => (
      <>
        <Input placeholder="Department Name *" value={item.name || ""} onChange={(e) => onChange("name", e.target.value)} />
        <Input placeholder="Description" value={item.description || ""} onChange={(e) => onChange("description", e.target.value)} />
        <Select value={item.status || "Active"} onValueChange={(v) => onChange("status", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </>
    )}
    createDefaults={() => ({ name: "", description: "", status: "Active" as const })}
    validate={(item) => {
      if (!item.name?.trim()) return "Department name is required.";
      return null;
    }}
    searchKey="name"
    displayName="Department"
  />
  );
};
export default Departments;
