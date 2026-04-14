import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store } from "@/lib/store";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DueList = () => {
  const customers = store.getCustomers();
  const suppliers = store.getSuppliers();
  const [search, setSearch] = useState("");
  const [partyType, setPartyType] = useState("all");

  const allDues = [
    ...customers.filter(c => c.due > 0).map(c => ({ ...c, partyType: c.type, source: "customer" as const })),
    ...suppliers.filter(s => s.due > 0).map(s => ({ ...s, partyType: "Supplier" as const, source: "supplier" as const })),
  ].filter(d =>
    (!search || d.name.toLowerCase().includes(search.toLowerCase())) &&
    (partyType === "all" || d.partyType === partyType)
  );

  const totalDue = allDues.reduce((s, d) => s + d.due, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Due List" />
      <div className="px-4 py-3 space-y-3">
        <div className="bg-primary/10 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Due</p>
          <p className="text-2xl font-bold text-primary">$ {totalDue.toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={partyType} onValueChange={setPartyType}>
            <SelectTrigger className="w-32 h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Retailer">Retailer</SelectItem>
              <SelectItem value="Wholesaler">Wholesaler</SelectItem>
              <SelectItem value="Dealer">Dealer</SelectItem>
              <SelectItem value="Supplier">Supplier</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {allDues.map(d => (
          <div key={d.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-lg font-bold text-accent-foreground">{d.name[0]}</div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{d.name}</p>
              <p className="text-xs text-muted-foreground">{d.partyType}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm text-destructive">$ {d.due.toLocaleString()}</p>
            </div>
          </div>
        ))}
        {allDues.length === 0 && <p className="text-center text-muted-foreground py-8">No dues found</p>}
      </div>
      <BottomNav />
    </div>
  );
};

export default DueList;
