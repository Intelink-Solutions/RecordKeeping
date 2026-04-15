import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/currency";

const TopCustomers = () => {
  const sales = store.getSales();
  const data = useMemo(() => {
    const map: Record<string, { name: string; orders: number; totalQty: number; totalAmount: number }> = {};
    sales.forEach(s => {
      if (s.customerId === "0") return;
      if (!map[s.customerId]) map[s.customerId] = { name: s.customerName, orders: 0, totalQty: 0, totalAmount: 0 };
      map[s.customerId].orders++;
      map[s.customerId].totalQty += s.items.reduce((sum, i) => sum + i.quantity, 0);
      map[s.customerId].totalAmount += s.total;
    });
    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty).slice(0, 5);
  }, [sales]);

  return (
    <ReportPage
      title="Top 5 Customers"
      data={data}
      columns={[
        { key: "name", label: "Customer" },
        { key: "orders", label: "Orders" },
        { key: "totalQty", label: "Qty Bought" },
        { key: "totalAmount", label: "Total", render: (d) => <span className="font-semibold">{formatCurrency(d.totalAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
      ]}
      searchKeys={["name"]}
      showDateFilter={false}
    />
  );
};
export default TopCustomers;
