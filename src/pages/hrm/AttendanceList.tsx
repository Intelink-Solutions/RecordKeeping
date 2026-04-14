import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, Attendance } from "@/lib/store";

const AttendanceList = () => {
  const employees = store.getEmployees();

  return (
    <CrudListPage<Attendance>
      title="Attendance List"
      items={store.getAttendance()}
      onSave={(items) => store.saveAttendance(items)}
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
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.employeeId})</SelectItem>)}
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
      searchKey="employeeName"
      displayName="Attendance"
    />
  );
};
export default AttendanceList;
