import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, Designation } from "@/lib/store";

const Designations = () => (
  <CrudListPage<Designation>
    title="Designation List"
    items={store.getDesignations()}
    onSave={(items) => store.saveDesignations(items)}
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
    searchKey="name"
    displayName="Designation"
  />
);
export default Designations;
