import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/currency";

const TopProducts = () => {
  const sales = store.getSales();
  const data = useMemo(() => {
    const map: Record<string, { name: string; totalQty: number; totalRevenue: number }> = {};
    sales.forEach(s => {
      s.items.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.name, totalQty: 0, totalRevenue: 0 };
        map[item.productId].totalQty += item.quantity;
        map[item.productId].totalRevenue += item.unitPrice * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty).slice(0, 5);
  }, [sales]);

  return (
    <ReportPage
      title="Top 5 Products"
      data={data}
      columns={[
        { key: "name", label: "Product" },
        { key: "totalQty", label: "Qty Sold" },
        { key: "totalRevenue", label: "Revenue", render: (d) => <span className="font-semibold">{formatCurrency(d.totalRevenue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
      ]}
      searchKeys={["name"]}
      showDateFilter={false}
    />
  );
};
export default TopProducts;
