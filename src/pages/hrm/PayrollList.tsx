import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import CrudListPage from "@/components/CrudListPage";
import { store, Payroll, Employee } from "@/lib/store";
import { useHrmLiveList } from "@/hooks/use-hrm-live-list";
import { apiCreateHrmResourceForm, apiUpdateHrmResourceForm, apiDeleteHrmResource } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const CURRENT_YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString().split("T")[0];
const CURRENT_MONTH = MONTHS[new Date().getMonth()];

const PayrollList = () => {
  const { items, saveItems } = useHrmLiveList<Payroll>({
    resource: "payrolls",
    localGet: () => store.getPayroll(),
    localSave: (next) => store.savePayroll(next),
  });

  const { items: employees } = useHrmLiveList<Employee>({
    resource: "employees",
    localGet: () => store.getEmployees(),
    localSave: (next) => store.saveEmployees(next),
  });

  return (
    <CrudListPage<Payroll>
      title="Payroll List"
      items={items}
      onSave={saveItems}
      apiResource="payrolls"
      onApiCreate={(data) => apiCreateHrmResourceForm<Payroll>("payrolls", data as Record<string, unknown>)}
      onApiUpdate={(id, data) => apiUpdateHrmResourceForm<Payroll>("payrolls", id, data as Record<string, unknown>)}
      onApiDelete={(id) => apiDeleteHrmResource("payrolls", id)}
      columns={[
        { key: "employeeName", label: "Employee" },
        { key: "month", label: "Month" },
        { key: "paymentYear", label: "Year" },
        { key: "amount", label: "Amount" },
        { key: "paymentType", label: "Type" },
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
            <label className="text-xs text-muted-foreground mb-1 block">Payment Year</label>
            <Input
              type="number"
              placeholder="Year (e.g. 2026)"
              value={item.paymentYear || CURRENT_YEAR}
              onChange={(e) => onChange("paymentYear", Number(e.target.value))}
            />
          </div>

          <Select value={item.month || CURRENT_MONTH} onValueChange={(v) => onChange("month", v)}>
            <SelectTrigger><SelectValue placeholder="Select Month" /></SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <Input type="date" value={item.date || TODAY} onChange={(e) => onChange("date", e.target.value)} />
          </div>

          <div className="relative">
            <Input
              type="number"
              placeholder="Amount *"
              value={item.amount || ""}
              onChange={(e) => onChange("amount", Number(e.target.value))}
            />
            {(item.amount || 0) > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {formatCurrency(item.amount || 0)}
              </span>
            )}
          </div>

          <Select value={item.paymentType || ""} onValueChange={(v) => onChange("paymentType", v)}>
            <SelectTrigger><SelectValue placeholder="Select Payment Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Bank">Bank Transfer</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
              <SelectItem value="Mobile">Mobile Money</SelectItem>
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Note (optional)"
            value={item.note || ""}
            onChange={(e) => onChange("note", e.target.value)}
            rows={2}
          />
        </>
      )}
      createDefaults={() => ({
        employeeId: "",
        employeeName: "",
        paymentYear: CURRENT_YEAR,
        month: CURRENT_MONTH,
        date: TODAY,
        amount: 0,
        paymentType: "",
        note: "",
      })}
      validate={(item) => {
        if (!item.employeeId) return "Please select an employee.";
        if (!item.amount || item.amount <= 0) return "Amount must be greater than 0.";
        if (!item.paymentType) return "Please select a payment type.";
        if (!item.date) return "Payment date is required.";
        return null;
      }}
      searchKey="employeeName"
      displayName="Payroll"
    />
  );
};
export default PayrollList;
