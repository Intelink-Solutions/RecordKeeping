import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { useMemo } from "react";

const TopSuppliers = () => {
  const purchases = store.getPurchases();
  const data = useMemo(() => {
    const map: Record<string, { name: string; orders: number; totalQty: number; totalAmount: number }> = {};
    purchases.forEach(p => {
      if (!map[p.supplierId]) map[p.supplierId] = { name: p.supplierName, orders: 0, totalQty: 0, totalAmount: 0 };
      map[p.supplierId].orders++;
      map[p.supplierId].totalQty += p.items.reduce((sum, i) => sum + i.quantity, 0);
      map[p.supplierId].totalAmount += p.total;
    });
    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty).slice(0, 5);
  }, [purchases]);

  return (
    <ReportPage
      title="Top 5 Suppliers"
      data={data}
      columns={[
        { key: "name", label: "Supplier" },
        { key: "orders", label: "Orders" },
        { key: "totalQty", label: "Qty Supplied" },
        { key: "totalAmount", label: "Total", render: (d) => <span className="font-semibold">$ {d.totalAmount.toFixed(2)}</span> },
      ]}
      searchKeys={["name"]}
      showDateFilter={false}
    />
  );
};
export default TopSuppliers;
