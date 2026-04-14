import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, Employee } from "@/lib/store";

const Employees = () => {
  const departments = store.getDepartments();
  const designations = store.getDesignations();
  const shifts = store.getShifts();

  return (
    <CrudListPage<Employee>
      title="Employee List"
      items={store.getEmployees()}
      onSave={(items) => store.saveEmployees(items)}
      columns={[
        { key: "employeeId", label: "ID" },
        { key: "name", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "departmentId", label: "Department" },
        { key: "designationId", label: "Designation" },
        { key: "joinDate", label: "Join Date" },
        { key: "salary", label: "Salary" },
        { key: "status", label: "Status" },
      ]}
      renderForm={(item, onChange) => (
        <>
          <Input placeholder="Employee ID *" value={item.employeeId || ""} onChange={(e) => onChange("employeeId", e.target.value)} />
          <Input placeholder="Full Name *" value={item.name || ""} onChange={(e) => onChange("name", e.target.value)} />
          <Input placeholder="Phone" value={item.phone || ""} onChange={(e) => onChange("phone", e.target.value)} />
          <Input placeholder="Email" value={item.email || ""} onChange={(e) => onChange("email", e.target.value)} />
          <Select value={item.departmentId || ""} onValueChange={(v) => onChange("departmentId", v)}>
            <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
            <SelectContent>
              {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={item.designationId || ""} onValueChange={(v) => onChange("designationId", v)}>
            <SelectTrigger><SelectValue placeholder="Select Designation" /></SelectTrigger>
            <SelectContent>
              {designations.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={item.shiftId || ""} onValueChange={(v) => onChange("shiftId", v)}>
            <SelectTrigger><SelectValue placeholder="Select Shift" /></SelectTrigger>
            <SelectContent>
              {shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Join Date</label>
            <Input type="date" value={item.joinDate || ""} onChange={(e) => onChange("joinDate", e.target.value)} />
          </div>
          <Input type="number" placeholder="Salary *" value={item.salary || ""} onChange={(e) => onChange("salary", Number(e.target.value))} />
          <Select value={item.status || "Active"} onValueChange={(v) => onChange("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
      createDefaults={() => ({ employeeId: `EMP-${Date.now().toString().slice(-4)}`, name: "", departmentId: "", designationId: "", shiftId: "", joinDate: new Date().toISOString().split("T")[0], salary: 0, status: "Active" as const })}
      searchKey="name"
      displayName="Employee"
    />
  );
};
export default Employees;
