import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRef, useState } from "react";
import { MessageCircle, Printer, ImageDown, Loader2 } from "lucide-react";
import { store } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import { toPng } from "html-to-image";

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

// ── Invoice body renderer (shared between visible + capture copies) ────────────
const InvoiceBody = ({
  data,
  captureRef,
}: {
  data: InvoiceData;
  captureRef?: React.RefObject<HTMLDivElement | null>;
}) => {
  const biz = store.getBusinessProfile();
  const partyLabel = data.type.includes("Purchase") ? "Supplier" : "Customer";
  const partyName = data.supplierName || data.customerName || "N/A";
  const phone = data.phone?.trim() || undefined;
  const statusColor =
    data.due > 0 ? (data.paid > 0 ? "#f59e0b" : "#ef4444") : "#22c55e";
  const statusLabel =
    data.due > 0 ? (data.paid > 0 ? "PARTIAL" : "UNPAID") : "PAID";

  return (
    <div
      ref={captureRef}
      style={{
        background: "#fff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: "#1a1a1a",
        width: "100%",
      }}
    >
      {/* Gradient header */}
      <div
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
          padding: "24px 24px 18px",
          textAlign: "center",
        }}
      >
        {biz.logo && (
          <img
            src={biz.logo}
            alt="Logo"
            style={{
              width: 52,
              height: 52,
              objectFit: "contain",
              borderRadius: 8,
              marginBottom: 10,
              background: "white",
              padding: 4,
            }}
          />
        )}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: 0.5 }}>
          {biz.companyName}
        </h1>
        {biz.address && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.88)", marginTop: 4 }}>
            {biz.address}
          </p>
        )}
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.88)", marginTop: 3 }}>
          {[biz.phone && `Tel: ${biz.phone}`, biz.email && `Email: ${biz.email}`]
            .filter(Boolean)
            .join("  |  ")}
        </p>
      </div>

      {/* Invoice meta */}
      <div
        style={{
          background: "#fafafa",
          borderBottom: "1px solid #e5e7eb",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <p style={{ fontWeight: 700, fontSize: 13 }}>{data.type} Invoice</p>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
            Invoice: <strong style={{ color: "#111" }}>{data.invoiceNo}</strong>
          </p>
          <p style={{ fontSize: 11, color: "#6b7280" }}>
            Date: <strong style={{ color: "#111" }}>{data.date}</strong>
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 11, color: "#6b7280" }}>{partyLabel}:</p>
          <p style={{ fontWeight: 700, fontSize: 13 }}>{partyName}</p>
          {phone && <p style={{ fontSize: 11, color: "#6b7280" }}>{phone}</p>}
        </div>
      </div>

      {/* Items table */}
      <div style={{ padding: "16px 20px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["#", "Item", "Qty", "Price", "Total"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: "8px",
                    textAlign: i > 1 ? "right" : "left",
                    fontWeight: 600,
                    color: "#374151",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                <td style={{ padding: "7px 8px", border: "1px solid #e5e7eb", color: "#9ca3af" }}>{i + 1}</td>
                <td style={{ padding: "7px 8px", border: "1px solid #e5e7eb", fontWeight: 500 }}>{item.name}</td>
                <td style={{ padding: "7px 8px", border: "1px solid #e5e7eb", textAlign: "right" }}>{item.quantity}</td>
                <td style={{ padding: "7px 8px", border: "1px solid #e5e7eb", textAlign: "right" }}>
                  {biz.currency} {item.unitPrice.toFixed(2)}
                </td>
                <td style={{ padding: "7px 8px", border: "1px solid #e5e7eb", textAlign: "right", fontWeight: 600 }}>
                  {biz.currency} {(item.quantity * item.unitPrice).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ padding: "0 20px 16px", display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            width: 230,
            background: "#f9fafb",
            borderRadius: 10,
            padding: "12px 16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <TRow label="Subtotal" value={`${biz.currency} ${data.subtotal.toFixed(2)}`} />
          {(data.vat ?? 0) > 0 && (
            <TRow label={`VAT (${data.vatPercent}%)`} value={`${biz.currency} ${data.vat?.toFixed(2)}`} />
          )}
          {data.discount > 0 && (
            <TRow label="Discount" value={`- ${biz.currency} ${data.discount.toFixed(2)}`} vc="#ef4444" />
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 800,
              fontSize: 15,
              color: "#b45309",
              borderTop: "2px solid #f59e0b",
              paddingTop: 8,
              paddingBottom: 6,
            }}
          >
            <span>Total</span>
            <span>{biz.currency} {data.total.toFixed(2)}</span>
          </div>
          <TRow label="Paid" value={`${biz.currency} ${data.paid.toFixed(2)}`} vc="#22c55e" bold />
          {data.due > 0 && (
            <TRow label="Due" value={`${biz.currency} ${data.due.toFixed(2)}`} vc="#ef4444" bold />
          )}
          {(data.change ?? 0) > 0 && (
            <TRow label="Change" value={`${biz.currency} ${(data.change ?? 0).toFixed(2)}`} vc="#22c55e" bold />
          )}
        </div>
      </div>

      {/* Status + footer */}
      <div
        style={{
          padding: "14px 24px 22px",
          textAlign: "center",
          borderTop: "1px solid #e5e7eb",
          background: "#fafafa",
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: statusColor,
            color: "#fff",
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: 1.5,
            padding: "5px 22px",
            borderRadius: 20,
            marginBottom: 10,
          }}
        >
          {statusLabel}
        </span>
        <p style={{ fontSize: 11, color: "#9ca3af" }}>Thank you for your business!</p>
        <p style={{ fontSize: 10, color: "#d1d5db", marginTop: 3 }}>
          Generated by {biz.companyName}
        </p>
      </div>
    </div>
  );
};

const TRow = ({
  label,
  value,
  vc,
  bold,
}: {
  label: string;
  value?: string;
  vc?: string;
  bold?: boolean;
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      paddingBottom: 5,
      fontWeight: bold ? 600 : 400,
    }}
  >
    <span style={{ color: "#6b7280" }}>{label}</span>
    <span style={{ color: vc ?? "#111" }}>{value}</span>
  </div>
);

// ── Main modal ────────────────────────────────────────────────────────────────
const InvoiceModal = ({ open, onClose, data }: InvoiceModalProps) => {
  const biz = store.getBusinessProfile();
  // printRef  → visible (scrollable) — used for printing
  // captureRef → hidden, full-width, always laid out — used for image export
  const printRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [exportingImage, setExportingImage] = useState(false);

  const phone = data.phone?.trim() || undefined;

  const buildWhatsappText = () => {
    const partyLabel = data.type.includes("Purchase") ? "Supplier" : "Customer";
    const partyName = data.supplierName || data.customerName || "N/A";
    const toM = (v: number) => formatCurrency(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return [
      `*${biz.companyName}*`,
      `${data.type} Invoice`,
      `Invoice: ${data.invoiceNo}`,
      `Date: ${data.date}`,
      `${partyLabel}: ${partyName}`,
      ...(phone ? [`Phone: ${phone}`] : []),
      "",
      "*Items:*",
      ...data.items.map((it, i) => `${i + 1}. ${it.name} x${it.quantity} = ${toM(it.unitPrice * it.quantity)}`),
      "",
      `Subtotal: ${toM(data.subtotal)}`,
      ...(data.vat && data.vat > 0 ? [`VAT (${data.vatPercent ?? 0}%): ${toM(data.vat)}`] : []),
      ...(data.discount > 0 ? [`Discount: -${toM(data.discount)}`] : []),
      `*Total: ${toM(data.total)}*`,
      `Paid: ${toM(data.paid)}`,
      ...(data.due > 0 ? [`Due: ${toM(data.due)}`] : []),
      ...((data.change ?? 0) > 0 ? [`Change: ${toM(data.change ?? 0)}`] : []),
      "",
      "Thank you for your business!",
    ].join("\n");
  };

  // ── Capture: use the off-screen captureRef (always rendered, full width, no scroll clip) ──
  const captureImage = async (): Promise<Blob | null> => {
    const node = captureRef.current;
    if (!node) return null;
    // Small delay so fonts and any images finish loading after the modal opens.
    await new Promise((r) => setTimeout(r, 120));
    const dataUrl = await toPng(node, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      cacheBust: true,
    });
    const res = await fetch(dataUrl);
    return res.blob();
  };

  const handleShareWhatsappText = () => {
    const text = encodeURIComponent(buildWhatsappText());
    const raw = phone?.replace(/[^\d]/g, "") ?? "";
    window.open(
      raw ? `https://wa.me/${raw}?text=${text}` : `https://wa.me/?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleShareWhatsappImage = async () => {
    setExportingImage(true);
    try {
      const blob = await captureImage();
      if (!blob) { handleShareWhatsappText(); return; }
      const file = new File([blob], `Invoice-${data.invoiceNo}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Invoice ${data.invoiceNo}`, text: buildWhatsappText() });
        return;
      }
      handleShareWhatsappText();
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") handleShareWhatsappText();
    } finally {
      setExportingImage(false);
    }
  };

  const handleExportImage = async () => {
    setExportingImage(true);
    try {
      const blob = await captureImage();
      if (!blob) return;
      const filename = `Invoice-${data.invoiceNo}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") console.error("Image export failed:", err);
    } finally {
      setExportingImage(false);
    }
  };

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${data.invoiceNo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{margin:0;size:A4;}}
  </style>
</head>
<body>${node.innerHTML}</body>
<script>setTimeout(()=>{window.print();},400);<\/script>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  return (
    <>
      {/* ── Hidden capture target (full width, no height limit, off-screen) ── */}
      {/* NOTE: no visibility/opacity hiding — those are inherited and make html-to-image
          produce blank output. Off-screen positioning alone keeps it invisible. */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: "-9999px",
            width: 620,
            background: "#fff",
            pointerEvents: "none",
          }}
        >
          <InvoiceBody data={data} captureRef={captureRef} />
        </div>
      )}

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[420px] p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          {/* Toolbar */}
          <DialogHeader className="px-4 py-2.5 border-b border-border bg-background shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-bold">Invoice Preview</DialogTitle>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleShareWhatsappImage}
                  disabled={exportingImage}
                  className="bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-60"
                >
                  {exportingImage ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
                  WhatsApp
                </button>
                <button
                  onClick={handleExportImage}
                  disabled={exportingImage}
                  className="bg-blue-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-60"
                >
                  {exportingImage ? <Loader2 size={12} className="animate-spin" /> : <ImageDown size={12} />}
                  Image
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-primary text-primary-foreground px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Printer size={12} /> PDF
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable visible invoice */}
          <div className="overflow-y-auto max-h-[78vh]">
            <div ref={printRef}>
              <InvoiceBody data={data} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoiceModal;
