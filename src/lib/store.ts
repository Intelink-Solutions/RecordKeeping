export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
}

export interface Party {
  id: string;
  name: string;
  type: "Dealer" | "Retailer" | "Wholesaler" | "Supplier";
  due: number;
  avatar?: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  items: SaleItem[];
  subtotal: number;
  vat: number;
  discount: number;
  total: number;
  paid: number;
  profit: number;
  status: "Paid" | "Due";
}

export interface Purchase {
  id: string;
  invoiceNo: string;
  date: string;
  supplierName: string;
  total: number;
  paid: number;
}

const PRODUCTS_KEY = "app_products";
const PARTIES_KEY = "app_parties";
const SALES_KEY = "app_sales";
const PURCHASES_KEY = "app_purchases";

const defaultProducts: Product[] = [
  { id: "1", name: "T-Shirt", price: 1200, stock: 200 },
  { id: "2", name: "Green Grapes", price: 800, stock: 400 },
  { id: "3", name: "Ladies Bag", price: 300, stock: 200 },
  { id: "4", name: "Laptop", price: 150, stock: 42 },
  { id: "5", name: "Mobile", price: 2000, stock: 978 },
  { id: "6", name: "Shoe", price: 1250, stock: 191 },
  { id: "7", name: "Watch", price: 500, stock: 89 },
  { id: "8", name: "Banana", price: 500, stock: 606 },
];

const defaultParties: Party[] = [
  { id: "1", name: "Moson", type: "Dealer", due: 17700 },
  { id: "2", name: "Robin", type: "Retailer", due: 800 },
  { id: "3", name: "Jack", type: "Wholesaler", due: 20500 },
  { id: "4", name: "MD Rakib", type: "Supplier", due: 500 },
  { id: "5", name: "Sakil", type: "Supplier", due: 0 },
  { id: "6", name: "Jake", type: "Retailer", due: 2000 },
  { id: "7", name: "Micheal", type: "Dealer", due: 2500 },
];

const defaultSales: Sale[] = [
  { id: "1", invoiceNo: "S-00018", date: "2025-01-04", customerName: "Guest", items: [], subtotal: 500, vat: 0, discount: 0, total: 500, paid: 500, profit: 100, status: "Paid" },
  { id: "2", invoiceNo: "S-00017", date: "2025-01-04", customerName: "Guest", items: [], subtotal: 157, vat: 0, discount: 0, total: 157, paid: 157, profit: 50, status: "Paid" },
  { id: "3", invoiceNo: "S-00016", date: "2025-01-04", customerName: "Moson", items: [], subtotal: 400, vat: 0, discount: 0, total: 400, paid: 400, profit: 0, status: "Paid" },
];

function load<T>(key: string, defaults: T[]): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaults;
  } catch {
    return defaults;
  }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const store = {
  getProducts: () => load<Product>(PRODUCTS_KEY, defaultProducts),
  saveProducts: (p: Product[]) => save(PRODUCTS_KEY, p),

  getParties: () => load<Party>(PARTIES_KEY, defaultParties),
  saveParties: (p: Party[]) => save(PARTIES_KEY, p),

  getSales: () => load<Sale>(SALES_KEY, defaultSales),
  saveSales: (s: Sale[]) => save(SALES_KEY, s),

  getPurchases: () => load<Purchase>(PURCHASES_KEY, []),
  savePurchases: (p: Purchase[]) => save(PURCHASES_KEY, p),

  getNextInvoiceNo: (): string => {
    const sales = load<Sale>(SALES_KEY, defaultSales);
    const max = sales.reduce((m, s) => {
      const n = parseInt(s.invoiceNo.replace("S-", ""));
      return n > m ? n : m;
    }, 0);
    return `S-${String(max + 1).padStart(5, "0")}`;
  },
};
