import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { useMemo } from "react";

const DiscountedProducts = () => {
  const sales = store.getSales();
  const data = useMemo(() => {
    const list: { invoiceNo: string; date: string; productName: string; quantity: number; unitPrice: number; discount: number; total: number }[] = [];
    sales.forEach(s => {
      s.items.forEach(item => {
        if (item.discount > 0) {
          list.push({ invoiceNo: s.invoiceNo, date: s.date, productName: item.name, quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount, total: item.quantity * item.unitPrice - item.discount });
        }
      });
    });
    return list;
  }, [sales]);

  return (
    <ReportPage
      title="Discounted Products"
      data={data}
      columns={[
        { key: "date", label: "Date" },
        { key: "invoiceNo", label: "Invoice" },
        { key: "productName", label: "Product" },
        { key: "quantity", label: "Qty" },
        { key: "discount", label: "Discount", render: (d) => <span className="text-orange-600 font-semibold">$ {d.discount.toFixed(2)}</span> },
        { key: "total", label: "Total", render: (d) => <span>$ {d.total.toFixed(2)}</span> },
      ]}
      searchKeys={["productName", "invoiceNo"]}
      dateKey="date"
    />
  );
};
export default DiscountedProducts;
