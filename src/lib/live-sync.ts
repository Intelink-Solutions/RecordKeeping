import { apiGet, apiGetWeb, apiGetProfile, tokenStorage } from "@/lib/api";
import { flushOfflineQueue } from "@/lib/offline-queue";
import { setCurrentRole, setVisibility } from "@/lib/permissions";
import { setSyncStatus } from "@/lib/sync-status";
import { emitStoreUpdate } from "@/hooks/use-live-data";
import {
  store,
  Brand,
  Branch,
  BranchRole,
  Category,
  Customer,
  Expense,
  ExpenseCategory,
  Income,
  IncomeCategory,
  Product,
  Unit,
  Purchase,
  PurchaseReturn,
  Sale,
  SaleReturn,
  Supplier,
  Party,
  Attendance,
  Payroll,
  Leave,
  Warehouse,
  Transfer,
  DuePayment,
} from "@/lib/store";

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;

  // { data: [...] }
  if (Array.isArray(obj.data)) return obj.data as T[];

  // { data: { data: [...] } }  — standard Laravel paginator
  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) return nested.data as T[];
  }

  // { products: [...] } / { items: [...] } / { result: [...] } / { results: [...] }
  for (const key of ["products", "categories", "brands", "parties",
    "customers", "suppliers", "sales", "purchases",
    "expenses", "incomes", "items", "result", "results", "list"]) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }

  // { status: true/false, data: ... }  — some backends wrap success status
  if ("status" in obj && obj.data !== undefined) {
    if (typeof obj.data === "object" && !Array.isArray(obj.data)) {
      const inner = obj.data as Record<string, unknown>;
      if (Array.isArray(inner.data)) return inner.data as T[];
      for (const key of ["products", "items", "result", "results", "list"]) {
        if (Array.isArray(inner[key])) return inner[key] as T[];
      }
    }
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

function mapUnit(row: Record<string, unknown>): Unit {
  return {
    id: toId(row.id),
    name: String(row.unitName ?? row.name ?? "Unit"),
    shortName: String(row.unitCode ?? row.shortName ?? row.short_name ?? row.code ?? "u"),
  };
}

function getProductStocks(row: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(row.stocks)) return row.stocks as Record<string, unknown>[];
  if (row.stocks && typeof row.stocks === "object") {
    const stocksObj = row.stocks as Record<string, unknown>;
    if (Array.isArray(stocksObj.data)) return stocksObj.data as Record<string, unknown>[];
  }
  if (Array.isArray(row.stock)) return row.stock as Record<string, unknown>[];
  return [];
}

function mapProduct(row: Record<string, unknown>): Product {
  const stocks = getProductStocks(row);
  const firstStock = stocks[0] ?? {};

  function toNumber(value: unknown): number {
    if (value === null || value === undefined || value === "") return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  // Stock count: prefer aggregate sum, then root fields, then sum stocks manually
  const stockCount =
    typeof row.stocks_sum_product_stock === "number" ? row.stocks_sum_product_stock
    : typeof row.stocks_sum_product_stock === "string" ? Number(row.stocks_sum_product_stock)
    : typeof row.productStock === "number" ? row.productStock
    : typeof row.productStock === "string" ? Number(row.productStock)
    : typeof row.product_stock === "number" ? row.product_stock
    : typeof row.product_stock === "string" ? Number(row.product_stock)
    : typeof row.stock === "number" ? row.stock
    : typeof row.stock === "string" ? Number(row.stock)
    : typeof row.qty === "number" ? row.qty
    : typeof row.qty === "string" ? Number(row.qty)
    : typeof row.total_stock === "number" ? row.total_stock
    : typeof row.total_stock === "string" ? Number(row.total_stock)
    : stocks.reduce((sum, s) => sum + toNumber(s.productStock ?? s.product_stock ?? s.stock ?? s.qty ?? 0), 0);

  // Price helpers: check stock row first, then root fields, then fallback
  function pickPrice(...keys: (string | undefined)[]): number {
    for (const key of keys) {
      if (!key) continue;
      const fromStock = firstStock[key];
      if (fromStock !== undefined && fromStock !== null && Number(fromStock) !== 0) return Number(fromStock);
      const fromRow = row[key];
      if (fromRow !== undefined && fromRow !== null && Number(fromRow) !== 0) return Number(fromRow);
    }
    return 0;
  }

  const salePrice = pickPrice("productSalePrice", "salePrice", "sale_price", "inclusive_price", "exclusive_price", "price", "selling_price", "retail_price");
  const costPrice = pickPrice("productPurchasePrice", "purchasePrice", "purchase_price", "costPrice", "cost_price", "buying_price", "exclusive_price", "inclusive_price");
  const wholesalePrice = pickPrice("productWholeSalePrice", "productWholesalePrice", "wholesalePrice", "wholesale_price") || salePrice;
  const dealerPrice = pickPrice("productDealerPrice", "dealerPrice", "dealer_price") || salePrice;
  const retailPrice = pickPrice("productRetailPrice", "retailPrice", "retail_price", "productSalePrice", "sale_price") || salePrice;

  return {
    id: toId(row.id),
    name: String(row.productName ?? row.product_name ?? row.name ?? ""),
    code: String(row.productCode ?? row.product_code ?? row.code ?? `PRD-${toId(row.id)}`),
    branchId: row.branch_id ? toId(row.branch_id) : undefined,
    categoryId: toId(row.category_id ?? row.categoryId ?? "") || undefined,
    brandId: toId(row.brand_id ?? row.brandId ?? "") || undefined,
    unitId: toId(row.unit_id ?? row.unitId ?? "") || undefined,
    vatId: toId(row.vat_id ?? row.vatId ?? "") || undefined,
    stockId: firstStock.id ? toId(firstStock.id) : undefined,
    price: salePrice,
    costPrice,
    retailPrice,
    wholesalePrice,
    dealerPrice,
    stock: Number(stockCount ?? 0),
    alertQty: Number(row.alert_qty ?? row.alertQty ?? row.alert_quantity ?? 10),
    profitMargin: toNumber(row.profit_percent ?? row.profitMargin ?? firstStock.profit_percent ?? 0),
    manufacturer: row.productManufacturer ? String(row.productManufacturer) : row.manufacturer ? String(row.manufacturer) : undefined,
    expiryDate: firstStock.expire_date ? String(firstStock.expire_date) : row.expire_date ? String(row.expire_date) : undefined,
    image: (() => {
      const img = row.productPicture ?? row.product_picture ?? row.picture ?? row.image ?? undefined;
      return img ? String(img) : undefined;
    })(),
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
    stockId: toId(row.stock_id) || undefined,
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
    branchId: row.branch_id != null ? toId(row.branch_id) : undefined,
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

function mapDuePayment(row: Record<string, unknown>): DuePayment {
  const party = row.party as Record<string, unknown> | undefined;
  const payments = Array.isArray(row.payments) ? (row.payments as Record<string, unknown>[]) : [];

  return {
    id: toId(row.id),
    partyId: toId(row.party_id ?? party?.id),
    partyName: String(party?.name ?? row.partyName ?? "Party"),
    partyType: String(party?.type ?? row.partyType ?? "") === "Supplier" ? "Supplier" : "Customer",
    amount: Number(row.payDueAmount ?? row.amount ?? row.paidAmount ?? 0),
    date: String(row.paymentDate ?? row.created_at ?? "").split(" ")[0],
    paymentType: payments[0]?.type ? String(payments[0].type) : row.paymentType ? String(row.paymentType) : undefined,
    note: row.note ? String(row.note) : undefined,
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

function mapAttendance(row: Record<string, unknown>): Attendance {
  const employee = row.employee as Record<string, unknown> | undefined;
  return {
    id: toId(row.id),
    employeeId: toId(row.employee_id ?? employee?.id),
    employeeName: String(employee?.name ?? row.employee_name ?? ""),
    date: String(row.date ?? row.attendance_date ?? row.created_at ?? "").split(" ")[0],
    checkIn: String(row.check_in ?? row.checkIn ?? row.in_time ?? ""),
    checkOut: String(row.check_out ?? row.checkOut ?? row.out_time ?? ""),
    status: (() => {
      const s = String(row.status ?? "Present").toLowerCase();
      if (s === "late") return "Late";
      if (s === "absent") return "Absent";
      return "Present";
    })(),
  };
}

function mapPayroll(row: Record<string, unknown>): Payroll {
  const employee = row.employee as Record<string, unknown> | undefined;
  return {
    id: toId(row.id),
    employeeId: toId(row.employee_id ?? employee?.id),
    employeeName: String(employee?.name ?? row.employee_name ?? ""),
    month: String(row.month ?? row.salary_month ?? ""),
    basicSalary: Number(row.basic_salary ?? row.basicSalary ?? 0),
    bonus: Number(row.bonus ?? 0),
    deduction: Number(row.deduction ?? 0),
    netSalary: Number(row.net_salary ?? row.netSalary ?? row.total_salary ?? 0),
    status: String(row.status ?? "").toLowerCase() === "paid" ? "Paid" : "Unpaid",
    paidDate: row.paid_date ? String(row.paid_date) : undefined,
  };
}

function mapLeave(row: Record<string, unknown>): Leave {
  const employee = row.employee as Record<string, unknown> | undefined;
  const leaveType = row.leave_type as Record<string, unknown> | undefined;
  return {
    id: toId(row.id),
    employeeId: toId(row.employee_id ?? employee?.id),
    employeeName: String(employee?.name ?? row.employee_name ?? ""),
    departmentName: employee?.department ? String((employee.department as Record<string, unknown>)?.name ?? "") : undefined,
    leaveTypeId: toId(row.leave_type_id ?? leaveType?.id),
    leaveTypeName: String(leaveType?.name ?? row.leave_type_name ?? ""),
    startDate: String(row.start_date ?? row.from_date ?? "").split(" ")[0],
    endDate: String(row.end_date ?? row.to_date ?? "").split(" ")[0],
    reason: String(row.reason ?? row.note ?? ""),
    status: (() => {
      const s = String(row.status ?? "Pending").toLowerCase();
      if (s === "approved") return "Approved";
      if (s === "rejected") return "Rejected";
      return "Pending";
    })(),
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

function mapStatusField(s: unknown): "Active" | "Inactive" {
  if (s === 0 || s === "0" || s === false ||
      (typeof s === "string" && s.toLowerCase() === "inactive")) return "Inactive";
  return "Active";
}

function mapBranch(row: Record<string, unknown>): Branch {
  return {
    id: toId(row.id),
    name: String(row.name ?? row.branch_name ?? ""),
    address: row.address ? String(row.address) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    email: row.email ? String(row.email) : undefined,
    status: mapStatusField(row.status),
  };
}

function mapWarehouse(row: Record<string, unknown>): Warehouse {
  const branch = row.branch as Record<string, unknown> | undefined;
  return {
    id: toId(row.id),
    name: String(row.name ?? row.warehouse_name ?? ""),
    branchId: row.branch_id ? toId(row.branch_id) : undefined,
    branchName: branch?.name ? String(branch.name) : undefined,
    address: row.address ? String(row.address) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    status: mapStatusField(row.status),
  };
}

function mapBranchRole(row: Record<string, unknown>): BranchRole {
  return {
    id: toId(row.id),
    name: String(row.name ?? row.role_name ?? ""),
    description: row.description ? String(row.description) : undefined,
    permissions: row.permissions ? String(row.permissions) : undefined,
    status: mapStatusField(row.status),
  };
}

function mapTransfer(row: Record<string, unknown>): Transfer {
  const fromBranch = row.from_branch as Record<string, unknown> | undefined;
  const toBranch   = row.to_branch   as Record<string, unknown> | undefined;
  const fromWh     = row.from_warehouse as Record<string, unknown> | undefined;
  const toWh       = row.to_warehouse   as Record<string, unknown> | undefined;
  // The API returns line items under `transfer_products`, not `products` —
  // confirmed against the live backend's TransferController response shape.
  const productsRaw = Array.isArray(row.transfer_products)
    ? (row.transfer_products as Record<string, unknown>[])
    : Array.isArray(row.products) ? (row.products as Record<string, unknown>[]) : [];
  return {
    id: toId(row.id),
    invoiceNo: row.invoice_no ? String(row.invoice_no) : undefined,
    fromBranchId: toId(row.from_branch_id ?? ""),
    fromBranchName: fromBranch?.name ? String(fromBranch.name) : undefined,
    toBranchId: toId(row.to_branch_id ?? ""),
    toBranchName: toBranch?.name ? String(toBranch.name) : undefined,
    fromWarehouseId: row.from_warehouse_id ? toId(row.from_warehouse_id) : undefined,
    fromWarehouseName: fromWh?.name ? String(fromWh.name) : undefined,
    toWarehouseId: row.to_warehouse_id ? toId(row.to_warehouse_id) : undefined,
    toWarehouseName: toWh?.name ? String(toWh.name) : undefined,
    transferDate: row.transfer_date ? String(row.transfer_date) : new Date().toISOString().split("T")[0],
    note: row.note ? String(row.note) : undefined,
    shippingCharge: row.shipping_charge != null ? Number(row.shipping_charge) : undefined,
    status: (String(row.status ?? "pending")) as Transfer["status"],
    products: productsRaw.map((p) => {
      const prod = p.product as Record<string, unknown> | undefined;
      return {
        // p.id is the transfer_products junction row's own id — the actual
        // stock reference is p.stock_id and must be checked first.
        stockId: toId(p.stock_id ?? p.id ?? ""),
        productId: toId(p.product_id ?? ""),
        productName: String(prod?.productName ?? prod?.name ?? p.product_name ?? ""),
        quantity: Number(p.quantity ?? 0),
        unitPrice: Number(p.unit_price ?? 0) || undefined,
      };
    }),
  };
}

// Remember which URL variant succeeded for each resource label so subsequent
// syncs skip the fallback chain and go straight to the working endpoint.
const winningUrl = new Map<string, string>();
let lastSyncAt = 0;
const MIN_SYNC_INTERVAL_MS = 25_000;

export async function syncLiveBusinessData(): Promise<void> {
  // Skip entirely when using an offline/demo session — no real token to send
  if (tokenStorage.isOffline() || !tokenStorage.get()) {
    setSyncStatus("offline");
    return;
  }

  const isOnline = store.getBusinessProfile().isOnline;
  if (!isOnline) {
    setSyncStatus("offline");
    return;
  }

  // Replay any mutations that were queued while offline, before re-fetching data
  flushOfflineQueue().catch(() => {/* silent */});

  const now = Date.now();
  if (now - lastSyncAt < MIN_SYNC_INTERVAL_MS) return;
  lastSyncAt = now;

  setSyncStatus("syncing");

  try { await _runSync(); } catch { /* all errors are absorbed — local data stays intact */ }
}

/**
 * Force an immediate full sync regardless of the debounce interval.
 * Call this whenever the active branch changes so data refreshes instantly.
 */
export async function forceSyncLiveBusinessData(): Promise<void> {
  lastSyncAt = 0; // bypass debounce
  return syncLiveBusinessData();
}

// Inner function contains all the actual sync work.
// Errors escape to the outer wrapper which silently discards them.
async function _runSync(): Promise<void> {
  try {
    const profile = await apiGetProfile();
    setCurrentRole(profile.role || "staff");
    setVisibility(profile.visibility);
    if (profile.id) store.setCurrentUserId(profile.id);
  } catch {
    // Keep previously known local role if profile endpoint fails.
  }

  // Prefer business-scoped endpoints first, then fall back to legacy routes.
  // On the first call all variants are tried; winning URL is cached for speed.
  async function fetchFirstSuccessful(label: string, variants: string[], requireNonEmpty = false): Promise<unknown | null> {
    const cached = winningUrl.get(label);
    const orderedVariants = cached
      ? [cached, ...variants.filter((v) => v !== cached)]
      : variants;

    for (const path of orderedVariants) {
      try {
        const raw = path.startsWith("/business/")
          ? await apiGetWeb<unknown>(path)
          : await apiGet<unknown>(path);
        const rows = asArray<Record<string, unknown>>(raw);
        if (requireNonEmpty && rows.length === 0) {
          continue;
        }
        winningUrl.set(label, path);
        return raw;
      } catch {
        // Try next variant.
      }
    }
    return null;
  }

  const activeBranchId = store.getActiveBranchId();
  const bq = activeBranchId ? `?branch_id=${activeBranchId}&per_page=500` : "?per_page=500";
  const bqOnly = activeBranchId ? `?branch_id=${activeBranchId}` : "";

  // Parties already returns both customers and suppliers (filtered by `type`
  // further down), so it's fetched first and awaited on its own. The dedicated
  // /customers and /suppliers endpoints only exist as a fallback for backends
  // that don't expose /parties — firing them unconditionally in parallel with
  // everything else meant every sync made 4-8 requests that were guaranteed to
  // 404/CORS-fail and then get their result thrown away, on every page load.
  const partiesPayload = await fetchFirstSuccessful("parties", [
    "/parties?per_page=500",
    "/parties",
    "/business/parties?per_page=500",
    "/business/parties",
  ]);

  const [
    productsPayload,
    categoriesPayload,
    brandsPayload,
    unitsPayload,
    vatsPayload,
    customersPayload,
    suppliersPayload,
    purchasesPayload,
    tasks,
  ] = await Promise.all([
    fetchFirstSuccessful("products", [
      `/products${bq}`,
      `/products?paginate=false${activeBranchId ? `&branch_id=${activeBranchId}` : ""}`,
      `/products?include=stocks&per_page=500${activeBranchId ? `&branch_id=${activeBranchId}` : ""}`,
      `/products?with_stocks=1&per_page=500${activeBranchId ? `&branch_id=${activeBranchId}` : ""}`,
      `/products${bqOnly}`,
      "/products",
    ], true),
    fetchFirstSuccessful("categories", [
      "/categories?per_page=500",
      "/categories",
      "/business/categories?per_page=500",
      "/business/categories",
    ]),
    fetchFirstSuccessful("brands", [
      "/brands?per_page=500",
      "/brands",
      "/business/brands?per_page=500",
      "/business/brands",
    ]),
    fetchFirstSuccessful("units", [
      "/units?per_page=500",
      "/units",
      "/business/units?per_page=500",
      "/business/units",
    ]),
    fetchFirstSuccessful("vats", [
      "/vats?per_page=500",
      "/vats",
    ]),
    partiesPayload !== null ? Promise.resolve(null) : fetchFirstSuccessful("customers", [
      "/customers?per_page=500",
      "/customers",
      "/business/customers?per_page=500",
      "/business/customers",
    ]),
    partiesPayload !== null ? Promise.resolve(null) : fetchFirstSuccessful("suppliers", [
      "/suppliers?per_page=500",
      "/suppliers",
      "/business/suppliers?per_page=500",
      "/business/suppliers",
    ]),
    fetchFirstSuccessful("purchases", [
      // Backend only registers the singular `/purchase` apiResource — plural
      // is tried first here only as a defensive fallback for other deployments.
      "/purchase?per_page=500",
      "/purchases?per_page=500",
      "/purchase",
      "/purchases",
      "/business/purchases?per_page=500",
      "/business/purchase?per_page=500",
      "/business/purchases",
      "/business/purchase",
    ]),
    Promise.allSettled([
      apiGet<unknown>("/sales"),
      apiGet<unknown>("/sales-return"),
      apiGet<unknown>("/purchases-return"),
      apiGet<unknown>("/expense-categories"),
      apiGet<unknown>("/expenses"),
      apiGet<unknown>("/income-categories"),
      apiGet<unknown>("/incomes"),
      apiGet<unknown>("/hrm/attendances?per_page=500"),
      apiGet<unknown>("/hrm/payrolls?per_page=500"),
      apiGet<unknown>("/hrm/leaves?per_page=500"),
      fetchFirstSuccessful("branches", ["/branches", "/hrm/branches", "/multibranch/branches", "/business/branches"]),
      fetchFirstSuccessful("warehouses", ["/warehouses", "/hrm/warehouses", "/multibranch/warehouses", "/business/warehouses"]),
      fetchFirstSuccessful("branch-roles", ["/branch-roles", "/multibranch/roles", "/multibranch/branch-roles", "/hrm/branch-roles", "/roles"]),
      apiGet<unknown>("/transfers"),
      apiGet<unknown>("/dues"),
    ]),
  ]);

  const [
    salesRes,
    saleReturnsRes,
    purchaseReturnsRes,
    expenseCategoriesRes,
    expensesRes,
    incomeCategoriesRes,
    incomesRes,
    attendancesRes,
    payrollsRes,
    leavesRes,
    branchesRes,
    warehousesRes,
    branchRolesRes,
    transfersRes,
    duesRes,
  ] = tasks;

  if (categoriesPayload !== null) {
    store.saveCategories(asArray<Record<string, unknown>>(categoriesPayload).map(mapCategory));
  }

  if (brandsPayload !== null) {
    store.saveBrands(asArray<Record<string, unknown>>(brandsPayload).map(mapBrand));
  }

  if (unitsPayload !== null) {
    store.saveUnits(asArray<Record<string, unknown>>(unitsPayload).map(mapUnit));
  }

  if (vatsPayload !== null) {
    const vatRows = asArray<Record<string, unknown>>(vatsPayload).map((row) => ({
      id: toId(row.id),
      name: String(row.name ?? row.vatName ?? "VAT"),
      rate: Number(row.rate ?? 0),
      status: (String(row.status ?? "Active") === "1" || String(row.status ?? "").toLowerCase() === "active" ? "Active" : "Inactive") as "Active" | "Inactive",
    }));
    if (vatRows.length) store.saveVatRates(vatRows);
  }

  if (productsPayload !== null) {
    const mappedProducts = asArray<Record<string, unknown>>(productsPayload).map(mapProduct);
    // Tag each product with the active branch if the backend didn't include branch_id per row
    if (activeBranchId) {
      mappedProducts.forEach((p) => { if (!p.branchId) p.branchId = activeBranchId; });
    }
    store.saveProducts(mappedProducts);
  }

  if (partiesPayload !== null) {
    const parties = asArray<Record<string, unknown>>(partiesPayload);
    store.saveParties(parties.map(mapParty));
    store.saveCustomers(parties.filter((p) => String(p.type) !== "Supplier").map(mapCustomer));
    store.saveSuppliers(parties.filter((p) => String(p.type) === "Supplier").map(mapSupplier));
  } else {
    const customerRows = customersPayload ? asArray<Record<string, unknown>>(customersPayload) : [];
    const supplierRows = suppliersPayload ? asArray<Record<string, unknown>>(suppliersPayload) : [];

    if (customersPayload !== null) {
      store.saveCustomers(customerRows.map(mapCustomer));
    }

    if (suppliersPayload !== null) {
      store.saveSuppliers(supplierRows.map(mapSupplier));
    }

    if (customerRows.length || supplierRows.length) {
      store.saveParties([
        ...customerRows.map((row) => mapParty({ ...row, type: row.type ?? "Retailer" })),
        ...supplierRows.map((row) => mapParty({ ...row, type: "Supplier" })),
      ]);
    }
  }

  if (salesRes.status === "fulfilled") {
    store.saveSales(asArray<Record<string, unknown>>(salesRes.value).map(mapSale));
  }

  if (purchasesPayload !== null) {
    const mappedPurchases = asArray<Record<string, unknown>>(purchasesPayload).map(mapPurchase);
    if (activeBranchId) {
      mappedPurchases.forEach((p) => { if (!p.branchId) p.branchId = activeBranchId; });
    }
    store.savePurchases(mappedPurchases);
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

  if (attendancesRes.status === "fulfilled") {
    store.saveAttendance(asArray<Record<string, unknown>>(attendancesRes.value).map(mapAttendance));
  }

  if (payrollsRes.status === "fulfilled") {
    store.savePayroll(asArray<Record<string, unknown>>(payrollsRes.value).map(mapPayroll));
  }

  if (leavesRes.status === "fulfilled") {
    store.saveLeaves(asArray<Record<string, unknown>>(leavesRes.value).map(mapLeave));
  }

  if (branchesRes.status === "fulfilled" && branchesRes.value !== null) {
    const rows = asArray<Record<string, unknown>>(branchesRes.value);
    if (rows.length > 0) store.saveBranches(rows.map(mapBranch));
  }

  if (warehousesRes.status === "fulfilled" && warehousesRes.value !== null) {
    const rows = asArray<Record<string, unknown>>(warehousesRes.value);
    if (rows.length > 0) store.saveWarehouses(rows.map(mapWarehouse));
  }

  if (branchRolesRes.status === "fulfilled" && branchRolesRes.value !== null) {
    const rows = asArray<Record<string, unknown>>(branchRolesRes.value);
    if (rows.length > 0) store.saveBranchRoles(rows.map(mapBranchRole));
  }

  if (transfersRes.status === "fulfilled" && transfersRes.value !== null) {
    const rows = asArray<Record<string, unknown>>(transfersRes.value);
    if (rows.length > 0) {
      const mapped = rows.map(mapTransfer);

      // Capture "previously known" pending-incoming ids BEFORE overwriting the
      // store below — reading after the save would compare the new list
      // against itself and never detect anything as newly arrived.
      const effectiveBranchId = store.getEffectiveBranchId();
      const prevIds = new Set(
        (store.getTransfers() ?? [])
          .filter((t) => t.status === "pending" && t.toBranchId === effectiveBranchId)
          .map((t) => t.id)
      );

      // Persist to local store so offline pages (e.g. Home's incoming-transfer
      // banner) can read them. Deliberately NOT written to
      // "pos_transfers_cache" — that key belongs to Transfers.tsx's own fetch,
      // which uses a differently-shaped TransferListItem; writing this
      // Transfer-shaped data there caused mismatched/garbled product lines to
      // flash before the page's own fetch overwrote it.
      store.saveTransfers(mapped);

      // Notify user of newly arrived pending incoming transfers
      if (effectiveBranchId) {
        const newIncoming = mapped.filter(
          (t) => t.status === "pending" && t.toBranchId === effectiveBranchId && !prevIds.has(t.id)
        );
        if (newIncoming.length > 0) {
          const existing = store.getNotifications();
          const newNotes = newIncoming.map((t) => ({
            id: crypto.randomUUID(),
            title: "Incoming stock transfer",
            message: `Transfer from ${t.fromBranchName || t.fromWarehouseName || "another branch"} is awaiting your acceptance.`,
            createdAt: new Date().toISOString(),
            type: "info" as const,
            read: false,
          }));
          // Avoid duplicating notifications on repeated syncs (match by message)
          const existingMessages = new Set(existing.map((n) => n.message));
          const unique = newNotes.filter((n) => !existingMessages.has(n.message));
          if (unique.length > 0) store.saveNotifications([...unique, ...existing]);
        }
      }
    }
  }

  if (duesRes.status === "fulfilled") {
    store.saveDuePayments(asArray<Record<string, unknown>>(duesRes.value).map(mapDuePayment));
  }

  const hasSuccessfulTask = [
    productsPayload,
    categoriesPayload,
    brandsPayload,
    unitsPayload,
    partiesPayload,
    customersPayload,
    suppliersPayload,
    purchasesPayload,
  ].some((payload) => payload !== null) || tasks.some((task) => task.status === "fulfilled");
  setSyncStatus(hasSuccessfulTask ? "live" : "fallback");

  // Notify all pages to auto-refresh their data
  emitStoreUpdate();
}

