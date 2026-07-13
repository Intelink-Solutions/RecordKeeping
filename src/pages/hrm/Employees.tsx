import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, Employee, Department, Designation, Shift } from "@/lib/store";
import { useHrmLiveList } from "@/hooks/use-hrm-live-list";
import { apiCreateHrmResourceForm, apiUpdateHrmResourceForm, apiDeleteHrmResource } from "@/lib/api";
import { getImageUrl } from "@/lib/image-utils";
import { validateOptionalEmail, validateOptionalPhone } from "@/lib/validators";

const TODAY = new Date().toISOString().split("T")[0];

const Employees = () => {
  const { items, saveItems } = useHrmLiveList<Employee>({
    resource: "employees",
    localGet: () => store.getEmployees(),
    localSave: (next) => store.saveEmployees(next),
  });

  const { items: departments } = useHrmLiveList<Department>({
    resource: "departments",
    localGet: () => store.getDepartments(),
    localSave: (next) => store.saveDepartments(next),
  });

  const { items: designations } = useHrmLiveList<Designation>({
    resource: "designations",
    localGet: () => store.getDesignations(),
    localSave: (next) => store.saveDesignations(next),
  });

  const { items: shifts } = useHrmLiveList<Shift>({
    resource: "shifts",
    localGet: () => store.getShifts(),
    localSave: (next) => store.saveShifts(next),
  });

  // Image file tracked outside CrudListPage's generic state so it can be a File object
  const imageFileRef = useRef<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const resetImage = () => {
    imageFileRef.current = null;
    setImagePreview(null);
  };

  return (
    <CrudListPage<Employee>
      title="Employee List"
      items={items}
      onSave={saveItems}
      apiResource="employees"
      onApiCreate={(data) => {
        const payload: Record<string, unknown> = { ...data };
        if (imageFileRef.current) payload.image = imageFileRef.current;
        resetImage();
        return apiCreateHrmResourceForm<Employee>("employees", payload);
      }}
      onApiUpdate={(id, data) => {
        const payload: Record<string, unknown> = { ...data };
        if (imageFileRef.current) payload.image = imageFileRef.current;
        resetImage();
        return apiUpdateHrmResourceForm<Employee>("employees", id, payload);
      }}
      onApiDelete={(id) => apiDeleteHrmResource("employees", id)}
      columns={[
        { key: "name", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "salary", label: "Salary" },
        { key: "status", label: "Status" },
      ]}
      renderForm={(item, onChange) => (
        <>
          <Input
            placeholder="Full Name *"
            value={item.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
          />

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Designation <span className="text-destructive">*</span></label>
            <Select value={String(item.designationId || "")} onValueChange={(v) => onChange("designationId", v)}>
              <SelectTrigger><SelectValue placeholder={designations.length === 0 ? "No designations found — create in HRM → Designations" : "Select Designation *"} /></SelectTrigger>
              <SelectContent>
                {designations.map((d) => <SelectItem key={String(d.id)} value={String(d.id)}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Department <span className="text-destructive">*</span></label>
            <Select value={String(item.departmentId || "")} onValueChange={(v) => onChange("departmentId", v)}>
              <SelectTrigger><SelectValue placeholder={departments.length === 0 ? "No departments found — create in HRM → Departments" : "Select Department *"} /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => <SelectItem key={String(d.id)} value={String(d.id)}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Shift <span className="text-destructive">*</span></label>
            <Select value={String(item.shiftId || "")} onValueChange={(v) => onChange("shiftId", v)}>
              <SelectTrigger><SelectValue placeholder={shifts.length === 0 ? "No shifts found — create in HRM → Shifts" : "Select Shift *"} /></SelectTrigger>
              <SelectContent>
                {shifts.map((s) => <SelectItem key={String(s.id)} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Select value={item.gender || ""} onValueChange={(v) => onChange("gender", v)}>
            <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Birth Date</label>
            <Input type="date" value={item.birthDate || ""} onChange={(e) => onChange("birthDate", e.target.value)} />
          </div>

          <Input
            placeholder="Email address"
            type="email"
            value={item.email || ""}
            onChange={(e) => onChange("email", e.target.value)}
          />

          <Input
            placeholder="Country"
            value={item.country || ""}
            onChange={(e) => onChange("country", e.target.value)}
          />

          <Input
            placeholder="Phone number"
            value={item.phone || ""}
            onChange={(e) => onChange("phone", e.target.value)}
          />

          <Input
            type="number"
            placeholder="Salary amount *"
            value={item.salary || ""}
            onChange={(e) => onChange("salary", Number(e.target.value))}
          />

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Join Date</label>
            <Input type="date" value={item.joinDate || TODAY} onChange={(e) => onChange("joinDate", e.target.value)} />
          </div>

          <Select value={item.status || "Active"} onValueChange={(v) => onChange("status", v)}>
            <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Profile Image</label>
            <input
              type="file"
              accept="image/*"
              className="text-xs w-full border border-border rounded-lg px-3 py-2 bg-background"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  imageFileRef.current = file;
                  setImagePreview(URL.createObjectURL(file));
                }
              }}
            />
            {(imagePreview || item.image) && (
              <img
                src={imagePreview || getImageUrl(item.image) || ""}
                alt="preview"
                className="w-14 h-14 rounded-full object-cover mt-2 border border-border"
              />
            )}
          </div>
        </>
      )}
      createDefaults={() => ({
        name: "",
        designationId: "",
        departmentId: "",
        shiftId: "",
        gender: "",
        birthDate: "",
        email: "",
        country: "",
        phone: "",
        salary: 0,
        joinDate: TODAY,
        status: "Active" as const,
        image: "",
      })}
      validate={(item) => {
        if (!item.name?.trim()) return "Employee name is required.";
        if (!item.departmentId) return departments.length === 0
          ? "No departments yet — create one in HRM → Departments first."
          : "Please select a Department.";
        if (!item.designationId) return designations.length === 0
          ? "No designations yet — create one in HRM → Designations first."
          : "Please select a Designation.";
        if (!item.shiftId) return shifts.length === 0
          ? "No shifts yet — create one in HRM → Shifts first."
          : "Please select a Shift.";
        if (!item.salary || item.salary <= 0) return "Salary must be greater than 0.";
        if (!item.joinDate) return "Join date is required.";
        const emailError = validateOptionalEmail(item.email);
        if (emailError) return emailError;
        const phoneError = validateOptionalPhone(item.phone);
        if (phoneError) return phoneError;
        return null;
      }}
      searchKey="name"
      displayName="Employee"
    />
  );
};
export default Employees;
