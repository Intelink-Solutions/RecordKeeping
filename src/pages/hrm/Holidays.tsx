import { Input } from "@/components/ui/input";
import CrudListPage from "@/components/CrudListPage";
import { store, Holiday } from "@/lib/store";
import { useHrmLiveList } from "@/hooks/use-hrm-live-list";
import { apiCreateHrmResourceForm, apiUpdateHrmResourceForm, apiDeleteHrmResource } from "@/lib/api";

const Holidays = () => {
  const { items, saveItems } = useHrmLiveList<Holiday>({
    resource: "holidays",
    localGet: () => store.getHolidays(),
    localSave: (next) => store.saveHolidays(next),
  });

  return (
  <CrudListPage<Holiday>
    title="Holiday List"
    items={items}
    onSave={saveItems}
    apiResource="holidays"
    onApiCreate={(data) => apiCreateHrmResourceForm<Holiday>("holidays", data as Record<string, unknown>)}
    onApiUpdate={(id, data) => apiUpdateHrmResourceForm<Holiday>("holidays", id, data as Record<string, unknown>)}
    onApiDelete={(id) => apiDeleteHrmResource("holidays", id)}
    columns={[
      { key: "name", label: "Name" },
      { key: "date", label: "Date" },
      { key: "description", label: "Description" },
    ]}
    renderForm={(item, onChange) => (
      <>
        <Input placeholder="Holiday Name *" value={item.name || ""} onChange={(e) => onChange("name", e.target.value)} />
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Date</label>
          <Input type="date" value={item.date || ""} onChange={(e) => onChange("date", e.target.value)} />
        </div>
        <Input placeholder="Description" value={item.description || ""} onChange={(e) => onChange("description", e.target.value)} />
      </>
    )}
    createDefaults={() => ({ name: "", date: "", description: "" })}
    validate={(item) => {
      if (!item.name?.trim()) return "Holiday name is required.";
      if (!item.date) return "Date is required.";
      return null;
    }}
    searchKey="name"
    displayName="Holiday"
  />
  );
};
export default Holidays;
