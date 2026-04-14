import ReportPage from "@/components/ReportPage";
import { store } from "@/lib/store";

const StockReport = () => {
  const products = store.getProducts();
  const totalQty = products.reduce((s, p) => s + p.stock, 0);
  const totalValue = products.reduce((s, p) => s + p.costPrice * p.stock, 0);

  return (
    <ReportPage
      title="Stock Report"
      data={products}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Product" },
        { key: "stock", label: "Qty", render: (p) => (
          <span className={`font-semibold ${p.stock <= p.alertQty ? "text-destructive" : ""}`}>{p.stock}</span>
        )},
        { key: "costPrice", label: "Cost", render: (p) => <span>$ {p.costPrice}</span> },
        { key: "retailPrice", label: "Retail", render: (p) => <span>$ {p.retailPrice}</span> },
      ]}
      summaryCards={[
        { label: "Total Quantity", value: totalQty.toLocaleString(), color: "#2980b9" },
        { label: "Stock Value", value: `$ ${totalValue.toLocaleString()}`, color: "#27ae60" },
      ]}
      searchKeys={["name", "code"]}
      showDateFilter={false}
    />
  );
};
export default StockReport;
