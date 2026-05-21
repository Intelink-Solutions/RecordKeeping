import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, Attendance, Employee } from "@/lib/store";
import { useHrmLiveList } from "@/hooks/use-hrm-live-list";
import { apiCreateHrmResourceForm, apiUpdateHrmResourceForm, apiDeleteHrmResource } from "@/lib/api";

const AttendanceList = () => {
  const { items, saveItems } = useHrmLiveList<Attendance>({
    resource: "attendances",
    localGet: () => store.getAttendance(),
    localSave: (next) => store.saveAttendance(next),
  });

  const { items: employees } = useHrmLiveList<Employee>({
    resource: "employees",
    localGet: () => store.getEmployees(),
    localSave: (next) => store.saveEmployees(next),
  });

  return (
    <CrudListPage<Attendance>
      title="Attendance List"
      items={items}
      onSave={saveItems}
      apiResource="attendances"
      onApiCreate={(data) => apiCreateHrmResourceForm<Attendance>("attendances", data as Record<string, unknown>)}
      onApiUpdate={(id, data) => apiUpdateHrmResourceForm<Attendance>("attendances", id, data as Record<string, unknown>)}
      onApiDelete={(id) => apiDeleteHrmResource("attendances", id)}
      columns={[
        { key: "employeeName", label: "Employee" },
        { key: "date", label: "Date" },
        { key: "checkIn", label: "Check In" },
        { key: "checkOut", label: "Check Out" },
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
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <Input type="date" value={item.date || ""} onChange={(e) => onChange("date", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Check In</label>
              <Input type="time" value={item.checkIn || ""} onChange={(e) => onChange("checkIn", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Check Out</label>
              <Input type="time" value={item.checkOut || ""} onChange={(e) => onChange("checkOut", e.target.value)} />
            </div>
          </div>
          <Select value={item.status || "Present"} onValueChange={(v) => onChange("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Present">Present</SelectItem>
              <SelectItem value="Absent">Absent</SelectItem>
              <SelectItem value="Late">Late</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
      createDefaults={() => ({ employeeId: "", employeeName: "", date: new Date().toISOString().split("T")[0], checkIn: "", checkOut: "", status: "Present" as const })}
      validate={(item) => {
        if (!item.employeeId) return "Please select an employee.";
        if (!item.date) return "Date is required.";
        if (!item.checkIn) return "Check-in time is required.";
        return null;
      }}
      searchKey="employeeName"
      displayName="Attendance"
    />
  );
};
export default AttendanceList;
