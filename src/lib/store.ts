export interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  costPrice: number;
  stock: number;
  alertQty: number;
  categoryId: string;
  brandId: string;
  unitId: string;
  image?: string;
  expiryDate?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Brand {
  id: string;
  name: string;
  description: string;
}

export interface Unit {
  id: string;
  name: string;
  shortName: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  type: "Retailer" | "Wholesaler" | "Dealer";
  initialDue: number;
  due: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  due: number;
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
  returnedQty: number;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  customerId?: string;
  items: SaleItem[];
  subtotal: number;
  vat: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  profit: number;
  status: "Paid" | "Due" | "Returned";
  hasReturn: boolean;
}

export interface SaleReturn {
  id: string;
  saleId: string;
  invoiceNo: string;
  returnInvoiceNo: string;
  date: string;
  customerName: string;
  items: { productId: string; name: string; quantity: number; unitPrice: number }[];
  total: number;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  returnedQty: number;
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
  status: "Paid" | "Due" | "Returned";
  hasReturn: boolean;
}

export interface PurchaseReturn {
  id: string;
  purchaseId: string;
  invoiceNo: string;
  returnInvoiceNo: string;
  date: string;
  supplierName: string;
  items: { productId: string; name: string; quantity: number; unitPrice: number }[];
  total: number;
}

export interface Expense {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  paymentType: "Cash" | "Bank" | "Cheque";
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
}

export interface Income {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  paymentType: "Cash" | "Bank" | "Cheque";
}

export interface IncomeCategory {
  id: string;
  name: string;
  description: string;
}

export interface VatRate {
  id: string;
  name: string;
  rate: number;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Inactive";
}

export interface Designation {
  id: string;
  name: string;
  description: string;
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
  phone: string;
  email: string;
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
  description: string;
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
  status: "Paid" | "Pending";
  paidDate?: string;
}

// Keys
const KEYS = {
  products: "pos_products",
  categories: "pos_categories",
  brands: "pos_brands",
  units: "pos_units",
  customers: "pos_customers",
  suppliers: "pos_suppliers",
  parties: "pos_parties",
  sales: "pos_sales",
  saleReturns: "pos_sale_returns",
  purchases: "pos_purchases",
  purchaseReturns: "pos_purchase_returns",
  expenses: "pos_expenses",
  expenseCategories: "pos_expense_categories",
  incomes: "pos_incomes",
  incomeCategories: "pos_income_categories",
  vatRates: "pos_vat_rates",
  departments: "pos_departments",
  designations: "pos_designations",
  shifts: "pos_shifts",
  employees: "pos_employees",
  leaveTypes: "pos_leave_types",
  leaves: "pos_leaves",
  holidays: "pos_holidays",
  attendances: "pos_attendances",
  payrolls: "pos_payrolls",
} as const;

// Defaults
const defaultCategories: Category[] = [
  { id: "1", name: "Electronics", description: "Electronic items" },
  { id: "2", name: "Clothing", description: "Apparel & fashion" },
  { id: "3", name: "Food & Beverage", description: "Consumables" },
  { id: "4", name: "Accessories", description: "Bags, watches, etc." },
];

const defaultBrands: Brand[] = [
  { id: "1", name: "Apple", description: "Premium electronics" },
  { id: "2", name: "Samsung", description: "Consumer electronics" },
  { id: "3", name: "Nike", description: "Sportswear" },
  { id: "4", name: "Generic", description: "Unbranded" },
];

const defaultUnits: Unit[] = [
  { id: "1", name: "Piece", shortName: "pcs" },
  { id: "2", name: "Kilogram", shortName: "kg" },
  { id: "3", name: "Dozen", shortName: "dz" },
];

const defaultProducts: Product[] = [
  { id: "1", name: "T-Shirt", code: "P001", price: 1200, costPrice: 900, stock: 200, alertQty: 10, categoryId: "2", brandId: "3", unitId: "1" },
  { id: "2", name: "Green Grapes", code: "P002", price: 800, costPrice: 500, stock: 400, alertQty: 20, categoryId: "3", brandId: "4", unitId: "2" },
  { id: "3", name: "Ladies Bag", code: "P003", price: 300, costPrice: 180, stock: 200, alertQty: 5, categoryId: "4", brandId: "4", unitId: "1" },
  { id: "4", name: "Laptop", code: "P004", price: 75000, costPrice: 65000, stock: 42, alertQty: 5, categoryId: "1", brandId: "1", unitId: "1" },
  { id: "5", name: "Mobile", code: "P005", price: 25000, costPrice: 20000, stock: 978, alertQty: 10, categoryId: "1", brandId: "2", unitId: "1" },
  { id: "6", name: "Shoe", code: "P006", price: 1250, costPrice: 800, stock: 191, alertQty: 10, categoryId: "2", brandId: "3", unitId: "1" },
  { id: "7", name: "Watch", code: "P007", price: 5000, costPrice: 3500, stock: 89, alertQty: 5, categoryId: "4", brandId: "2", unitId: "1" },
  { id: "8", name: "Banana", code: "P008", price: 50, costPrice: 30, stock: 606, alertQty: 50, categoryId: "3", brandId: "4", unitId: "2" },
];

const defaultCustomers: Customer[] = [
  { id: "1", name: "Moson", phone: "01712345678", email: "moson@mail.com", address: "Dhaka", type: "Dealer", initialDue: 0, due: 17700 },
  { id: "2", name: "Robin", phone: "01812345678", email: "robin@mail.com", address: "Chittagong", type: "Retailer", initialDue: 0, due: 800 },
  { id: "3", name: "Jack", phone: "01912345678", email: "jack@mail.com", address: "Sylhet", type: "Wholesaler", initialDue: 0, due: 20500 },
];

const defaultSuppliers: Supplier[] = [
  { id: "1", name: "MD Rakib", phone: "01612345678", email: "rakib@mail.com", address: "Dhaka", due: 500 },
  { id: "2", name: "Sakil", phone: "01512345678", email: "sakil@mail.com", address: "Rajshahi", due: 0 },
];

const defaultParties: Party[] = [
  { id: "1", name: "Moson", type: "Dealer", due: 17700 },
  { id: "2", name: "Robin", type: "Retailer", due: 800 },
  { id: "3", name: "Jack", type: "Wholesaler", due: 20500 },
  { id: "4", name: "MD Rakib", type: "Supplier", due: 500 },
  { id: "5", name: "Sakil", type: "Supplier", due: 0 },
];

const defaultSales: Sale[] = [
  { id: "1", invoiceNo: "S-00018", date: "2025-01-04", customerName: "Guest", items: [{ productId: "7", name: "Watch", quantity: 1, unitPrice: 5000, returnedQty: 0 }], subtotal: 5000, vat: 0, discount: 0, total: 5000, paid: 5000, due: 0, profit: 1500, status: "Paid", hasReturn: false },
  { id: "2", invoiceNo: "S-00017", date: "2025-01-04", customerName: "Guest", items: [{ productId: "8", name: "Banana", quantity: 3, unitPrice: 50, returnedQty: 0 }], subtotal: 150, vat: 7, discount: 0, total: 157, paid: 157, due: 0, profit: 60, status: "Paid", hasReturn: false },
  { id: "3", invoiceNo: "S-00016", date: "2025-01-03", customerName: "Moson", customerId: "1", items: [{ productId: "3", name: "Ladies Bag", quantity: 2, unitPrice: 300, returnedQty: 0 }], subtotal: 600, vat: 0, discount: 200, total: 400, paid: 400, due: 0, profit: 40, status: "Paid", hasReturn: false },
  { id: "4", invoiceNo: "S-00015", date: "2025-01-02", customerName: "Robin", customerId: "2", items: [{ productId: "1", name: "T-Shirt", quantity: 5, unitPrice: 1200, returnedQty: 0 }], subtotal: 6000, vat: 0, discount: 0, total: 6000, paid: 4000, due: 2000, profit: 1500, status: "Due", hasReturn: false },
];

const defaultPurchases: Purchase[] = [
  { id: "1", invoiceNo: "P-00001", date: "2025-01-05", supplierId: "1", supplierName: "MD Rakib", items: [{ productId: "5", name: "Mobile", quantity: 50, unitPrice: 20000, returnedQty: 0 }], subtotal: 1000000, discount: 0, total: 1000000, paid: 950000, due: 50000, status: "Due", hasReturn: false },
  { id: "2", invoiceNo: "P-00002", date: "2025-01-03", supplierId: "2", supplierName: "Sakil", items: [{ productId: "1", name: "T-Shirt", quantity: 100, unitPrice: 900, returnedQty: 0 }], subtotal: 90000, discount: 2500, total: 87500, paid: 87500, due: 0, status: "Paid", hasReturn: false },
];

const defaultExpenseCategories: ExpenseCategory[] = [
  { id: "1", name: "Rent", description: "Office rent" },
  { id: "2", name: "Utilities", description: "Electricity, water, internet" },
  { id: "3", name: "Transport", description: "Travel & delivery" },
];

const defaultIncomeCategories: IncomeCategory[] = [
  { id: "1", name: "Service", description: "Service income" },
  { id: "2", name: "Interest", description: "Bank interest" },
];

const defaultVatRates: VatRate[] = [
  { id: "1", name: "Standard", rate: 15 },
  { id: "2", name: "Reduced", rate: 5 },
  { id: "3", name: "Zero", rate: 0 },
];

const defaultDepartments: Department[] = [
  { id: "1", name: "Sales", description: "Sales department", status: "Active" },
  { id: "2", name: "Accounts", description: "Finance & accounting", status: "Active" },
];

const defaultDesignations: Designation[] = [
  { id: "1", name: "Manager", description: "Department manager", status: "Active" },
  { id: "2", name: "Executive", description: "Staff executive", status: "Active" },
];

const defaultShifts: Shift[] = [
  { id: "1", name: "Morning", startTime: "09:00", endTime: "17:00", breakTime: "60", status: "Active" },
  { id: "2", name: "Evening", startTime: "14:00", endTime: "22:00", breakTime: "45", status: "Active" },
];

// Generic helpers
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
  // Products
  getProducts: () => load<Product>(KEYS.products, defaultProducts),
  saveProducts: (p: Product[]) => save(KEYS.products, p),

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

  // Parties (legacy compat)
  getParties: () => load<Party>(KEYS.parties, defaultParties),
  saveParties: (p: Party[]) => save(KEYS.parties, p),

  // Sales
  getSales: () => load<Sale>(KEYS.sales, defaultSales),
  saveSales: (s: Sale[]) => save(KEYS.sales, s),

  // Sale Returns
  getSaleReturns: () => load<SaleReturn>(KEYS.saleReturns, []),
  saveSaleReturns: (r: SaleReturn[]) => save(KEYS.saleReturns, r),

  // Purchases
  getPurchases: () => load<Purchase>(KEYS.purchases, defaultPurchases),
  savePurchases: (p: Purchase[]) => save(KEYS.purchases, p),

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

  // VAT
  getVatRates: () => load<VatRate>(KEYS.vatRates, defaultVatRates),
  saveVatRates: (v: VatRate[]) => save(KEYS.vatRates, v),

  // HRM
  getDepartments: () => load<Department>(KEYS.departments, defaultDepartments),
  saveDepartments: (d: Department[]) => save(KEYS.departments, d),

  getDesignations: () => load<Designation>(KEYS.designations, defaultDesignations),
  saveDesignations: (d: Designation[]) => save(KEYS.designations, d),

  getShifts: () => load<Shift>(KEYS.shifts, defaultShifts),
  saveShifts: (s: Shift[]) => save(KEYS.shifts, s),

  getEmployees: () => load<Employee>(KEYS.employees, []),
  saveEmployees: (e: Employee[]) => save(KEYS.employees, e),

  getLeaveTypes: () => load<LeaveType>(KEYS.leaveTypes, []),
  saveLeaveTypes: (l: LeaveType[]) => save(KEYS.leaveTypes, l),

  getLeaves: () => load<Leave>(KEYS.leaves, []),
  saveLeaves: (l: Leave[]) => save(KEYS.leaves, l),

  getHolidays: () => load<Holiday>(KEYS.holidays, []),
  saveHolidays: (h: Holiday[]) => save(KEYS.holidays, h),

  getAttendances: () => load<Attendance>(KEYS.attendances, []),
  saveAttendances: (a: Attendance[]) => save(KEYS.attendances, a),

  getPayrolls: () => load<Payroll>(KEYS.payrolls, []),
  savePayrolls: (p: Payroll[]) => save(KEYS.payrolls, p),

  // Helpers
  getNextSaleInvoice: (): string => {
    const sales = load<Sale>(KEYS.sales, defaultSales);
    const max = sales.reduce((m, s) => {
      const n = parseInt(s.invoiceNo.replace("S-", ""));
      return n > m ? n : m;
    }, 0);
    return `S-${String(max + 1).padStart(5, "0")}`;
  },

  getNextPurchaseInvoice: (): string => {
    const purchases = load<Purchase>(KEYS.purchases, defaultPurchases);
    const max = purchases.reduce((m, p) => {
      const n = parseInt(p.invoiceNo.replace("P-", ""));
      return n > m ? n : m;
    }, 0);
    return `P-${String(max + 1).padStart(5, "0")}`;
  },

  getNextReturnInvoice: (prefix: string): string => {
    const key = prefix === "SR" ? KEYS.saleReturns : KEYS.purchaseReturns;
    const items = load<{ returnInvoiceNo: string }>(key, []);
    const max = items.reduce((m, i) => {
      const n = parseInt(i.returnInvoiceNo.replace(`${prefix}-`, ""));
      return n > m ? n : m;
    }, 0);
    return `${prefix}-${String(max + 1).padStart(5, "0")}`;
  },
};
