import { useState } from "react";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Employee } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Employees = () => {
  const { toast } = useToast();
  const departments = store.getDepartments();
  const designations = store.getDesignations();
  const shifts = store.getShifts();
  const [employees, setEmployees] = useState<Employee[]>(store.getEmployees());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState<Employee | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    employeeId: "", name: "", phone: "", email: "", departmentId: "", designationId: "", shiftId: "",
    joinDate: new Date().toISOString().split("T")[0], salary: "", status: "Active" as Employee["status"]
  });

  const resetForm = () => setForm({
    employeeId: `EMP${String(employees.length + 1).padStart(3, "0")}`, name: "", phone: "", email: "",
    departmentId: "", designationId: "", shiftId: "", joinDate: new Date().toISOString().split("T")[0], salary: "", status: "Active"
  });

  const save = () => {
    if (!form.name.trim()) return;
    const data: Employee = { id: editing?.id || Date.now().toString(), ...form, salary: Number(form.salary) || 0 };
    const updated = editing ? employees.map(e => e.id === editing.id ? data : e) : [...employees, data];
    setEmployees(updated);
    store.saveEmployees(updated);
    setShowForm(false); setEditing(null);
    toast({ title: editing ? "Updated" : "Employee added" });
  };

  const filtered = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.employeeId.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Employees" rightAction={
        <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><Plus size={16} className="text-primary-foreground" /></button>
      } />
      <div className="px-4 py-3">
        <div className="relative mb-3"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" /></div>
        <div className="space-y-2">
          {filtered.map(emp => (
            <div key={emp.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{emp.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{emp.name}</p>
                  <p className="text-[11px] text-muted-foreground">{emp.employeeId} • {departments.find(d => d.id === emp.departmentId)?.name || "-"}</p>
                  <p className="text-[11px] text-muted-foreground">{designations.find(d => d.id === emp.designationId)?.name || "-"} • $ {emp.salary.toLocaleString()}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${emp.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{emp.status}</span>
                <div className="flex gap-1">
                  <button onClick={() => setShowView(emp)} className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center text-info"><Eye size={14} /></button>
                  <button onClick={() => {
                    setForm({ employeeId: emp.employeeId, name: emp.name, phone: emp.phone, email: emp.email, departmentId: emp.departmentId, designationId: emp.designationId, shiftId: emp.shiftId, joinDate: emp.joinDate, salary: String(emp.salary), status: emp.status });
                    setEditing(emp); setShowForm(true);
                  }} className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning"><Edit size={14} /></button>
                  <button onClick={() => { const u = employees.filter(x => x.id !== emp.id); setEmployees(u); store.saveEmployees(u); }} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">No employees</p>}
        </div>
      </div>

      <Dialog open={!!showView} onOpenChange={() => setShowView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{showView?.name}</DialogTitle></DialogHeader>
          {showView && (
            <div className="space-y-2 text-sm">
              {[
                ["Employee ID", showView.employeeId], ["Phone", showView.phone], ["Email", showView.email || "-"],
                ["Department", departments.find(d => d.id === showView.departmentId)?.name || "-"],
                ["Designation", designations.find(d => d.id === showView.designationId)?.name || "-"],
                ["Shift", shifts.find(s => s.id === showView.shiftId)?.name || "-"],
                ["Join Date", showView.joinDate], ["Salary", `$ ${showView.salary.toLocaleString()}`],
                ["Status", showView.status],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{val}</span></div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Employee ID" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
            <Input placeholder="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
              <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.designationId} onValueChange={(v) => setForm({ ...form, designationId: v })}>
              <SelectTrigger><SelectValue placeholder="Designation" /></SelectTrigger>
              <SelectContent>{designations.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.shiftId} onValueChange={(v) => setForm({ ...form, shiftId: v })}>
              <SelectTrigger><SelectValue placeholder="Shift" /></SelectTrigger>
              <SelectContent>{shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
            <Input type="number" placeholder="Salary" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Employee["status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
            </Select>
            <button onClick={save} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">{editing ? "Update" : "Save"}</button>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default Employees;
