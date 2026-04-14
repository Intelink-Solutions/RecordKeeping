import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, Leave } from "@/lib/store";

const Leaves = () => {
  const employees = store.getEmployees();
  const leaveTypes = store.getLeaveTypes();

  return (
    <CrudListPage<Leave>
      title="Leave List"
      items={store.getLeaves()}
      onSave={(items) => store.saveLeaves(items)}
      columns={[
        { key: "employeeName", label: "Employee" },
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
          }}>
            <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
            <SelectContent>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.employeeId})</SelectItem>)}
            </SelectContent>
          </Select>
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
      createDefaults={() => ({ employeeId: "", employeeName: "", leaveTypeId: "", leaveTypeName: "", startDate: "", endDate: "", reason: "", status: "Pending" as const })}
      searchKey="employeeName"
      displayName="Leave"
    />
  );
};
export default Leaves;
