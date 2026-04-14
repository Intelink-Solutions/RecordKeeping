import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Brands from "./pages/Brands";
import StockList from "./pages/StockList";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import DueList from "./pages/DueList";
import AddSale from "./pages/AddSale";
import SalesList from "./pages/SalesList";
import SaleReturn from "./pages/SaleReturn";
import SaleReturnList from "./pages/SaleReturnList";
import AddPurchase from "./pages/AddPurchase";
import PurchaseList from "./pages/PurchaseList";
import PurchaseReturn from "./pages/PurchaseReturn";
import PurchaseReturnList from "./pages/PurchaseReturnList";
import Finance from "./pages/Finance";
import Expenses from "./pages/Expenses";
import IncomePage from "./pages/IncomePage";
import ExpenseCategories from "./pages/ExpenseCategories";
import IncomeCategories from "./pages/IncomeCategories";
import LossProfit from "./pages/LossProfit";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Reports
import SalesReport from "./pages/reports/SalesReport";
import SaleReturnReport from "./pages/reports/SaleReturnReport";
import PurchaseReport from "./pages/reports/PurchaseReport";
import PurchaseReturnReport from "./pages/reports/PurchaseReturnReport";
import SalesTaxReport from "./pages/reports/SalesTaxReport";
import PurchaseTaxReport from "./pages/reports/PurchaseTaxReport";
import IncomeReport from "./pages/reports/IncomeReport";
import ExpenseReport from "./pages/reports/ExpenseReport";
import StockReport from "./pages/reports/StockReport";
import CustomerDueReport from "./pages/reports/CustomerDueReport";
import SupplierDueReport from "./pages/reports/SupplierDueReport";
import ProfitLossBill from "./pages/reports/ProfitLossBill";
import ProfitLossProduct from "./pages/reports/ProfitLossProduct";
import ProfitLossHistory from "./pages/reports/ProfitLossHistory";
import TopCustomers from "./pages/reports/TopCustomers";
import TopSuppliers from "./pages/reports/TopSuppliers";
import TopProducts from "./pages/reports/TopProducts";
import ProductSalesReport from "./pages/reports/ProductSalesReport";
import ProductPurchaseReport from "./pages/reports/ProductPurchaseReport";
import DiscountedProducts from "./pages/reports/DiscountedProducts";
import DueTransactions from "./pages/reports/DueTransactions";

// HRM
import HRMIndex from "./pages/hrm/HRMIndex";
import Departments from "./pages/hrm/Departments";
import Designations from "./pages/hrm/Designations";
import Shifts from "./pages/hrm/Shifts";
import Employees from "./pages/hrm/Employees";
import LeaveTypes from "./pages/hrm/LeaveTypes";
import Leaves from "./pages/hrm/Leaves";
import Holidays from "./pages/hrm/Holidays";
import AttendanceList from "./pages/hrm/AttendanceList";
import PayrollList from "./pages/hrm/PayrollList";
import AttendanceReport from "./pages/hrm/AttendanceReport";
import PayrollReport from "./pages/hrm/PayrollReport";
import LeaveReport from "./pages/hrm/LeaveReport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/brands" element={<Brands />} />
          <Route path="/stock" element={<StockList />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/due-list" element={<DueList />} />
          <Route path="/add-sale" element={<AddSale />} />
          <Route path="/sales" element={<SalesList />} />
          <Route path="/sale-return/:saleId" element={<SaleReturn />} />
          <Route path="/sale-returns" element={<SaleReturnList />} />
          <Route path="/add-purchase" element={<AddPurchase />} />
          <Route path="/purchases" element={<PurchaseList />} />
          <Route path="/purchase-return/:purchaseId" element={<PurchaseReturn />} />
          <Route path="/purchase-returns" element={<PurchaseReturnList />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/expense-categories" element={<ExpenseCategories />} />
          <Route path="/income-categories" element={<IncomeCategories />} />
          <Route path="/loss-profit" element={<LossProfit />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />

          {/* Report Routes */}
          <Route path="/report/sales" element={<SalesReport />} />
          <Route path="/report/sale-returns" element={<SaleReturnReport />} />
          <Route path="/report/purchases" element={<PurchaseReport />} />
          <Route path="/report/purchase-returns" element={<PurchaseReturnReport />} />
          <Route path="/report/sales-tax" element={<SalesTaxReport />} />
          <Route path="/report/purchase-tax" element={<PurchaseTaxReport />} />
          <Route path="/report/income" element={<IncomeReport />} />
          <Route path="/report/expenses" element={<ExpenseReport />} />
          <Route path="/report/stock" element={<StockReport />} />
          <Route path="/report/customer-due" element={<CustomerDueReport />} />
          <Route path="/report/supplier-due" element={<SupplierDueReport />} />
          <Route path="/report/profit-loss-bill" element={<ProfitLossBill />} />
          <Route path="/report/profit-loss-product" element={<ProfitLossProduct />} />
          <Route path="/report/profit-loss-history" element={<ProfitLossHistory />} />
          <Route path="/report/top-customers" element={<TopCustomers />} />
          <Route path="/report/top-suppliers" element={<TopSuppliers />} />
          <Route path="/report/top-products" element={<TopProducts />} />
          <Route path="/report/product-sales" element={<ProductSalesReport />} />
          <Route path="/report/product-purchases" element={<ProductPurchaseReport />} />
          <Route path="/report/discounted" element={<DiscountedProducts />} />
          <Route path="/report/due-transactions" element={<DueTransactions />} />

          {/* HRM Routes */}
          <Route path="/hrm" element={<HRMIndex />} />
          <Route path="/hrm/departments" element={<Departments />} />
          <Route path="/hrm/designations" element={<Designations />} />
          <Route path="/hrm/shifts" element={<Shifts />} />
          <Route path="/hrm/employees" element={<Employees />} />
          <Route path="/hrm/leave-types" element={<LeaveTypes />} />
          <Route path="/hrm/leaves" element={<Leaves />} />
          <Route path="/hrm/holidays" element={<Holidays />} />
          <Route path="/hrm/attendance" element={<AttendanceList />} />
          <Route path="/hrm/payroll" element={<PayrollList />} />
          <Route path="/hrm/attendance-report" element={<AttendanceReport />} />
          <Route path="/hrm/payroll-report" element={<PayrollReport />} />
          <Route path="/hrm/leave-report" element={<LeaveReport />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
