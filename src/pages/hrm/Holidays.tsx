import { Input } from "@/components/ui/input";
import CrudListPage from "@/components/CrudListPage";
import { store, Holiday } from "@/lib/store";

const Holidays = () => (
  <CrudListPage<Holiday>
    title="Holiday List"
    items={store.getHolidays()}
    onSave={(items) => store.saveHolidays(items)}
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
    searchKey="name"
    displayName="Holiday"
  />
);
export default Holidays;
