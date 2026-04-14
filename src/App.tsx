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
          <Route path="/hrm" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
