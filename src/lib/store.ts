import { applyDynamicBranding } from "@/lib/app-branding";
import { getImageUrl } from "@/lib/image-utils";

/** Display label for a payment status. Stored/compared values stay "Due" so
 * they keep matching existing synced data and API responses — only what's
 * shown to the user reads "Debt". */
export function paymentStatusLabel(status: "Paid" | "Due" | "Partial" | string): string {
  return status === "Due" ? "Debt" : status;
}

// ===== Data Models =====

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface Unit {
  id: string;
  name: string;
  shortName: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  branchId?: string;
  categoryId?: string;
  brandId?: string;
  unitId?: string;
  vatId?: string;
  stockId?: string;
  price: number;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  dealerPrice: number;
  stock: number;
  alertQty: number;
  profitMargin?: number;
  manufacturer?: string;
  expiryDate?: string;
  image?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  type: "Retailer" | "Wholesaler" | "Dealer";
  initialDue: number;
  due: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  initialDue: number;
  due: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  stockId?: string;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  branchId?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  vat: number;
  vatPercent: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  change: number;
  profit: number;
  status: "Paid" | "Due" | "Partial";
  returned: boolean;
}

export interface SaleReturn {
  id: string;
  saleId: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  items: SaleItem[];
  total: number;
}

/** A single debt-collection event (a payment recorded against a customer's
 * or supplier's outstanding balance via PayDueDialog / POST /dues). */
export interface DuePayment {
  id: string;
  partyId: string;
  partyName: string;
  partyType: "Customer" | "Supplier";
  amount: number;
  date: string;
  paymentType?: string;
  note?: string;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Purchase {
  id: string;
  invoiceNo: string;
  date: string;
  branchId?: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  status: "Paid" | "Due" | "Partial";
  returned: boolean;
}

export interface PurchaseReturn {
  id: string;
  purchaseId: string;
  invoiceNo: string;
  date: string;
  supplierName: string;
  items: PurchaseItem[];
  total: number;
}

export interface Expense {
  id: string;
  date: string;
  branchId?: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  description: string;
  paymentType: "Cash" | "Bank" | "Cheque";
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Income {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  description: string;
  paymentType: "Cash" | "Bank" | "Cheque";
}

export interface IncomeCategory {
  id: string;
  name: string;
  description?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNo: string;
  balance: number;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  status: "Active" | "Inactive";
}

export interface Designation {
  id: string;
  name: string;
  description?: string;
  status: "Active" | "Inactive";
}

export interface Shift {
  id: string;
  name: string;
  breakStatus: "Yes" | "No";
  startTime: string;
  endTime: string;
  startBreakTime?: string;
  endBreakTime?: string;
  status: "Active" | "Inactive";
}

export interface Employee {
  id: string;
  name: string;
  designationId: string;
  departmentId: string;
  shiftId: string;
  gender?: string;
  birthDate?: string;
  email?: string;
  country?: string;
  phone?: string;
  salary: number;
  joinDate: string;
  status: "Active" | "Inactive";
  image?: string;
}

export interface LeaveType {
  id: string;
  name: string;
  days: number;
  status: "Active" | "Inactive";
}

export interface Leave {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName?: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: "Present" | "Absent" | "Late";
}

export interface Payroll {
  id: string;
  employeeId: string;
  employeeName?: string;
  paymentYear: number;
  month: string;
  date: string;
  amount: number;
  paymentType: string;
  note?: string;
}

export interface VatRate {
  id: string;
  name: string;
  rate: number;
  status: "Active" | "Inactive";
}

export interface BusinessProfile {
  companyName: string;
  /** Compact name used for the app wordmark/browser tab title once the shop
   * owner completes the first-login setup wizard; falls back to the generic
   * "RecordKEEPING" brand name when empty. Device-local only (not synced to
   * the backend), same as `darkMode`. */
  shortName: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  currency: string;
  currencyCode?: string;
  currencyPosition?: "before" | "after";
  darkMode: boolean;
  isOnline: boolean;
  /** The backend's numeric business id (from GET /business `data.id`).
   * Required to save changes — the backend's update route is
   * PUT /business/{id}, not PUT /business. */
  businessId?: number;
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  avatar?: string;
  bio: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type: "info" | "success" | "warning";
  read: boolean;
}

// Party type (legacy compat)
export interface Party {
  id: string;
  name: string;
  type: "Dealer" | "Retailer" | "Wholesaler" | "Supplier";
  due: number;
  avatar?: string;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  branchOpeningBalance?: number;
  description?: string;
  status: "Active" | "Inactive";
}

export interface Warehouse {
  id: string;
  name: string;
  branchId?: string;
  branchName?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: "Active" | "Inactive";
}

export interface TransferProductLine {
  stockId: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice?: number;
}

export interface Transfer {
  id: string;
  invoiceNo?: string;
  fromBranchId: string;
  fromBranchName?: string;
  toBranchId: string;
  toBranchName?: string;
  fromWarehouseId?: string;
  fromWarehouseName?: string;
  toWarehouseId?: string;
  toWarehouseName?: string;
  transferDate: string;
  note?: string;
  shippingCharge?: number;
  status: "pending" | "completed" | "cancelled";
  products?: TransferProductLine[];
}

export interface BranchRole {
  id: string;
  name: string;
  description?: string;
  permissions?: string;
  status: "Active" | "Inactive";
}

// ===== Storage Keys =====
const KEYS = {
  currentUserId: "pos_current_user_id",
  products: "pos_products",
  categories: "pos_categories",
  brands: "pos_brands",
  units: "pos_units",
  customers: "pos_customers",
  suppliers: "pos_suppliers",
  sales: "pos_sales",
  saleReturns: "pos_sale_returns",
  purchases: "pos_purchases",
  purchaseReturns: "pos_purchase_returns",
  expenses: "pos_expenses",
  expenseCategories: "pos_expense_categories",
  incomes: "pos_incomes",
  incomeCategories: "pos_income_categories",
  bankAccounts: "pos_bank_accounts",
  departments: "pos_departments",
  designations: "pos_designations",
  shifts: "pos_shifts",
  employees: "pos_employees",
  leaveTypes: "pos_leave_types",
  leaves: "pos_leaves",
  holidays: "pos_holidays",
  attendance: "pos_attendance",
  payroll: "pos_payroll",
  vatRates: "pos_vat_rates",
  parties: "app_parties",
  businessProfile: "pos_business_profile",
  userProfile: "pos_user_profile",
  notifications: "pos_notifications",
  branches: "pos_branches",
  warehouses: "pos_warehouses",
  transfers: "pos_transfers",
  branchRoles: "pos_branch_roles",
  duePayments: "pos_due_payments",
};

// ===== Default Data =====
const defaultCategories: Category[] = [
  { id: "1", name: "Prescription Medicines", description: "Prescription-only drugs" },
  { id: "2", name: "OTC Medicines", description: "Over-the-counter medicines" },
  { id: "3", name: "Vitamins & Supplements", description: "Vitamins and nutritional supplements" },
  { id: "4", name: "Medical Supplies", description: "Bandages, gloves, syringes, etc." },
];

const defaultBrands: Brand[] = [
  { id: "1", name: "Pfizer" },
  { id: "2", name: "Roche" },
  { id: "3", name: "Cipla" },
  { id: "4", name: "Generic" },
];

const defaultUnits: Unit[] = [
  { id: "1", name: "Tablet", shortName: "tab" },
  { id: "2", name: "Capsule", shortName: "cap" },
  { id: "3", name: "Bottle", shortName: "btl" },
  { id: "4", name: "Pack", shortName: "pk" },
  { id: "5", name: "Vial", shortName: "vial" },
];

const defaultProducts: Product[] = [];

const defaultCustomers: Customer[] = [];

const defaultSuppliers: Supplier[] = [];

const defaultSales: Sale[] = [];

const defaultPurchases: Purchase[] = [];

const defaultExpenseCategories: ExpenseCategory[] = [
  { id: "1", name: "Rent", description: "Office/shop rent" },
  { id: "2", name: "Utilities", description: "Electricity, water, internet" },
  { id: "3", name: "Transport", description: "Transportation costs" },
];

const defaultIncomeCategories: IncomeCategory[] = [
  { id: "1", name: "Sales Revenue", description: "Income from sales" },
  { id: "2", name: "Service", description: "Service income" },
];

const defaultVatRates: VatRate[] = [
  { id: "1", name: "Standard VAT", rate: 15, status: "Active" },
  { id: "2", name: "Reduced VAT", rate: 5, status: "Active" },
  { id: "3", name: "Zero VAT", rate: 0, status: "Active" },
];

// ===== Helpers =====
function load<T>(key: string, defaults: T[]): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaults;
  } catch { return defaults; }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

function nextId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 6);
}

function nextInvoice(prefix: string, key: string, defaults: { invoiceNo: string }[]): string {
  const items = load<{ invoiceNo: string }>(key, defaults);
  const max = items.reduce((m, s) => {
    const n = parseInt(s.invoiceNo.replace(`${prefix}-`, ""));
    return n > m ? n : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(5, "0")}`;
}

function nextCode(prefix: string, key: string, defaults: { code: string }[]): string {
  const items = load<{ code: string }>(key, defaults);
  const max = items.reduce((m, s) => {
    const n = parseInt(s.code.replace(`${prefix}-`, ""));
    return n > m ? n : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

// ===== Store =====
export const store = {
  nextId,
  // Shop owner identity (persisted from backend profile)
  getCurrentUserId: (): string | null => localStorage.getItem(KEYS.currentUserId),
  setCurrentUserId: (id: number | string): void => {
    localStorage.setItem(KEYS.currentUserId, String(id));
  },

  // Products
  getProducts: () => load<Product>(KEYS.products, defaultProducts),
  saveProducts: (p: Product[]) => save(KEYS.products, p),
  getNextProductCode: () => nextCode("PRD", KEYS.products, defaultProducts),

  // Categories
  getCategories: () => load<Category>(KEYS.categories, defaultCategories),
  saveCategories: (c: Category[]) => save(KEYS.categories, c),

  // Brands
  getBrands: () => load<Brand>(KEYS.brands, defaultBrands),
  saveBrands: (b: Brand[]) => save(KEYS.brands, b),

  // Units
  getUnits: () => load<Unit>(KEYS.units, defaultUnits),
  saveUnits: (u: Unit[]) => save(KEYS.units, u),

  // Customers
  getCustomers: () => load<Customer>(KEYS.customers, defaultCustomers),
  saveCustomers: (c: Customer[]) => save(KEYS.customers, c),

  // Suppliers
  getSuppliers: () => load<Supplier>(KEYS.suppliers, defaultSuppliers),
  saveSuppliers: (s: Supplier[]) => save(KEYS.suppliers, s),

  // Sales
  getSales: () => load<Sale>(KEYS.sales, defaultSales),
  saveSales: (s: Sale[]) => save(KEYS.sales, s),
  getNextSaleInvoice: () => nextInvoice("S", KEYS.sales, defaultSales),

  // Sale Returns
  getSaleReturns: () => load<SaleReturn>(KEYS.saleReturns, []),
  saveSaleReturns: (r: SaleReturn[]) => save(KEYS.saleReturns, r),

  getDuePayments: () => load<DuePayment>(KEYS.duePayments, []),
  saveDuePayments: (p: DuePayment[]) => save(KEYS.duePayments, p),

  // Purchases
  getPurchases: () => load<Purchase>(KEYS.purchases, defaultPurchases),
  savePurchases: (p: Purchase[]) => save(KEYS.purchases, p),
  getNextPurchaseInvoice: () => nextInvoice("P", KEYS.purchases, defaultPurchases),

  // Purchase Returns
  getPurchaseReturns: () => load<PurchaseReturn>(KEYS.purchaseReturns, []),
  savePurchaseReturns: (r: PurchaseReturn[]) => save(KEYS.purchaseReturns, r),

  // Expenses
  getExpenses: () => load<Expense>(KEYS.expenses, []),
  saveExpenses: (e: Expense[]) => save(KEYS.expenses, e),
  getExpenseCategories: () => load<ExpenseCategory>(KEYS.expenseCategories, defaultExpenseCategories),
  saveExpenseCategories: (c: ExpenseCategory[]) => save(KEYS.expenseCategories, c),

  // Income
  getIncomes: () => load<Income>(KEYS.incomes, []),
  saveIncomes: (i: Income[]) => save(KEYS.incomes, i),
  getIncomeCategories: () => load<IncomeCategory>(KEYS.incomeCategories, defaultIncomeCategories),
  saveIncomeCategories: (c: IncomeCategory[]) => save(KEYS.incomeCategories, c),

  // Bank Accounts
  getBankAccounts: () => load<BankAccount>(KEYS.bankAccounts, []),
  saveBankAccounts: (b: BankAccount[]) => save(KEYS.bankAccounts, b),

  // VAT Rates
  getVatRates: () => load<VatRate>(KEYS.vatRates, defaultVatRates),
  saveVatRates: (v: VatRate[]) => save(KEYS.vatRates, v),

  // Departments
  getDepartments: () => load<Department>(KEYS.departments, []),
  saveDepartments: (d: Department[]) => save(KEYS.departments, d),

  // Designations
  getDesignations: () => load<Designation>(KEYS.designations, []),
  saveDesignations: (d: Designation[]) => save(KEYS.designations, d),

  // Shifts
  getShifts: () => load<Shift>(KEYS.shifts, []),
  saveShifts: (s: Shift[]) => save(KEYS.shifts, s),

  // Employees
  getEmployees: () => load<Employee>(KEYS.employees, []),
  saveEmployees: (e: Employee[]) => save(KEYS.employees, e),

  // Leave Types
  getLeaveTypes: () => load<LeaveType>(KEYS.leaveTypes, []),
  saveLeaveTypes: (l: LeaveType[]) => save(KEYS.leaveTypes, l),

  // Leaves
  getLeaves: () => load<Leave>(KEYS.leaves, []),
  saveLeaves: (l: Leave[]) => save(KEYS.leaves, l),

  // Holidays
  getHolidays: () => load<Holiday>(KEYS.holidays, []),
  saveHolidays: (h: Holiday[]) => save(KEYS.holidays, h),

  // Attendance
  getAttendance: () => load<Attendance>(KEYS.attendance, []),
  saveAttendance: (a: Attendance[]) => save(KEYS.attendance, a),

  // Payroll
  getPayroll: () => load<Payroll>(KEYS.payroll, []),
  savePayroll: (p: Payroll[]) => save(KEYS.payroll, p),

  // Legacy
  getParties: () => load<Party>(KEYS.parties, []),
  saveParties: (p: Party[]) => save(KEYS.parties, p),

  // Business Profile
  getBusinessProfile: (): BusinessProfile => {
    const defaultBusinessProfile: BusinessProfile = {
      companyName: "RecordKEEPING",
      shortName: "",
      address: "",
      phone: "",
      email: "info@intelinksolutions.com",
      logo: "",
      currency: "GH₵",
      currencyCode: "GHS",
      currencyPosition: "before",
      darkMode: false,
      isOnline: true,
    };

    try {
      const data = localStorage.getItem(KEYS.businessProfile);
      return data ? { ...defaultBusinessProfile, ...JSON.parse(data) } : defaultBusinessProfile;
    } catch {
      return defaultBusinessProfile;
    }
  },
  saveBusinessProfile: (p: BusinessProfile) => {
    localStorage.setItem(KEYS.businessProfile, JSON.stringify(p));
    applyDynamicBranding(p);
  },
  applyBackendCurrency: (currency?: { symbol?: string; code?: string; position?: string }) => {
    if (!currency) return;
    const profile = store.getBusinessProfile();
    const next: BusinessProfile = {
      ...profile,
      currency: currency.symbol?.trim() || profile.currency,
      currencyCode: currency.code?.trim() || profile.currencyCode,
      currencyPosition: currency.position === "after" ? "after" : "before",
    };
    store.saveBusinessProfile(next);
  },

  applyBackendBusinessProfile: (data: {
    id?: number;
    company_name?: string; companyName?: string; name?: string; address?: string;
    phone?: string; phoneNumber?: string; email?: string; logo?: string; pictureUrl?: string;
    currency?: { symbol?: string; code?: string; position?: string };
  }) => {
    if (!data) return;
    const profile = store.getBusinessProfile();
    // The backend returns camelCase `companyName`/`phoneNumber`/`pictureUrl`
    // (confirmed against the live API), not the snake_case names this
    // function originally expected — both are checked so the real business
    // name/logo actually sync instead of silently staying at their defaults.
    const rawLogo = data.logo || data.pictureUrl;
    const next: BusinessProfile = {
      ...profile,
      businessId: data.id ?? profile.businessId,
      companyName: data.company_name || data.companyName || data.name || profile.companyName,
      address: data.address || profile.address,
      phone: data.phone || data.phoneNumber || profile.phone,
      email: data.email || profile.email,
      logo: rawLogo ? (getImageUrl(rawLogo) ?? profile.logo) : profile.logo,
    };
    if (data.currency) {
      next.currency = data.currency.symbol?.trim() || profile.currency;
      next.currencyCode = data.currency.code?.trim() || profile.currencyCode;
      next.currencyPosition = data.currency.position === "after" ? "after" : profile.currencyPosition;
    }
    store.saveBusinessProfile(next);
  },

  // User Profile
  getUserProfile: (): UserProfile => {
    try {
      const data = localStorage.getItem(KEYS.userProfile);
      return data
        ? JSON.parse(data)
        : {
            fullName: "Admin User",
            email: "admin@pospro.com",
            phone: "+1234567890",
            role: "Administrator",
            avatar: "",
            bio: "Manage your account details and profile photo.",
          };
    } catch {
      return {
        fullName: "Admin User",
        email: "admin@pospro.com",
        phone: "+1234567890",
        role: "Administrator",
        avatar: "",
        bio: "Manage your account details and profile photo.",
      };
    }
  },
  saveUserProfile: (p: UserProfile) => localStorage.setItem(KEYS.userProfile, JSON.stringify(p)),
  applyBackendUserProfile: (data?: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    image?: string;
    bio?: string;
  }) => {
    if (!data) return;
    const profile = store.getUserProfile();
    const next: UserProfile = {
      ...profile,
      fullName: data.name || profile.fullName,
      email: data.email || profile.email,
      phone: data.phone || profile.phone,
      role: data.role || profile.role,
      avatar: data.image || profile.avatar,
      bio: data.bio || profile.bio,
    };
    store.saveUserProfile(next);
  },

  // Notifications
  getNotifications: (): AppNotification[] => {
    return load<AppNotification>(KEYS.notifications, []);
  },
  saveNotifications: (n: AppNotification[]) => save(KEYS.notifications, n),

  // Branches
  getBranches: () => load<Branch>(KEYS.branches, []),
  saveBranches: (b: Branch[]) => save(KEYS.branches, b),

  // Warehouses
  getWarehouses: () => load<Warehouse>(KEYS.warehouses, []),
  saveWarehouses: (w: Warehouse[]) => save(KEYS.warehouses, w),

  // Transfers
  getTransfers: () => load<Transfer>(KEYS.transfers, []),
  saveTransfers: (t: Transfer[]) => save(KEYS.transfers, t),

  // Branch Roles
  getBranchRoles: () => load<BranchRole>(KEYS.branchRoles, []),
  saveBranchRoles: (r: BranchRole[]) => save(KEYS.branchRoles, r),

  // Active branch (owner switches; staff stay on assigned branch)
  getActiveBranchId: (): string | null => localStorage.getItem("pos_active_branch_id"),
  setActiveBranchId: (id: string | null): void => {
    if (id) localStorage.setItem("pos_active_branch_id", id);
    else localStorage.removeItem("pos_active_branch_id");
  },

  // Branch assigned to this staff user (set from backend profile)
  getUserBranchId: (): string | null => localStorage.getItem("pos_user_branch_id"),
  setUserBranchId: (id: string | null): void => {
    if (id) localStorage.setItem("pos_user_branch_id", id);
    else localStorage.removeItem("pos_user_branch_id");
  },

  /**
   * Returns the branch that should be used for ALL create/read operations in the
   * current session.  For owners this is whatever branch they switched to (or null
   * = "all branches" view). For staff it is their assigned branch.
   */
  getEffectiveBranchId: (): string | null => {
    return localStorage.getItem("pos_active_branch_id") ?? localStorage.getItem("pos_user_branch_id");
  },

  // Utility
  getNextInvoiceNo: () => nextInvoice("S", KEYS.sales, defaultSales),

  /**
   * Wipe all cached business data from localStorage.
   * Auth token, server URL, and user prefs are preserved so the user stays
   * logged in.  The next sync will re-populate everything from the server.
   */
  clearAllAppData: (): void => {
    const preserve = new Set([
      "pos_auth_token",
      "pos_api_base_url",
      "pos_user_role",
      "pos_user_visibility",
      "pos_active_branch_id",
      "pos_user_branch_id",
      "pos_security_prefs",
      "pos_security_pin",
      "pos_alert_prefs",
      "pos_offline_queue",
    ]);
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !preserve.has(key)) toRemove.push(key);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  },
};
