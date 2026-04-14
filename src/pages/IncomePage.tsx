import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Income } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const IncomePage = () => {
  const { toast } = useToast();
  const incomeCategories = store.getIncomeCategories();
  const [incomes, setIncomes] = useState(store.getIncomes());
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ categoryId: "", amount: "", description: "", paymentType: "Cash" as Income["paymentType"] });

  const filtered = incomes.filter(i => i.description.toLowerCase().includes(search.toLowerCase()) || i.categoryName.toLowerCase().includes(search.toLowerCase()));
  const total = filtered.reduce((s, i) => s + i.amount, 0);

  const add = () => {
    if (!form.categoryId || !form.amount) return;
    const cat = incomeCategories.find(c => c.id === form.categoryId);
    const updated = [{ id: store.nextId(), date: new Date().toISOString().split("T")[0], categoryId: form.categoryId, categoryName: cat?.name || "", amount: Number(form.amount), description: form.description, paymentType: form.paymentType }, ...incomes];
    setIncomes(updated); store.saveIncomes(updated);
    setForm({ categoryId: "", amount: "", description: "", paymentType: "Cash" }); setShowAdd(false);
    toast({ title: "Income added!" });
  };

  const deleteItem = (id: string) => {
    const updated = incomes.filter(i => i.id !== id);
    setIncomes(updated); store.saveIncomes(updated);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Income" />
      <div className="px-4 py-3 space-y-3">
        <div className="bg-success/10 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Income</p>
          <p className="text-2xl font-bold text-success">$ {total.toLocaleString()}</p>
        </div>
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        {filtered.map(i => (
          <div key={i.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
            <div className="flex-1"><p className="font-semibold text-sm">{i.categoryName}</p><p className="text-xs text-muted-foreground">{i.description}</p><p className="text-[11px] text-muted-foreground">{i.date} · {i.paymentType}</p></div>
            <p className="font-bold text-sm text-success">$ {i.amount}</p>
            <button onClick={() => deleteItem(i.id)} className="p-1"><Trash2 size={14} className="text-destructive" /></button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No income records</p>}
      </div>
      <button onClick={() => setShowAdd(true)} className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center"><Plus size={24} /></button>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>Add Income</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}><SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger><SelectContent>{incomeCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            <Input type="number" placeholder="Amount *" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <Select value={form.paymentType} onValueChange={v => setForm({ ...form, paymentType: v as Income["paymentType"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank">Bank</SelectItem><SelectItem value="Cheque">Cheque</SelectItem></SelectContent></Select>
            <button onClick={add} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Save</button>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default IncomePage;
