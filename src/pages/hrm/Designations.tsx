import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, Designation } from "@/lib/store";
import { useHrmLiveList } from "@/hooks/use-hrm-live-list";
import { apiCreateHrmResourceForm, apiUpdateHrmResourceForm, apiDeleteHrmResource } from "@/lib/api";

const Designations = () => {
  const { items, saveItems } = useHrmLiveList<Designation>({
    resource: "designations",
    localGet: () => store.getDesignations(),
    localSave: (next) => store.saveDesignations(next),
  });

  return (
  <CrudListPage<Designation>
    title="Designation List"
    items={items}
    onSave={saveItems}
    apiResource="designations"
    onApiCreate={(data) => apiCreateHrmResourceForm<Designation>("designations", data as Record<string, unknown>)}
    onApiUpdate={(id, data) => apiUpdateHrmResourceForm<Designation>("designations", id, data as Record<string, unknown>)}
    onApiDelete={(id) => apiDeleteHrmResource("designations", id)}
    columns={[
      { key: "name", label: "Name" },
      { key: "description", label: "Description" },
      { key: "status", label: "Status" },
    ]}
    renderForm={(item, onChange) => (
      <>
        <Input placeholder="Designation Name *" value={item.name || ""} onChange={(e) => onChange("name", e.target.value)} />
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
      if (!item.name?.trim()) return "Designation name is required.";
      return null;
    }}
    searchKey="name"
    displayName="Designation"
  />
  );
};
export default Designations;
