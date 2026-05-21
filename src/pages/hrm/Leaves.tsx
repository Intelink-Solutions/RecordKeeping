import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, Leave, Employee, LeaveType, Department } from "@/lib/store";
import { useHrmLiveList } from "@/hooks/use-hrm-live-list";
import { apiCreateHrmResourceForm, apiUpdateHrmResourceForm, apiDeleteHrmResource } from "@/lib/api";

const Leaves = () => {
  const { items, saveItems } = useHrmLiveList<Leave>({
    resource: "leaves",
    localGet: () => store.getLeaves(),
    localSave: (next) => store.saveLeaves(next),
  });

  const { items: employees } = useHrmLiveList<Employee>({
    resource: "employees",
    localGet: () => store.getEmployees(),
    localSave: (next) => store.saveEmployees(next),
  });

  const { items: leaveTypes } = useHrmLiveList<LeaveType>({
    resource: "leave-types",
    localGet: () => store.getLeaveTypes(),
    localSave: (next) => store.saveLeaveTypes(next),
  });

  const { items: departments } = useHrmLiveList<Department>({
    resource: "departments",
    localGet: () => store.getDepartments(),
    localSave: (next) => store.saveDepartments(next),
  });

  const getDepartmentName = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return "";
    const dept = departments.find(d => d.id === emp.departmentId);
    return dept?.name || "";
  };

  return (
    <CrudListPage<Leave>
      title="Leave List"
      items={items}
      onSave={saveItems}
      apiResource="leaves"
      onApiCreate={(data) => apiCreateHrmResourceForm<Leave>("leaves", data as Record<string, unknown>)}
      onApiUpdate={(id, data) => apiUpdateHrmResourceForm<Leave>("leaves", id, data as Record<string, unknown>)}
      onApiDelete={(id) => apiDeleteHrmResource("leaves", id)}
      columns={[
        { key: "employeeName", label: "Employee" },
        { key: "departmentName", label: "Department" },
        { key: "leaveTypeName", label: "Leave Type" },
        { key: "startDate", label: "Start" },
        { key: "endDate", label: "End" },
        { key: "status", label: "Status" },
      ]}
      renderForm={(item, onChange) => (
        <>
          <Select value={item.employeeId || ""} onValueChange={(v) => {
            const emp = employees.find(e => e.id === v);
            onChange("employeeId", v);
            onChange("employeeName", emp?.name || "");
            onChange("departmentName", getDepartmentName(v));
          }}>
            <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
            <SelectContent>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Department"
            value={item.departmentName || getDepartmentName(item.employeeId || "")}
            readOnly
            className="bg-muted"
          />
          <Select value={item.leaveTypeId || ""} onValueChange={(v) => {
            const lt = leaveTypes.find(l => l.id === v);
            onChange("leaveTypeId", v);
            onChange("leaveTypeName", lt?.name || "");
          }}>
            <SelectTrigger><SelectValue placeholder="Select Leave Type" /></SelectTrigger>
            <SelectContent>
              {leaveTypes.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
              <Input type="date" value={item.startDate || ""} onChange={(e) => onChange("startDate", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
              <Input type="date" value={item.endDate || ""} onChange={(e) => onChange("endDate", e.target.value)} />
            </div>
          </div>
          <Textarea placeholder="Reason" value={item.reason || ""} onChange={(e) => onChange("reason", e.target.value)} />
          <Select value={item.status || "Pending"} onValueChange={(v) => onChange("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
      createDefaults={() => ({ employeeId: "", employeeName: "", departmentName: "", leaveTypeId: "", leaveTypeName: "", startDate: "", endDate: "", reason: "", status: "Pending" as const })}
      validate={(item) => {
        if (!item.employeeId) return "Please select an employee.";
        if (!item.leaveTypeId) return "Please select a leave type.";
        if (!item.startDate) return "Start date is required.";
        if (!item.endDate) return "End date is required.";
        if (item.startDate && item.endDate && item.endDate < item.startDate) return "End date must be on or after start date.";
        return null;
      }}
      searchKey="employeeName"
      displayName="Leave"
    />
  );
};
export default Leaves;
