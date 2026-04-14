import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { useMemo } from "react";

const ProfitLossProduct = () => {
  const sales = store.getSales();
  const products = store.getProducts();

  const data = useMemo(() => {
    const map: Record<string, { name: string; sold: number; revenue: number; cost: number; profit: number; loss: number }> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const p = products.find(pr => pr.id === item.productId);
        if (!map[item.productId]) map[item.productId] = { name: item.name, sold: 0, revenue: 0, cost: 0, profit: 0, loss: 0 };
        const m = map[item.productId];
        m.sold += item.quantity;
        m.revenue += item.unitPrice * item.quantity;
        m.cost += (p?.costPrice || 0) * item.quantity;
      });
    });
    return Object.values(map).map(m => {
      const net = m.revenue - m.cost;
      return { ...m, profit: Math.max(0, net), loss: Math.abs(Math.min(0, net)) };
    });
  }, [sales, products]);

  const totalProfit = data.reduce((s, d) => s + d.profit, 0);
  const totalLoss = data.reduce((s, d) => s + d.loss, 0);

  return (
    <ReportPage
      title="Profit & Loss (Product)"
      data={data}
      columns={[
        { key: "name", label: "Product" },
        { key: "sold", label: "Sold" },
        { key: "revenue", label: "Revenue", render: (d) => <span>$ {d.revenue.toFixed(2)}</span> },
        { key: "profit", label: "Profit", render: (d) => <span className="text-green-600 font-semibold">$ {d.profit.toFixed(2)}</span> },
        { key: "loss", label: "Loss", render: (d) => d.loss > 0 ? <span className="text-red-600 font-semibold">$ {d.loss.toFixed(2)}</span> : <span>$ 0</span> },
      ]}
      summaryCards={[
        { label: "Total Profit", value: `$ ${totalProfit.toLocaleString()}`, color: "#27ae60" },
        { label: "Total Loss", value: `$ ${totalLoss.toLocaleString()}`, color: "#e74c3c" },
      ]}
      searchKeys={["name"]}
      showDateFilter={false}
    />
  );
};
export default ProfitLossProduct;
