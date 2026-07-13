import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, ShoppingCart, ShoppingBag, Plus, Minus, X, ChevronRight,
  SlidersHorizontal, FolderPlus, Package, MoreVertical,
} from "lucide-react";
import { store, Product } from "@/lib/store";
import { useLiveData } from "@/hooks/use-live-data";
import { formatCurrency } from "@/lib/currency";
import { getImageUrl } from "@/lib/image-utils";
import BottomNav from "@/components/BottomNav";

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  stock: number;
  image?: string;
}

const ItemsPage = () => {
  const navigate = useNavigate();
  const products = useLiveData(() => store.getProducts());
  const categories = useLiveData(() => store.getCategories());

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // ── Filtered products ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q);
      const matchCat =
        activeCategory === "all" || p.categoryId === activeCategory;
      const matchStock = !hideOutOfStock || p.stock > 0;
      return matchSearch && matchCat && matchStock;
    });
  }, [products, searchQuery, activeCategory, hideOutOfStock]);

  // ── Cart helpers ───────────────────────────────────────────────────
  const cartQty = (productId: string) =>
    cart.find((c) => c.productId === productId)?.quantity ?? 0;

  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);
  const totalPrice = cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);

  const addToCart = (p: Product) => {
    if (p.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === p.id);
      if (existing) {
        return prev.map((c) =>
          c.productId === p.id
            ? { ...c, quantity: Math.min(c.quantity + 1, p.stock) }
            : c
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          quantity: 1,
          unitPrice: p.retailPrice,
          stock: p.stock,
          image: p.image,
        },
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === productId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter((c) => c.productId !== productId);
      return prev.map((c) =>
        c.productId === productId ? { ...c, quantity: c.quantity - 1 } : c
      );
    });
  };

  const deleteFromCart = (productId: string) =>
    setCart((prev) => prev.filter((c) => c.productId !== productId));

  const clearCart = () => setCart([]);

  // ── Proceed to Create Sale ─────────────────────────────────────────
  const checkout = () => {
    const saleItems = cart.map((c) => ({
      productId: c.productId,
      name: c.name,
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      discount: 0,
    }));
    navigate("/add-sale", { state: { prefillItems: saleItems } });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-nav">
      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-4 pb-3 space-y-3 safe-top">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shrink-0">
              <ShoppingBag size={20} className="text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight truncate">Items</h1>
              <p className="text-xs text-muted-foreground truncate">Manage your products and inventory</p>
            </div>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative w-11 h-11 rounded-2xl border border-border bg-card flex items-center justify-center shrink-0"
            aria-label="Open cart"
          >
            <ShoppingCart size={19} />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="I want to sell..."
              className="w-full bg-muted/60 placeholder:text-muted-foreground rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={() => setHideOutOfStock((v) => !v)}
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 transition-colors ${
              hideOutOfStock ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
            }`}
            aria-pressed={hideOutOfStock}
            aria-label="Toggle in-stock only filter"
            title={hideOutOfStock ? "Showing in-stock items only" : "Show all items"}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => setActiveCategory("all")}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-foreground"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground"
              }`}
            >
              {cat.name}
            </button>
          ))}
          <button
            onClick={() => navigate("/categories")}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-dashed border-primary/40 text-primary"
          >
            <FolderPlus size={13} />
            Add Category
          </button>
        </div>
      </div>

      {/* ── Product Grid ── */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 px-4 py-4">
            {filtered.map((p) => {
              const qty = cartQty(p.id);
              const outOfStock = p.stock <= 0;
              const lowStock = !outOfStock && p.stock <= p.alertQty;
              const imgUrl = getImageUrl(p.image);

              return (
                <div
                  key={p.id}
                  className="relative bg-card rounded-2xl border border-border shadow-sm p-3 flex flex-col items-center gap-1"
                >
                  <button
                    onClick={() => navigate("/products")}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted z-10"
                    aria-label={`Manage ${p.name}`}
                  >
                    <MoreVertical size={14} />
                  </button>

                  {/* Product Image */}
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-extrabold text-muted-foreground">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <p className="w-full text-xs font-bold text-center leading-tight line-clamp-2 mt-1">
                    {p.name}
                  </p>

                  {/* Price */}
                  <p className="text-xs font-bold text-primary">
                    {formatCurrency(p.retailPrice)}
                  </p>

                  {/* Stock badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[9.5px] font-semibold px-2 py-0.5 rounded-full ${
                      outOfStock
                        ? "bg-destructive/10 text-destructive"
                        : lowStock
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                    }`}
                  >
                    <Package size={9} />
                    {outOfStock ? "Out of Stock" : lowStock ? "Low Stock" : "In Stock"}
                  </span>

                  {/* Add / Qty Controls */}
                  {outOfStock ? (
                    <div className="w-full h-7 mt-1" />
                  ) : qty === 0 ? (
                    <button
                      onClick={() => addToCart(p)}
                      className="w-full mt-1 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center gap-1 active:opacity-80"
                    >
                      <Plus size={12} />
                      Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        onClick={() => removeFromCart(p.id)}
                        className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:opacity-80"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{qty}</span>
                      <button
                        onClick={() => addToCart(p)}
                        className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:opacity-80"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add New Product tile */}
            <button
              onClick={() => navigate("/products")}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 text-primary py-6 min-h-[168px]"
            >
              <div className="w-9 h-9 rounded-full border-2 border-primary/40 flex items-center justify-center">
                <Plus size={18} />
              </div>
              <span className="text-xs font-bold text-center px-2 leading-tight">Add New Product</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Sticky Checkout Bar ── */}
      {totalItems > 0 && (
        <div className="fixed bottom-[calc(90px+env(safe-area-inset-bottom,0px))] left-0 right-0 px-4 z-40">
          <button
            onClick={checkout}
            className="w-full max-w-lg mx-auto bg-primary text-primary-foreground rounded-2xl px-5 py-4 flex items-center justify-between shadow-2xl active:opacity-90"
          >
            <div className="flex items-center gap-3">
              <span className="bg-primary-foreground/20 text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
              <span className="text-sm font-semibold">Proceed to Sale</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-base">{formatCurrency(totalPrice)}</span>
              <ChevronRight size={18} />
            </div>
          </button>
        </div>
      )}

      {/* ── Cart Drawer ── */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCart(false)}
          />

          {/* Sheet */}
          <div className="relative bg-card rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl">
            {/* Handle + Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
              <div>
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3" />
                <p className="font-bold text-base">
                  Cart ({totalItems} {totalItems === 1 ? "item" : "items"})
                </p>
              </div>
              <button
                onClick={clearCart}
                className="text-xs text-destructive font-semibold"
              >
                Clear All
              </button>
            </div>

            {/* Cart Items */}
            <div className="overflow-y-auto flex-1 px-4 py-2 space-y-2">
              {cart.map((item) => {
                const imgUrl = getImageUrl(item.image);
                return (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                  >
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-accent flex items-center justify-center flex-shrink-0">
                      {imgUrl ? (
                        <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-extrabold text-muted-foreground">
                          {item.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.unitPrice)} × {item.quantity} ={" "}
                        <span className="text-primary font-bold">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => {
                          const p = products.find((x) => x.id === item.productId);
                          if (p) addToCart(p);
                        }}
                        className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        onClick={() => deleteFromCart(item.productId)}
                        className="w-7 h-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center ml-1"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary + Checkout */}
            <div className="px-5 py-4 border-t border-border space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Subtotal</span>
                <span className="font-bold">{formatCurrency(totalPrice)}</span>
              </div>
              <button
                onClick={() => {
                  setShowCart(false);
                  checkout();
                }}
                className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-2xl text-sm shadow-lg active:opacity-90"
              >
                Checkout → Create Sale
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ItemsPage;
