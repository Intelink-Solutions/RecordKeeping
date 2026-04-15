import { apiGet } from "@/lib/api";
import { apiGetProfile } from "@/lib/api";
import { setCurrentRole } from "@/lib/permissions";
import { setSyncStatus } from "@/lib/sync-status";
import {
  store,
  Brand,
  Category,
  Customer,
  Expense,
  ExpenseCategory,
  Income,
  IncomeCategory,
  Product,
  Purchase,
  PurchaseReturn,
  Sale,
  SaleReturn,
  Supplier,
  Party,
} from "@/lib/store";

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as T[];
  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) return nested.data as T[];
  }
  return [];
}

function toId(value: unknown): string {
  return value == null ? "" : String(value);
}

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: toId(row.id),
    name: String(row.categoryName ?? row.name ?? ""),
    description: row.categoryDescription ? String(row.categoryDescription) : undefined,
  };
}

function mapBrand(row: Record<string, unknown>): Brand {
  return {
    id: toId(row.id),
    name: String(row.brandName ?? row.name ?? ""),
    description: row.description ? String(row.description) : undefined,
  };
}

function getProductStocks(row: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(row.stocks) ? (row.stocks as Record<string, unknown>[]) : [];
}

function mapProduct(row: Record<string, unknown>): Product {
  const stocks = getProductStocks(row);
  const firstStock = stocks[0] ?? {};
  const stockCount = typeof row.stocks_sum_product_stock === "number"
    ? row.stocks_sum_product_stock
    : typeof row.productStock === "number"
      ? row.productStock
      : typeof row.stock === "number"
        ? row.stock
        : stocks.reduce((sum, stock) => sum + Number(stock.productStock ?? stock.stock ?? 0), 0);

  return {
    id: toId(row.id),
    name: String(row.productName ?? row.name ?? ""),
    code: String(row.productCode ?? row.code ?? `PRD-${toId(row.id)}`),
    categoryId: toId(row.category_id ?? row.categoryId ?? "") || undefined,
    brandId: toId(row.brand_id ?? row.brandId ?? "") || undefined,
    unitId: toId(row.unit_id ?? row.unitId ?? "") || undefined,
    price: Number(firstStock.productSalePrice ?? firstStock.salePrice ?? row.productSalePrice ?? row.salePrice ?? row.price ?? 0),
    costPrice: Number(firstStock.productPurchasePrice ?? firstStock.purchasePrice ?? row.productPurchasePrice ?? row.purchasePrice ?? row.costPrice ?? 0),
    retailPrice: Number(firstStock.productSalePrice ?? firstStock.salePrice ?? row.productSalePrice ?? row.retailPrice ?? row.price ?? 0),
    wholesalePrice: Number(firstStock.productWholeSalePrice ?? firstStock.wholesalePrice ?? row.productWholeSalePrice ?? row.wholesalePrice ?? row.price ?? 0),
    dealerPrice: Number(firstStock.productDealerPrice ?? firstStock.dealerPrice ?? row.productDealerPrice ?? row.dealerPrice ?? row.price ?? 0),
    stock: Number(stockCount ?? 0),
    alertQty: Number(row.alert_qty ?? row.alertQty ?? 10),
    expiryDate: firstStock.expire_date ? String(firstStock.expire_date) : undefined,
    image: row.productPicture ? String(row.productPicture) : row.image ? String(row.image) : undefined,
  };
}

function mapParty(row: Record<string, unknown>): Party {
  return {
    id: toId(row.id),
    name: String(row.name ?? ""),
    type: String(row.type ?? "Retailer") as Party["type"],
    due: Number(row.due ?? 0),
    avatar: row.image ? String(row.image) : undefined,
  };
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: toId(row.id),
    name: String(row.name ?? ""),
    phone: row.phone ? String(row.phone) : undefined,
    email: row.email ? String(row.email) : undefined,
    address: row.address ? String(row.address) : undefined,
    type: String(row.type ?? "Retailer") as Customer["type"],
    initialDue: Number(row.opening_balance ?? row.due ?? 0),
    due: Number(row.due ?? 0),
  };
}

function mapSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: toId(row.id),
    name: String(row.name ?? ""),
    phone: row.phone ? String(row.phone) : undefined,
    email: row.email ? String(row.email) : undefined,
    address: row.address ? String(row.address) : undefined,
    initialDue: Number(row.opening_balance ?? row.due ?? 0),
    due: Number(row.due ?? 0),
  };
}

function mapSaleItem(row: Record<string, unknown>) {
  const product = row.product as Record<string, unknown> | undefined;
  return {
    productId: toId(row.product_id ?? product?.id),
    name: String(product?.productName ?? row.product_name ?? "Item"),
    quantity: Number(row.quantities ?? 0),
    unitPrice: Number(row.price ?? 0),
    discount: Number(row.discount ?? 0),
  };
}

function mapSale(row: Record<string, unknown>): Sale {
  const party = row.party as Record<string, unknown> | undefined;
  const details = Array.isArray(row.details) ? (row.details as Record<string, unknown>[]) : [];
  const saleReturns = Array.isArray(row.sale_returns) ? row.sale_returns : Array.isArray(row.saleReturns) ? row.saleReturns : [];
  const due = Number(row.dueAmount ?? 0);

  return {
    id: toId(row.id),
    invoiceNo: String(row.invoiceNumber ?? row.invoiceNo ?? ""),
    date: String(row.saleDate ?? row.created_at ?? "").split(" ")[0],
    customerId: toId(row.party_id ?? party?.id),
    customerName: String(party?.name ?? "Walk-in Customer"),
    customerPhone: party?.phone ? String(party.phone) : undefined,
    items: details.map(mapSaleItem),
    subtotal: Number(row.actual_total_amount ?? row.totalAmount ?? 0),
    vat: Number(row.vat_amount ?? 0),
    vatPercent: Number(row.vat_percent ?? 0),
    discount: Number(row.discountAmount ?? 0),
    total: Number(row.totalAmount ?? 0),
    paid: Number(row.paidAmount ?? 0),
    due,
    change: Number(row.change_amount ?? 0),
    profit: Number(row.lossProfit ?? 0),
    status: due <= 0 ? "Paid" : Number(row.paidAmount ?? 0) > 0 ? "Partial" : "Due",
    returned: saleReturns.length > 0,
  };
}

function mapPurchaseItem(row: Record<string, unknown>) {
  const product = row.product as Record<string, unknown> | undefined;
  return {
    productId: toId(row.product_id ?? product?.id),
    name: String(product?.productName ?? row.product_name ?? "Item"),
    quantity: Number(row.quantities ?? 0),
    unitPrice: Number(row.productPurchasePrice ?? row.price ?? 0),
  };
}

function mapPurchase(row: Record<string, unknown>): Purchase {
  const party = row.party as Record<string, unknown> | undefined;
  const details = Array.isArray(row.details) ? (row.details as Record<string, unknown>[]) : [];
  const purchaseReturns = Array.isArray(row.purchase_returns) ? row.purchase_returns : Array.isArray(row.purchaseReturns) ? row.purchaseReturns : [];
  const due = Number(row.dueAmount ?? 0);

  return {
    id: toId(row.id),
    invoiceNo: String(row.invoiceNumber ?? row.invoiceNo ?? ""),
    date: String(row.purchaseDate ?? row.created_at ?? "").split(" ")[0],
    supplierId: toId(row.party_id ?? party?.id),
    supplierName: String(party?.name ?? "Supplier"),
    items: details.map(mapPurchaseItem),
    subtotal: Number(row.actual_total_amount ?? row.totalAmount ?? 0),
    discount: Number(row.discountAmount ?? 0),
    total: Number(row.totalAmount ?? 0),
    paid: Number(row.paidAmount ?? 0),
    due,
    status: due <= 0 ? "Paid" : Number(row.paidAmount ?? 0) > 0 ? "Partial" : "Due",
    returned: purchaseReturns.length > 0,
  };
}

function mapSaleReturn(row: Record<string, unknown>): SaleReturn {
  const sale = row.sale as Record<string, unknown> | undefined;
  const party = sale?.party as Record<string, unknown> | undefined;
  const details = Array.isArray(row.details) ? (row.details as Record<string, unknown>[]) : [];
  return {
    id: toId(row.id),
    saleId: toId(row.sale_id ?? sale?.id),
    invoiceNo: String(row.invoice_no ?? row.invoiceNo ?? ""),
    date: String(row.return_date ?? row.created_at ?? "").split(" ")[0],
    customerName: String(party?.name ?? "Customer"),
    items: details.map((item) => ({
      productId: toId(item.product_id),
      name: String((item.product as Record<string, unknown> | undefined)?.productName ?? "Item"),
      quantity: Number(item.return_qty ?? item.quantities ?? 0),
      unitPrice: Number(item.return_amount ?? item.price ?? 0),
      discount: 0,
    })),
    total: details.reduce((sum, item) => sum + Number(item.return_amount ?? 0), 0),
  };
}

function mapPurchaseReturn(row: Record<string, unknown>): PurchaseReturn {
  const purchase = row.purchase as Record<string, unknown> | undefined;
  const party = purchase?.party as Record<string, unknown> | undefined;
  const details = Array.isArray(row.details) ? (row.details as Record<string, unknown>[]) : [];
  return {
    id: toId(row.id),
    purchaseId: toId(row.purchase_id ?? purchase?.id),
    invoiceNo: String(row.invoice_no ?? row.invoiceNo ?? ""),
    date: String(row.return_date ?? row.created_at ?? "").split(" ")[0],
    supplierName: String(party?.name ?? "Supplier"),
    items: details.map((item) => ({
      productId: toId(item.product_id),
      name: String((item.product as Record<string, unknown> | undefined)?.productName ?? "Item"),
      quantity: Number(item.return_qty ?? item.quantities ?? 0),
      unitPrice: Number(item.return_amount ?? item.price ?? 0),
    })),
    total: details.reduce((sum, item) => sum + Number(item.return_amount ?? 0), 0),
  };
}

function mapExpenseCategory(row: Record<string, unknown>): ExpenseCategory {
  return {
    id: toId(row.id),
    name: String(row.categoryName ?? row.name ?? ""),
    description: row.categoryDescription ? String(row.categoryDescription) : undefined,
  };
}

function mapIncomeCategory(row: Record<string, unknown>): IncomeCategory {
  return {
    id: toId(row.id),
    name: String(row.categoryName ?? row.name ?? ""),
    description: row.categoryDescription ? String(row.categoryDescription) : undefined,
  };
}

function mapExpense(row: Record<string, unknown>): Expense {
  const category = row.category as Record<string, unknown> | undefined;
  const paymentType = row.payment_type as Record<string, unknown> | undefined;
  return {
    id: toId(row.id),
    date: String(row.expenseDate ?? row.created_at ?? "").split(" ")[0],
    categoryId: toId(row.expense_category_id ?? category?.id),
    categoryName: String(category?.categoryName ?? "Expense"),
    amount: Number(row.amount ?? 0),
    description: String(row.note ?? row.expanseFor ?? ""),
    paymentType: (String(paymentType?.name ?? row.paymentType ?? "Cash") as Expense["paymentType"]),
  };
}

function mapIncome(row: Record<string, unknown>): Income {
  const category = row.category as Record<string, unknown> | undefined;
  const paymentType = row.payment_type as Record<string, unknown> | undefined;
  return {
    id: toId(row.id),
    date: String(row.incomeDate ?? row.created_at ?? "").split(" ")[0],
    categoryId: toId(row.income_category_id ?? category?.id),
    categoryName: String(category?.categoryName ?? "Income"),
    amount: Number(row.amount ?? 0),
    description: String(row.note ?? row.incomeFor ?? ""),
    paymentType: (String(paymentType?.name ?? row.paymentType ?? "Cash") as Income["paymentType"]),
  };
}

export async function syncLiveBusinessData(): Promise<void> {
  const isOnline = store.getBusinessProfile().isOnline;
  if (!isOnline) {
    setSyncStatus("offline");
    return;
  }

  setSyncStatus("syncing");

  try {
    const profile = await apiGetProfile();
    setCurrentRole(profile.role || "staff");
  } catch {
    // Keep previously known local role if profile endpoint fails.
  }

  const tasks = await Promise.allSettled([
    apiGet<unknown>("/categories"),
    apiGet<unknown>("/brands"),
    apiGet<unknown>("/products"),
    apiGet<unknown>("/parties"),
    apiGet<unknown>("/sales"),
    apiGet<unknown>("/purchase"),
    apiGet<unknown>("/sales-return"),
    apiGet<unknown>("/purchases-return"),
    apiGet<unknown>("/expense-categories"),
    apiGet<unknown>("/expenses"),
    apiGet<unknown>("/income-categories"),
    apiGet<unknown>("/incomes"),
  ]);

  const [
    categoriesRes,
    brandsRes,
    productsRes,
    partiesRes,
    salesRes,
    purchasesRes,
    saleReturnsRes,
    purchaseReturnsRes,
    expenseCategoriesRes,
    expensesRes,
    incomeCategoriesRes,
    incomesRes,
  ] = tasks;

  if (categoriesRes.status === "fulfilled") {
    store.saveCategories(asArray<Record<string, unknown>>(categoriesRes.value).map(mapCategory));
  }

  if (brandsRes.status === "fulfilled") {
    store.saveBrands(asArray<Record<string, unknown>>(brandsRes.value).map(mapBrand));
  }

  if (productsRes.status === "fulfilled") {
    store.saveProducts(asArray<Record<string, unknown>>(productsRes.value).map(mapProduct));
  }

  if (partiesRes.status === "fulfilled") {
    const parties = asArray<Record<string, unknown>>(partiesRes.value);
    store.saveParties(parties.map(mapParty));
    store.saveCustomers(parties.filter((p) => String(p.type) !== "Supplier").map(mapCustomer));
    store.saveSuppliers(parties.filter((p) => String(p.type) === "Supplier").map(mapSupplier));
  }

  if (salesRes.status === "fulfilled") {
    store.saveSales(asArray<Record<string, unknown>>(salesRes.value).map(mapSale));
  }

  if (purchasesRes.status === "fulfilled") {
    store.savePurchases(asArray<Record<string, unknown>>(purchasesRes.value).map(mapPurchase));
  }

  if (saleReturnsRes.status === "fulfilled") {
    store.saveSaleReturns(asArray<Record<string, unknown>>(saleReturnsRes.value).map(mapSaleReturn));
  }

  if (purchaseReturnsRes.status === "fulfilled") {
    store.savePurchaseReturns(asArray<Record<string, unknown>>(purchaseReturnsRes.value).map(mapPurchaseReturn));
  }

  if (expenseCategoriesRes.status === "fulfilled") {
    store.saveExpenseCategories(asArray<Record<string, unknown>>(expenseCategoriesRes.value).map(mapExpenseCategory));
  }

  if (expensesRes.status === "fulfilled") {
    store.saveExpenses(asArray<Record<string, unknown>>(expensesRes.value).map(mapExpense));
  }

  if (incomeCategoriesRes.status === "fulfilled") {
    store.saveIncomeCategories(asArray<Record<string, unknown>>(incomeCategoriesRes.value).map(mapIncomeCategory));
  }

  if (incomesRes.status === "fulfilled") {
    store.saveIncomes(asArray<Record<string, unknown>>(incomesRes.value).map(mapIncome));
  }

  const hasSuccessfulTask = tasks.some((task) => task.status === "fulfilled");
  setSyncStatus(hasSuccessfulTask ? "live" : "fallback");
}
