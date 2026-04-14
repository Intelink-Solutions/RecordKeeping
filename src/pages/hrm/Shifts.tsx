import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CrudListPage from "@/components/CrudListPage";
import { store, Shift } from "@/lib/store";

const Shifts = () => (
  <CrudListPage<Shift>
    title="Shift List"
    items={store.getShifts()}
    onSave={(items) => store.saveShifts(items)}
    columns={[
      { key: "name", label: "Name" },
      { key: "startTime", label: "Start" },
      { key: "endTime", label: "End" },
      { key: "breakTime", label: "Break" },
      { key: "status", label: "Status" },
    ]}
    renderForm={(item, onChange) => (
      <>
        <Input placeholder="Shift Name *" value={item.name || ""} onChange={(e) => onChange("name", e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Start Time</label>
            <Input type="time" value={item.startTime || ""} onChange={(e) => onChange("startTime", e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">End Time</label>
            <Input type="time" value={item.endTime || ""} onChange={(e) => onChange("endTime", e.target.value)} />
          </div>
        </div>
        <Input placeholder="Break Time (e.g., 30 min)" value={item.breakTime || ""} onChange={(e) => onChange("breakTime", e.target.value)} />
        <Select value={item.status || "Active"} onValueChange={(v) => onChange("status", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </>
    )}
    createDefaults={() => ({ name: "", startTime: "09:00", endTime: "17:00", breakTime: "30 min", status: "Active" as const })}
    searchKey="name"
    displayName="Shift"
  />
);
export default Shifts;
