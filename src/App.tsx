import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Critical path — always bundled (tiny, needed immediately)
import Index from "./pages/Index";
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import PermissionGuard from "./components/PermissionGuard";
import SavedOverlay from "./components/SavedOverlay";
import MobilePushBootstrap from "./components/MobilePushBootstrap";
import NotFound from "./pages/NotFound";

// ── Lazy pages — only loaded when the user navigates there ────────────────────
const Dashboard            = lazy(() => import("./pages/Dashboard"));
const Products             = lazy(() => import("./pages/Products"));
const Categories           = lazy(() => import("./pages/Categories"));
const Brands               = lazy(() => import("./pages/Brands"));
const Units                = lazy(() => import("./pages/Units"));
const StockList            = lazy(() => import("./pages/StockList"));
const Customers            = lazy(() => import("./pages/Customers"));
const Suppliers            = lazy(() => import("./pages/Suppliers"));
const DueList              = lazy(() => import("./pages/DueList"));
const AddSale              = lazy(() => import("./pages/AddSale"));
const SalesList            = lazy(() => import("./pages/SalesList"));
const SaleReturn           = lazy(() => import("./pages/SaleReturn"));
const SaleReturnList       = lazy(() => import("./pages/SaleReturnList"));
const AddPurchase          = lazy(() => import("./pages/AddPurchase"));
const PurchaseList         = lazy(() => import("./pages/PurchaseList"));
const PurchaseReturn       = lazy(() => import("./pages/PurchaseReturn"));
const PurchaseReturnList   = lazy(() => import("./pages/PurchaseReturnList"));
const Finance              = lazy(() => import("./pages/Finance"));
const Expenses             = lazy(() => import("./pages/Expenses"));
const IncomePage           = lazy(() => import("./pages/IncomePage"));
const ExpenseCategories    = lazy(() => import("./pages/ExpenseCategories"));
const IncomeCategories     = lazy(() => import("./pages/IncomeCategories"));
const LossProfit           = lazy(() => import("./pages/LossProfit"));
const Reports              = lazy(() => import("./pages/Reports"));
const Settings             = lazy(() => import("./pages/Settings"));
const UserProfile          = lazy(() => import("./pages/UserProfile"));
const Notifications        = lazy(() => import("./pages/Notifications"));
const UserRoles            = lazy(() => import("./pages/UserRoles"));
const ItemsPage            = lazy(() => import("./pages/ItemsPage"));
const InventoryHistory     = lazy(() => import("./pages/InventoryHistory"));

// Reports
const SalesReport          = lazy(() => import("./pages/reports/SalesReport"));
const SaleReturnReport     = lazy(() => import("./pages/reports/SaleReturnReport"));
const PurchaseReport       = lazy(() => import("./pages/reports/PurchaseReport"));
const PurchaseReturnReport = lazy(() => import("./pages/reports/PurchaseReturnReport"));
const SalesTaxReport       = lazy(() => import("./pages/reports/SalesTaxReport"));
const PurchaseTaxReport    = lazy(() => import("./pages/reports/PurchaseTaxReport"));
const IncomeReport         = lazy(() => import("./pages/reports/IncomeReport"));
const ExpenseReport        = lazy(() => import("./pages/reports/ExpenseReport"));
const StockReport          = lazy(() => import("./pages/reports/StockReport"));
const CustomerDueReport    = lazy(() => import("./pages/reports/CustomerDueReport"));
const SupplierDueReport    = lazy(() => import("./pages/reports/SupplierDueReport"));
const ProfitLossBill       = lazy(() => import("./pages/reports/ProfitLossBill"));
const ProfitLossProduct    = lazy(() => import("./pages/reports/ProfitLossProduct"));
const ProfitLossHistory    = lazy(() => import("./pages/reports/ProfitLossHistory"));
const TopCustomers         = lazy(() => import("./pages/reports/TopCustomers"));
const TopSuppliers         = lazy(() => import("./pages/reports/TopSuppliers"));
const TopProducts          = lazy(() => import("./pages/reports/TopProducts"));
const ProductSalesReport   = lazy(() => import("./pages/reports/ProductSalesReport"));
const ProductPurchaseReport = lazy(() => import("./pages/reports/ProductPurchaseReport"));
const DiscountedProducts   = lazy(() => import("./pages/reports/DiscountedProducts"));
const DueTransactions      = lazy(() => import("./pages/reports/DueTransactions"));

// HRM
const HRMIndex             = lazy(() => import("./pages/hrm/HRMIndex"));
const Departments          = lazy(() => import("./pages/hrm/Departments"));
const Designations         = lazy(() => import("./pages/hrm/Designations"));
const Shifts               = lazy(() => import("./pages/hrm/Shifts"));
const Employees            = lazy(() => import("./pages/hrm/Employees"));
const LeaveTypes           = lazy(() => import("./pages/hrm/LeaveTypes"));
const Leaves               = lazy(() => import("./pages/hrm/Leaves"));
const Holidays             = lazy(() => import("./pages/hrm/Holidays"));
const AttendanceList       = lazy(() => import("./pages/hrm/AttendanceList"));
const PayrollList          = lazy(() => import("./pages/hrm/PayrollList"));
const AttendanceReport     = lazy(() => import("./pages/hrm/AttendanceReport"));
const PayrollReport        = lazy(() => import("./pages/hrm/PayrollReport"));
const LeaveReport          = lazy(() => import("./pages/hrm/LeaveReport"));

// Lightweight fallback shown while a lazy page chunk is downloading
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SavedOverlay />
      <MobilePushBootstrap />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/"      element={<Splash />} />
            <Route path="/login" element={<Login />} />

            {/* Protected routes — require auth token */}
            <Route element={<ProtectedRoute />}>
              <Route path="/home"               element={<Index />} />
              <Route path="/items"              element={<ItemsPage />} />
              <Route path="/dashboard"          element={<Dashboard />} />
              <Route path="/products"           element={<PermissionGuard><Products /></PermissionGuard>} />
              <Route path="/categories"         element={<PermissionGuard><Categories /></PermissionGuard>} />
              <Route path="/brands"             element={<PermissionGuard><Brands /></PermissionGuard>} />
              <Route path="/units"              element={<PermissionGuard><Units /></PermissionGuard>} />
              <Route path="/stock"              element={<PermissionGuard><StockList /></PermissionGuard>} />
              <Route path="/inventory-history"  element={<PermissionGuard><InventoryHistory /></PermissionGuard>} />
              <Route path="/customers"          element={<PermissionGuard><Customers /></PermissionGuard>} />
              <Route path="/suppliers"          element={<PermissionGuard><Suppliers /></PermissionGuard>} />
              <Route path="/due-list"           element={<PermissionGuard><DueList /></PermissionGuard>} />
              <Route path="/add-sale"           element={<PermissionGuard><AddSale /></PermissionGuard>} />
              <Route path="/sales"              element={<PermissionGuard><SalesList /></PermissionGuard>} />
              <Route path="/sale-return/:saleId"     element={<PermissionGuard><SaleReturn /></PermissionGuard>} />
              <Route path="/sale-returns"       element={<PermissionGuard><SaleReturnList /></PermissionGuard>} />
              <Route path="/add-purchase"       element={<PermissionGuard><AddPurchase /></PermissionGuard>} />
              <Route path="/purchases"          element={<PermissionGuard><PurchaseList /></PermissionGuard>} />
              <Route path="/purchase-return/:purchaseId" element={<PermissionGuard><PurchaseReturn /></PermissionGuard>} />
              <Route path="/purchase-returns"   element={<PermissionGuard><PurchaseReturnList /></PermissionGuard>} />
              <Route path="/finance"            element={<PermissionGuard><Finance /></PermissionGuard>} />
              <Route path="/expenses"           element={<PermissionGuard><Expenses /></PermissionGuard>} />
              <Route path="/income"             element={<PermissionGuard><IncomePage /></PermissionGuard>} />
              <Route path="/expense-categories" element={<PermissionGuard><ExpenseCategories /></PermissionGuard>} />
              <Route path="/income-categories"  element={<PermissionGuard><IncomeCategories /></PermissionGuard>} />
              <Route path="/loss-profit"        element={<PermissionGuard><LossProfit /></PermissionGuard>} />
              <Route path="/reports"            element={<PermissionGuard><Reports /></PermissionGuard>} />
              <Route path="/settings"           element={<PermissionGuard><Settings /></PermissionGuard>} />
              <Route path="/user-roles"         element={<PermissionGuard><UserRoles /></PermissionGuard>} />
              <Route path="/profile"            element={<UserProfile />} />
              <Route path="/notifications"      element={<Notifications />} />

              {/* Report Routes */}
              <Route path="/report/sales"             element={<PermissionGuard><SalesReport /></PermissionGuard>} />
              <Route path="/report/sale-returns"      element={<PermissionGuard><SaleReturnReport /></PermissionGuard>} />
              <Route path="/report/purchases"         element={<PermissionGuard><PurchaseReport /></PermissionGuard>} />
              <Route path="/report/purchase-returns"  element={<PermissionGuard><PurchaseReturnReport /></PermissionGuard>} />
              <Route path="/report/sales-tax"         element={<PermissionGuard><SalesTaxReport /></PermissionGuard>} />
              <Route path="/report/purchase-tax"      element={<PermissionGuard><PurchaseTaxReport /></PermissionGuard>} />
              <Route path="/report/income"            element={<PermissionGuard><IncomeReport /></PermissionGuard>} />
              <Route path="/report/expenses"          element={<PermissionGuard><ExpenseReport /></PermissionGuard>} />
              <Route path="/report/stock"             element={<PermissionGuard><StockReport /></PermissionGuard>} />
              <Route path="/report/customer-due"      element={<PermissionGuard><CustomerDueReport /></PermissionGuard>} />
              <Route path="/report/supplier-due"      element={<PermissionGuard><SupplierDueReport /></PermissionGuard>} />
              <Route path="/report/profit-loss-bill"     element={<PermissionGuard><ProfitLossBill /></PermissionGuard>} />
              <Route path="/report/profit-loss-product"  element={<PermissionGuard><ProfitLossProduct /></PermissionGuard>} />
              <Route path="/report/profit-loss-history"  element={<PermissionGuard><ProfitLossHistory /></PermissionGuard>} />
              <Route path="/report/top-customers"     element={<PermissionGuard><TopCustomers /></PermissionGuard>} />
              <Route path="/report/top-suppliers"     element={<PermissionGuard><TopSuppliers /></PermissionGuard>} />
              <Route path="/report/top-products"      element={<PermissionGuard><TopProducts /></PermissionGuard>} />
              <Route path="/report/product-sales"     element={<PermissionGuard><ProductSalesReport /></PermissionGuard>} />
              <Route path="/report/product-purchases" element={<PermissionGuard><ProductPurchaseReport /></PermissionGuard>} />
              <Route path="/report/discounted"        element={<PermissionGuard><DiscountedProducts /></PermissionGuard>} />
              <Route path="/report/due-transactions"  element={<PermissionGuard><DueTransactions /></PermissionGuard>} />

              {/* HRM Routes */}
              <Route path="/hrm"                    element={<PermissionGuard><HRMIndex /></PermissionGuard>} />
              <Route path="/hrm/departments"        element={<PermissionGuard><Departments /></PermissionGuard>} />
              <Route path="/hrm/designations"       element={<PermissionGuard><Designations /></PermissionGuard>} />
              <Route path="/hrm/shifts"             element={<PermissionGuard><Shifts /></PermissionGuard>} />
              <Route path="/hrm/employees"          element={<PermissionGuard><Employees /></PermissionGuard>} />
              <Route path="/hrm/leave-types"        element={<PermissionGuard><LeaveTypes /></PermissionGuard>} />
              <Route path="/hrm/leaves"             element={<PermissionGuard><Leaves /></PermissionGuard>} />
              <Route path="/hrm/holidays"           element={<PermissionGuard><Holidays /></PermissionGuard>} />
              <Route path="/hrm/attendance"         element={<PermissionGuard><AttendanceList /></PermissionGuard>} />
              <Route path="/hrm/payroll"            element={<PermissionGuard><PayrollList /></PermissionGuard>} />
              <Route path="/hrm/attendance-report"  element={<PermissionGuard><AttendanceReport /></PermissionGuard>} />
              <Route path="/hrm/payroll-report"     element={<PermissionGuard><PayrollReport /></PermissionGuard>} />
              <Route path="/hrm/leave-report"       element={<PermissionGuard><LeaveReport /></PermissionGuard>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
