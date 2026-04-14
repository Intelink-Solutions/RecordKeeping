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
          <Route path="/parties" element={<Parties />} />
          <Route path="/products" element={<Products />} />
          <Route path="/add-sale" element={<AddSale />} />
          <Route path="/sales" element={<SalesList />} />
          <Route path="/loss-profit" element={<LossProfit />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/purchases" element={<SalesList />} />
          <Route path="/due-list" element={<Parties />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
