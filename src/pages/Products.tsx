import { useState } from "react";
import { Plus, MoreVertical } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { store, Product } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const Products = () => {
  const [products, setProducts] = useState<Product[]>(store.getProducts());
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  const addProduct = () => {
    if (!name.trim() || !price) return;
    const updated = [...products, { id: Date.now().toString(), name: name.trim(), price: Number(price), stock: Number(stock) || 0 }];
    setProducts(updated);
    store.saveProducts(updated);
    setName(""); setPrice(""); setStock("");
    setShowAdd(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Product List" rightAction={<MoreVertical size={20} className="text-muted-foreground" />} />
      <div className="px-4 py-3 space-y-1">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg">📦</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-xs text-muted-foreground">Stock : {p.stock}</p>
            </div>
            <p className="font-bold text-sm">$ {p.price}</p>
            <MoreVertical size={18} className="text-muted-foreground" />
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center"
      >
        <Plus size={24} />
      </button>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            <Input placeholder="Stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
            <button onClick={addProduct} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl">Add</button>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default Products;
