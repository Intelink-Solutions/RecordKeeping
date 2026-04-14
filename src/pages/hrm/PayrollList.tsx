import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, Payroll } from "@/lib/store";

const PayrollList = () => {
  const employees = store.getEmployees();

  return (
    <CrudListPage<Payroll>
      title="Payroll List"
      items={store.getPayroll()}
      onSave={(items) => store.savePayroll(items)}
      columns={[
        { key: "employeeName", label: "Employee" },
        { key: "month", label: "Month" },
        { key: "basicSalary", label: "Basic" },
        { key: "bonus", label: "Bonus" },
        { key: "deduction", label: "Deduction" },
        { key: "netSalary", label: "Net Salary" },
        { key: "status", label: "Status" },
      ]}
      renderForm={(item, onChange) => (
        <>
          <Select value={item.employeeId || ""} onValueChange={(v) => {
            const emp = employees.find(e => e.id === v);
            onChange("employeeId", v);
            onChange("employeeName", emp?.name || "");
            onChange("basicSalary", emp?.salary || 0);
            onChange("netSalary", (emp?.salary || 0) + (item.bonus || 0) - (item.deduction || 0));
          }}>
            <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
            <SelectContent>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.employeeId})</SelectItem>)}
            </SelectContent>
          </Select>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Month</label>
            <Input type="month" value={item.month || ""} onChange={(e) => onChange("month", e.target.value)} />
          </div>
          <Input type="number" placeholder="Basic Salary" value={item.basicSalary || ""} onChange={(e) => {
            const val = Number(e.target.value);
            onChange("basicSalary", val);
            onChange("netSalary", val + (item.bonus || 0) - (item.deduction || 0));
          }} />
          <Input type="number" placeholder="Bonus" value={item.bonus || ""} onChange={(e) => {
            const val = Number(e.target.value);
            onChange("bonus", val);
            onChange("netSalary", (item.basicSalary || 0) + val - (item.deduction || 0));
          }} />
          <Input type="number" placeholder="Deduction" value={item.deduction || ""} onChange={(e) => {
            const val = Number(e.target.value);
            onChange("deduction", val);
            onChange("netSalary", (item.basicSalary || 0) + (item.bonus || 0) - val);
          }} />
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Net Salary</p>
            <p className="font-bold text-lg text-primary">$ {(item.netSalary || 0).toFixed(2)}</p>
          </div>
          <Select value={item.status || "Unpaid"} onValueChange={(v) => onChange("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
      createDefaults={() => ({ employeeId: "", employeeName: "", month: "", basicSalary: 0, bonus: 0, deduction: 0, netSalary: 0, status: "Unpaid" as const })}
      searchKey="employeeName"
      displayName="Payroll"
    />
  );
};
export default PayrollList;
