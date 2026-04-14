import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Parties from "./pages/Parties";
import Products from "./pages/Products";
import AddSale from "./pages/AddSale";
import SalesList from "./pages/SalesList";
import SaleReturn from "./pages/SaleReturn";
import SaleReturnList from "./pages/SaleReturnList";
import AddPurchase from "./pages/AddPurchase";
import PurchasesList from "./pages/PurchasesList";
import PurchaseReturn from "./pages/PurchaseReturn";
import PurchaseReturnList from "./pages/PurchaseReturnList";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import DueList from "./pages/DueList";
import StockList from "./pages/StockList";
import Expenses from "./pages/Expenses";
import Incomes from "./pages/Incomes";
import Categories from "./pages/Categories";
import Brands from "./pages/Brands";
import Units from "./pages/Units";
import VatSettings from "./pages/VatSettings";
import LossProfit from "./pages/LossProfit";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import HRM from "./pages/HRM";
import Departments from "./pages/Departments";
import Employees from "./pages/Employees";
import NotFound from "./pages/NotFound";

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
          <Route path="/parties" element={<Parties />} />
          <Route path="/products" element={<Products />} />
          <Route path="/add-sale" element={<AddSale />} />
          <Route path="/sales" element={<SalesList />} />
          <Route path="/sale-return/:saleId" element={<SaleReturn />} />
          <Route path="/sale-returns" element={<SaleReturnList />} />
          <Route path="/add-purchase" element={<AddPurchase />} />
          <Route path="/purchases" element={<PurchasesList />} />
          <Route path="/purchase-return/:purchaseId" element={<PurchaseReturn />} />
          <Route path="/purchase-returns" element={<PurchaseReturnList />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/due-list" element={<DueList />} />
          <Route path="/stock-list" element={<StockList />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/incomes" element={<Incomes />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/brands" element={<Brands />} />
          <Route path="/units" element={<Units />} />
          <Route path="/vat-settings" element={<VatSettings />} />
          <Route path="/loss-profit" element={<LossProfit />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/hrm" element={<HRM />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
