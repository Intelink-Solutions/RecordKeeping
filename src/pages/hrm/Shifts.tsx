import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SHIFT_NAMES = [
  "Morning Shift",
  "Afternoon Shift",
  "Evening Shift",
  "Night Shift",
  "Day Shift",
  "General Shift",
  "Rotational Shift",
  "Weekend Shift",
];
import CrudListPage from "@/components/CrudListPage";
import { store, Shift } from "@/lib/store";
import { useHrmLiveList } from "@/hooks/use-hrm-live-list";
import { apiCreateHrmResourceForm, apiUpdateHrmResourceForm, apiDeleteHrmResource } from "@/lib/api";

const Shifts = () => {
  const { items, saveItems } = useHrmLiveList<Shift>({
    resource: "shifts",
    localGet: () => store.getShifts(),
    localSave: (next) => store.saveShifts(next),
  });

  return (
    <CrudListPage<Shift>
      title="Shift List"
      items={items}
      onSave={saveItems}
      onApiCreate={(data) => apiCreateHrmResourceForm<Shift>("shifts", data as Record<string, unknown>)}
      onApiUpdate={(id, data) => apiUpdateHrmResourceForm<Shift>("shifts", id, data as Record<string, unknown>)}
      onApiDelete={(id) => apiDeleteHrmResource("shifts", id)}
      columns={[
        { key: "name", label: "Name" },
        { key: "startTime", label: "Start" },
        { key: "endTime", label: "End" },
        { key: "breakStatus", label: "Break" },
        { key: "status", label: "Status" },
      ]}
      renderForm={(item, onChange) => {
        const showBreak = item.breakStatus === "Yes";
        return (
          <>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Select Name *</label>
              <Select value={item.name || ""} onValueChange={(v) => onChange("name", v)}>
                <SelectTrigger><SelectValue placeholder="Select shift name" /></SelectTrigger>
                <SelectContent>
                  {SHIFT_NAMES.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start Time *</label>
                <Input
                  type="time"
                  value={item.startTime || "09:00"}
                  onChange={(e) => onChange("startTime", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End Time *</label>
                <Input
                  type="time"
                  value={item.endTime || "17:00"}
                  onChange={(e) => onChange("endTime", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Break</label>
              <Select
                value={item.breakStatus || "No"}
                onValueChange={(v) => {
                  onChange("breakStatus", v);
                  if (v === "No") {
                    onChange("startBreakTime", "");
                    onChange("endBreakTime", "");
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No Break</SelectItem>
                  <SelectItem value="Yes">Yes — has break</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showBreak && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Break Start</label>
                  <Input
                    type="time"
                    value={item.startBreakTime || "12:00"}
                    onChange={(e) => onChange("startBreakTime", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Break End</label>
                  <Input
                    type="time"
                    value={item.endBreakTime || "13:00"}
                    onChange={(e) => onChange("endBreakTime", e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={item.status || "Active"} onValueChange={(v) => onChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      }}
      createDefaults={() => ({
        name: "",
        breakStatus: "No" as const,
        startTime: "09:00",
        endTime: "17:00",
        startBreakTime: "",
        endBreakTime: "",
        status: "Active" as const,
      })}
      validate={(item) => {
        if (!item.name?.trim()) return "Shift name is required.";
        if (!item.startTime) return "Start time is required.";
        if (!item.endTime) return "End time is required.";
        if (item.breakStatus === "Yes") {
          if (!item.startBreakTime) return "Break start time is required.";
          if (!item.endBreakTime) return "Break end time is required.";
        }
        return null;
      }}
      searchKey="name"
      displayName="Shift"
    />
  );
};
export default Shifts;
