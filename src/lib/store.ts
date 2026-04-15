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
  categoryId?: string;
  brandId?: string;
  unitId?: string;
  price: number;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  dealerPrice: number;
  stock: number;
  alertQty: number;
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
}

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
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
  startTime: string;
  endTime: string;
  breakTime: string;
  status: "Active" | "Inactive";
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  phone?: string;
  email?: string;
  departmentId: string;
  designationId: string;
  shiftId: string;
  joinDate: string;
  salary: number;
  status: "Active" | "Inactive";
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
  employeeName: string;
  month: string;
  basicSalary: number;
  bonus: number;
  deduction: number;
  netSalary: number;
  status: "Paid" | "Unpaid";
  paidDate?: string;
}

export interface VatRate {
  id: string;
  name: string;
  rate: number;
  status: "Active" | "Inactive";
}

export interface BusinessProfile {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  currency: string;
  currencyCode?: string;
  currencyPosition?: "before" | "after";
  darkMode: boolean;
  isOnline: boolean;
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

// ===== Storage Keys =====
const KEYS = {
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
};

// ===== Default Data =====
const defaultCategories: Category[] = [
  { id: "1", name: "Electronics", description: "Electronic items" },
  { id: "2", name: "Clothing", description: "Apparel and garments" },
  { id: "3", name: "Fruits", description: "Fresh fruits" },
  { id: "4", name: "Accessories", description: "Fashion accessories" },
];

const defaultBrands: Brand[] = [
  { id: "1", name: "Samsung" },
  { id: "2", name: "Apple" },
  { id: "3", name: "Nike" },
  { id: "4", name: "Generic" },
];

const defaultUnits: Unit[] = [
  { id: "1", name: "Piece", shortName: "pc" },
  { id: "2", name: "Kilogram", shortName: "kg" },
  { id: "3", name: "Liter", shortName: "ltr" },
];

const defaultProducts: Product[] = [
  { id: "1", name: "T-Shirt", code: "PRD-001", categoryId: "2", brandId: "3", price: 1200, costPrice: 900, retailPrice: 1200, wholesalePrice: 1050, dealerPrice: 1000, stock: 200, alertQty: 20 },
  { id: "2", name: "Green Grapes", code: "PRD-002", categoryId: "3", brandId: "4", price: 800, costPrice: 500, retailPrice: 800, wholesalePrice: 700, dealerPrice: 650, stock: 400, alertQty: 50 },
  { id: "3", name: "Ladies Bag", code: "PRD-003", categoryId: "4", brandId: "4", price: 300, costPrice: 180, retailPrice: 300, wholesalePrice: 250, dealerPrice: 230, stock: 200, alertQty: 15 },
  { id: "4", name: "Laptop", code: "PRD-004", categoryId: "1", brandId: "1", price: 45000, costPrice: 38000, retailPrice: 45000, wholesalePrice: 42000, dealerPrice: 40000, stock: 42, alertQty: 5 },
  { id: "5", name: "Mobile", code: "PRD-005", categoryId: "1", brandId: "2", price: 25000, costPrice: 20000, retailPrice: 25000, wholesalePrice: 23000, dealerPrice: 22000, stock: 78, alertQty: 10 },
  { id: "6", name: "Shoe", code: "PRD-006", categoryId: "2", brandId: "3", price: 1250, costPrice: 850, retailPrice: 1250, wholesalePrice: 1100, dealerPrice: 1050, stock: 191, alertQty: 20 },
  { id: "7", name: "Watch", code: "PRD-007", categoryId: "4", brandId: "1", price: 5000, costPrice: 3500, retailPrice: 5000, wholesalePrice: 4500, dealerPrice: 4200, stock: 89, alertQty: 10 },
  { id: "8", name: "Banana", code: "PRD-008", categoryId: "3", brandId: "4", price: 120, costPrice: 60, retailPrice: 120, wholesalePrice: 100, dealerPrice: 90, stock: 606, alertQty: 50 },
];

const defaultCustomers: Customer[] = [
  { id: "1", name: "Moson", phone: "01700000001", type: "Dealer", initialDue: 0, due: 17700 },
  { id: "2", name: "Robin", phone: "01700000002", type: "Retailer", initialDue: 0, due: 800 },
  { id: "3", name: "Jack", phone: "01700000003", type: "Wholesaler", initialDue: 0, due: 20500 },
  { id: "4", name: "Jake", phone: "01700000004", type: "Retailer", initialDue: 0, due: 2000 },
  { id: "5", name: "Micheal", phone: "01700000005", type: "Dealer", initialDue: 0, due: 2500 },
];

const defaultSuppliers: Supplier[] = [
  { id: "1", name: "MD Rakib", phone: "01800000001", initialDue: 0, due: 500 },
  { id: "2", name: "Sakil", phone: "01800000002", initialDue: 0, due: 0 },
  { id: "3", name: "Ahsan Trading", phone: "01800000003", initialDue: 0, due: 3200 },
];

const defaultSales: Sale[] = [
  { id: "1", invoiceNo: "S-00018", date: "2025-01-04", customerId: "0", customerName: "Guest", items: [{ productId: "7", name: "Watch", quantity: 1, unitPrice: 5000, discount: 0 }], subtotal: 5000, vat: 0, vatPercent: 0, discount: 0, total: 5000, paid: 5000, due: 0, change: 0, profit: 1500, status: "Paid", returned: false },
  { id: "2", invoiceNo: "S-00017", date: "2025-01-04", customerId: "1", customerName: "Moson", items: [{ productId: "8", name: "Banana", quantity: 10, unitPrice: 90, discount: 0 }], subtotal: 900, vat: 0, vatPercent: 0, discount: 0, total: 900, paid: 900, due: 0, change: 0, profit: 300, status: "Paid", returned: false },
  { id: "3", invoiceNo: "S-00016", date: "2025-01-03", customerId: "0", customerName: "Guest", items: [{ productId: "3", name: "Ladies Bag", quantity: 2, unitPrice: 300, discount: 0 }], subtotal: 600, vat: 0, vatPercent: 0, discount: 0, total: 600, paid: 400, due: 200, change: 0, profit: 240, status: "Due", returned: false },
];

const defaultPurchases: Purchase[] = [
  { id: "1", invoiceNo: "P-00001", date: "2025-01-02", supplierId: "1", supplierName: "MD Rakib", items: [{ productId: "4", name: "Laptop", quantity: 5, unitPrice: 38000 }], subtotal: 190000, discount: 0, total: 190000, paid: 190000, due: 0, status: "Paid", returned: false },
];

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
      companyName: "Key Doctors Solutions",
      address: "Your Business Address, City, Country",
      phone: "+1234567890",
      email: "info@keydoctors.com",
      logo: "",
      currency: "$",
      currencyCode: "USD",
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
  saveBusinessProfile: (p: BusinessProfile) => localStorage.setItem(KEYS.businessProfile, JSON.stringify(p)),
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
    company_name?: string; name?: string; address?: string;
    phone?: string; email?: string; logo?: string;
    currency?: { symbol?: string; code?: string; position?: string };
  }) => {
    if (!data) return;
    const profile = store.getBusinessProfile();
    const next: BusinessProfile = {
      ...profile,
      companyName: data.company_name || data.name || profile.companyName,
      address: data.address || profile.address,
      phone: data.phone || profile.phone,
      email: data.email || profile.email,
      logo: data.logo || profile.logo,
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

  // Utility
  getNextInvoiceNo: () => nextInvoice("S", KEYS.sales, defaultSales),
};
