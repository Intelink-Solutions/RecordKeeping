import { useState } from "react";
import { Plus, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Party } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";

const typeColors: Record<string, string> = {
  Dealer: "#e74c3c",
  Retailer: "#e67e22",
  Wholesaler: "#27ae60",
  Supplier: "#8e44ad",
};

const Parties = () => {
  const [parties, setParties] = useState<Party[]>(store.getParties());
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<Party["type"]>("Dealer");

  const addParty = () => {
    if (!name.trim()) return;
    const updated = [...parties, { id: Date.now().toString(), name: name.trim(), type, due: 0 }];
    setParties(updated);
    store.saveParties(updated);
    setName("");
    setShowAdd(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Parties List" />
      <div className="px-4 py-3 space-y-2">
        {parties.map((p) => (
          <div key={p.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
              {p.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-xs font-semibold" style={{ color: typeColors[p.type] }}>{p.type}</p>
            </div>
            <div className="text-right">
              {p.due > 0 && <p className="font-bold text-sm">{formatCurrency(p.due)}</p>}
              {p.due > 0 && <p className="text-xs text-warning font-medium">Due</p>}
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </div>
        ))}
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4">
        <button onClick={() => setShowAdd(true)} className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg">
          Please Add A Customer <Plus size={18} />
        </button>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Customer Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={type} onValueChange={(v) => setType(v as Party["type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Dealer", "Retailer", "Wholesaler", "Supplier"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button onClick={addParty} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Add</button>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default Parties;
