import { useState } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Income } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Incomes = () => {
  const { toast } = useToast();
  const incomeCategories = store.getIncomeCategories();
  const [incomes, setIncomes] = useState<Income[]>(store.getIncomes());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], categoryId: "", description: "", amount: "", paymentType: "Cash" as Income["paymentType"] });

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);

  const save = () => {
    if (!form.categoryId || !form.amount) return;
    const cat = incomeCategories.find(c => c.id === form.categoryId);
    const data: Income = { id: editing?.id || Date.now().toString(), ...form, amount: Number(form.amount), categoryName: cat?.name || "" };
    const updated = editing ? incomes.map(i => i.id === editing.id ? data : i) : [data, ...incomes];
    setIncomes(updated);
    store.saveIncomes(updated);
    setShowForm(false);
    setEditing(null);
    toast({ title: editing ? "Income updated" : "Income added" });
  };

  const filtered = incomes.filter(i => i.description.toLowerCase().includes(search.toLowerCase()) || i.categoryName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Income" rightAction={
        <button onClick={() => { setEditing(null); setForm({ date: new Date().toISOString().split("T")[0], categoryId: "", description: "", amount: "", paymentType: "Cash" }); setShowForm(true); }} className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><Plus size={16} className="text-primary-foreground" /></button>
      } />
      <div className="px-4 py-3">
        <div className="bg-success/10 rounded-xl p-4 mb-3 text-center">
          <p className="text-[11px] text-muted-foreground">Total Income</p>
          <p className="font-bold text-xl text-success">$ {totalIncome.toLocaleString()}</p>
        </div>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
        </div>
        <div className="space-y-2">
          {filtered.map(i => (
            <div key={i.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold text-sm">{i.categoryName}</p>
                <p className="text-[11px] text-muted-foreground">{i.description} • {i.date}</p>
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{i.paymentType}</span>
              </div>
              <p className="font-bold text-sm text-success">$ {i.amount.toLocaleString()}</p>
              <div className="flex gap-1">
                <button onClick={() => { setForm({ date: i.date, categoryId: i.categoryId, description: i.description, amount: String(i.amount), paymentType: i.paymentType }); setEditing(i); setShowForm(true); }} className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning"><Edit size={14} /></button>
                <button onClick={() => { const u = incomes.filter(x => x.id !== i.id); setIncomes(u); store.saveIncomes(u); }} className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-12">No income records</p>}
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Income" : "Add Income"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
              <SelectTrigger><SelectValue placeholder="Category *" /></SelectTrigger>
              <SelectContent>{incomeCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input type="number" placeholder="Amount *" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Select value={form.paymentType} onValueChange={(v) => setForm({ ...form, paymentType: v as Income["paymentType"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank">Bank</SelectItem><SelectItem value="Cheque">Cheque</SelectItem></SelectContent>
            </Select>
            <button onClick={save} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">{editing ? "Update" : "Save"}</button>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default Incomes;
