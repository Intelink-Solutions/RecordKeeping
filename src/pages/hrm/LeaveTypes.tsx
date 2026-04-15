import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, LeaveType } from "@/lib/store";
import { useHrmLiveList } from "@/hooks/use-hrm-live-list";

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
    searchKey="name"
    displayName="Leave Type"
  />
  );
};
export default LeaveTypes;
