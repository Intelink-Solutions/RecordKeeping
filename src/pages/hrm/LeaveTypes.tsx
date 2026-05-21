import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, LeaveType } from "@/lib/store";
import { useHrmLiveList } from "@/hooks/use-hrm-live-list";
import { apiCreateHrmResourceForm, apiUpdateHrmResourceForm, apiDeleteHrmResource } from "@/lib/api";

const LeaveTypes = () => {
  const { items, saveItems } = useHrmLiveList<LeaveType>({
    resource: "leave-types",
    localGet: () => store.getLeaveTypes(),
    localSave: (next) => store.saveLeaveTypes(next),
  });

  return (
  <CrudListPage<LeaveType>
    title="Leave Type List"
    items={items}
    onSave={saveItems}
    apiResource="leave-types"
    onApiCreate={(data) => apiCreateHrmResourceForm<LeaveType>("leave-types", data as Record<string, unknown>)}
    onApiUpdate={(id, data) => apiUpdateHrmResourceForm<LeaveType>("leave-types", id, data as Record<string, unknown>)}
    onApiDelete={(id) => apiDeleteHrmResource("leave-types", id)}
    columns={[
      { key: "name", label: "Name" },
      { key: "days", label: "Days" },
      { key: "status", label: "Status" },
    ]}
    renderForm={(item, onChange) => (
      <>
        <Input placeholder="Leave Type Name *" value={item.name || ""} onChange={(e) => onChange("name", e.target.value)} />
        <Input type="number" placeholder="Days Allowed *" value={item.days || ""} onChange={(e) => onChange("days", Number(e.target.value))} />
        <Select value={item.status || "Active"} onValueChange={(v) => onChange("status", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </>
    )}
    createDefaults={() => ({ name: "", days: 0, status: "Active" as const })}
    validate={(item) => {
      if (!item.name?.trim()) return "Leave type name is required.";
      if (!item.days || item.days <= 0) return "Days allowed must be greater than 0.";
      return null;
    }}
    searchKey="name"
    displayName="Leave Type"
  />
  );
};
export default LeaveTypes;
