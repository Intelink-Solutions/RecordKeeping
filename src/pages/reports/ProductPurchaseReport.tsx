import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/currency";

const ProductPurchaseReport = () => {
  const purchases = store.getPurchases();
  const data = useMemo(() => {
    const list: { date: string; productName: string; quantity: number; unitPrice: number; total: number; invoiceNo: string }[] = [];
    purchases.forEach(p => {
      p.items.forEach(item => {
        list.push({ date: p.date, productName: item.name, quantity: item.quantity, unitPrice: item.unitPrice, total: item.quantity * item.unitPrice, invoiceNo: p.invoiceNo });
      });
    });
    return list;
  }, [purchases]);

  return (
    <ReportPage
      title="Product-wise Purchases"
      data={data}
      columns={[
        { key: "date", label: "Date" },
        { key: "invoiceNo", label: "Invoice" },
        { key: "productName", label: "Product" },
        { key: "quantity", label: "Qty" },
        { key: "unitPrice", label: "Price", render: (d) => <span>{formatCurrency(d.unitPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
        { key: "total", label: "Total", render: (d) => <span className="font-semibold">{formatCurrency(d.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
      ]}
      searchKeys={["productName", "invoiceNo"]}
      dateKey="date"
    />
  );
};
export default ProductPurchaseReport;
