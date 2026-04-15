import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRef } from "react";
import { MessageCircle, Printer } from "lucide-react";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";

interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

interface InvoiceData {
  invoiceNo: string;
  date: string;
  customerName?: string;
  supplierName?: string;
  phone?: string;
  items: InvoiceItem[];
  subtotal: number;
  vat?: number;
  vatPercent?: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  change?: number;
  type: "Sale" | "Purchase" | "Sale Return" | "Purchase Return";
}

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  data: InvoiceData;
}

const InvoiceModal = ({ open, onClose, data }: InvoiceModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const biz = store.getBusinessProfile();

  const toMoney = (value: number) => formatCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const sanitizePhoneForWhatsapp = (phone?: string): string => {
    if (!phone) return "";
    return phone.replace(/[^\d]/g, "");
  };

  const buildWhatsappMessage = (): string => {
    const partyLabel = data.type.includes("Purchase") ? "Supplier" : "Customer";
    const partyName = data.supplierName || data.customerName || "N/A";
    const lines = [
      `*${biz.companyName}*`,
      `${data.type} Invoice`,
      `Invoice: ${data.invoiceNo}`,
      `Date: ${data.date}`,
      `${partyLabel}: ${partyName}`,
      ...(data.phone ? [`Phone: ${data.phone}`] : []),
      "",
      "*Items:*",
      ...data.items.map((item, i) => `${i + 1}. ${item.name} x${item.quantity} = ${toMoney(item.quantity * item.unitPrice)}`),
      "",
      `Subtotal: ${toMoney(data.subtotal)}`,
      ...(data.vat && data.vat > 0 ? [`VAT (${data.vatPercent ?? 0}%): ${toMoney(data.vat)}`] : []),
      ...(data.discount > 0 ? [`Discount: -${toMoney(data.discount)}`] : []),
      `*Total: ${toMoney(data.total)}*`,
      `Paid: ${toMoney(data.paid)}`,
      ...(data.due > 0 ? [`Due: ${toMoney(data.due)}`] : []),
      ...((data.change ?? 0) > 0 ? [`Change: ${toMoney(data.change ?? 0)}`] : []),
      "",
      "Thank you for your business!",
    ];

    return lines.join("\n");
  };

  const handleShareWhatsapp = () => {
    const text = encodeURIComponent(buildWhatsappMessage());
    const phone = sanitizePhoneForWhatsapp(data.phone);
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice ${data.invoiceNo}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', sans-serif; padding: 20px; font-size: 12px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 12px; }
        .header h1 { font-size: 18px; font-weight: 800; }
        .header p { font-size: 11px; color: #666; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th { background: #f5f5f5; text-align: left; padding: 6px 8px; font-size: 11px; border: 1px solid #ddd; }
        td { padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; }
        .totals { margin-left: auto; width: 200px; }
        .totals div { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
        .totals .total-row { font-weight: bold; font-size: 13px; border-top: 2px solid #333; padding-top: 6px; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
      </style></head><body>
      ${content.innerHTML}
      <script>window.print();window.close();</script>
      </body></html>
    `);
    win.document.close();
  };

  const partyLabel = data.type.includes("Purchase") ? "Supplier" : "Customer";
  const partyName = data.supplierName || data.customerName || "N/A";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Invoice Preview
            <div className="flex items-center gap-2">
              <button onClick={handleShareWhatsapp} className="bg-success text-success-foreground px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
                <MessageCircle size={14} /> WhatsApp
              </button>
              <button onClick={handlePrint} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
                <Printer size={14} /> Print
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          <div className="header">
            {biz.logo && <img src={biz.logo} alt="Logo" style={{ width: 48, height: 48, objectFit: "contain", margin: "0 auto 6px" }} />}
            <h1>{biz.companyName}</h1>
            <p>{biz.address}</p>
            <p>Phone: {biz.phone} | Email: {biz.email}</p>
          </div>

          <div className="meta" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 12 }}>
            <div>
              <p><strong>{data.type} Invoice</strong></p>
              <p>Invoice: {data.invoiceNo}</p>
              <p>Date: {data.date}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p><strong>{partyLabel}:</strong> {partyName}</p>
              {data.phone && <p>Phone: {data.phone}</p>}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "left", fontSize: 11 }}>#</th>
                <th style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "left", fontSize: 11 }}>Item</th>
                <th style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontSize: 11 }}>Qty</th>
                <th style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontSize: 11 }}>Price</th>
                <th style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontSize: 11 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 8px", border: "1px solid #ddd", fontSize: 11 }}>{i + 1}</td>
                  <td style={{ padding: "6px 8px", border: "1px solid #ddd", fontSize: 11 }}>{item.name}</td>
                  <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontSize: 11 }}>{item.quantity}</td>
                  <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontSize: 11 }}>{biz.currency} {item.unitPrice.toFixed(2)}</td>
                  <td style={{ padding: "6px 8px", border: "1px solid #ddd", textAlign: "right", fontSize: 11 }}>{biz.currency} {(item.quantity * item.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginLeft: "auto", width: 200 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11 }}>
              <span>Subtotal:</span><span>{biz.currency} {data.subtotal.toFixed(2)}</span>
            </div>
            {(data.vat ?? 0) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11 }}>
                <span>VAT ({data.vatPercent}%):</span><span>{biz.currency} {data.vat?.toFixed(2)}</span>
              </div>
            )}
            {data.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11 }}>
                <span>Discount:</span><span>- {biz.currency} {data.discount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 3px", fontSize: 13, fontWeight: "bold", borderTop: "2px solid #333" }}>
              <span>Total:</span><span>{biz.currency} {data.total.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11 }}>
              <span>Paid:</span><span>{biz.currency} {data.paid.toFixed(2)}</span>
            </div>
            {data.due > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11, color: "#e74c3c" }}>
                <span>Due:</span><span>{biz.currency} {data.due.toFixed(2)}</span>
              </div>
            )}
            {(data.change ?? 0) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11, color: "#27ae60" }}>
                <span>Change:</span><span>{biz.currency} {data.change?.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="footer" style={{ textAlign: "center", marginTop: 20, fontSize: 10, color: "#999", borderTop: "1px solid #ddd", paddingTop: 8 }}>
            <p>Thank you for your business!</p>
            <p>Generated by {biz.companyName}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;
