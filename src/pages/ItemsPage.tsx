import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Plus, Minus, X, ChevronRight } from "lucide-react";
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
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, activeCategory]);

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <div className="bg-primary text-primary-foreground px-4 pt-4 pb-3 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Items</h1>
          <button
            onClick={() => setShowCart(true)}
            className="relative p-2 rounded-full bg-primary-foreground/15 active:bg-primary-foreground/25"
          >
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/50"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="I want to sell..."
            className="w-full bg-primary-foreground/15 placeholder:text-primary-foreground/50 text-primary-foreground rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-foreground/30"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => setActiveCategory("all")}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeCategory === "all"
                ? "bg-primary-foreground text-primary"
                : "bg-primary-foreground/15 text-primary-foreground"
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
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary-foreground/15 text-primary-foreground"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product Grid ── */}
      <div className="flex-1 overflow-y-auto pb-32">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-px bg-border">
            {filtered.map((p) => {
              const qty = cartQty(p.id);
              const outOfStock = p.stock <= 0;
              const imgUrl = getImageUrl(p.image);

              return (
                <div
                  key={p.id}
                  className="bg-card flex flex-col items-center py-3 px-2 gap-1 relative"
                >
                  {/* Out of stock badge */}
                  {outOfStock && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">
                      Out of stock
                    </span>
                  )}

                  {/* In-cart badge */}
                  {qty > 0 && (
                    <span className="absolute top-2 right-2 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 z-10">
                      {qty}
                    </span>
                  )}

                  {/* Product Image */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-accent flex items-center justify-center">
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
                  <p className="text-xs font-semibold text-center leading-tight line-clamp-2">
                    {p.name}
                  </p>

                  {/* Price */}
                  <p className="text-xs font-bold text-primary">
                    {formatCurrency(p.retailPrice)}
                  </p>

                  {/* Add / Qty Controls */}
                  {outOfStock ? (
                    <div className="h-7" />
                  ) : qty === 0 ? (
                    <button
                      onClick={() => addToCart(p)}
                      className="mt-1 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full active:opacity-80"
                    >
                      Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        onClick={() => removeFromCart(p.id)}
                        className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:opacity-80"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{qty}</span>
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
          </div>
        )}
      </div>

      {/* ── Sticky Checkout Bar ── */}
      {totalItems > 0 && (
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 z-40">
          <button
            onClick={checkout}
            className="w-full bg-primary text-primary-foreground rounded-2xl px-5 py-4 flex items-center justify-between shadow-2xl active:opacity-90"
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
