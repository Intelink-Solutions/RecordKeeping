import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Search, Download, Printer } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface SummaryCard {
  label: string;
  value: string;
  color: string;
}

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface ReportPageProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  summaryCards?: SummaryCard[];
  searchKeys?: (keyof T)[];
  dateKey?: keyof T;
  showDateFilter?: boolean;
  onRowClick?: (item: T) => void;
}

function ReportPage<T extends Record<string, unknown>>({
  title, data, columns, summaryCards, searchKeys = [], dateKey, showDateFilter = true, onRowClick,
}: ReportPageProps<T>) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [perPage, setPerPage] = useState(25);

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const matchSearch = !debouncedSearch || searchKeys.some((k) =>
        String(item[k]).toLowerCase().includes(debouncedSearch.toLowerCase())
      );
      const matchFrom = !fromDate || !dateKey || String(item[dateKey]) >= fromDate;
      const matchTo = !toDate || !dateKey || String(item[dateKey]) <= toDate;
      return matchSearch && matchFrom && matchTo;
    });
  }, [data, debouncedSearch, fromDate, toDate, searchKeys, dateKey]);

  const displayed = filtered.slice(0, perPage);

  const exportCSV = () => {
    const header = columns.map((c) => c.label).join(",");
    const rows = filtered.map((item) =>
      columns.map((c) => `"${String(item[c.key] ?? "")}"`).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${title.replace(/\s/g, "_")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader title={title} />
      <div className="px-4 py-4 space-y-4">
        {/* Summary Cards */}
        {summaryCards && summaryCards.length > 0 && (
          <div className={`grid grid-cols-${Math.min(summaryCards.length, 3)} gap-3`}>
            {summaryCards.map((card) => (
              <div key={card.label} className="bg-card rounded-xl p-3.5 shadow-sm border border-border text-center">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="font-bold text-lg" style={{ color: card.color }}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {showDateFilter && (
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="From" />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="To" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="text-xs bg-muted rounded-lg px-3 py-2 border border-border">
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <div className="flex-1" />
            <button onClick={exportCSV} className="flex items-center gap-1 text-xs bg-muted px-3 py-2 rounded-lg border border-border font-medium">
              <Download size={14} /> CSV
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1 text-xs bg-muted px-3 py-2 rounded-lg border border-border font-medium">
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  {columns.map((col) => (
                    <th key={col.key} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 ? (
                  <tr><td colSpan={columns.length} className="text-center py-8 text-muted-foreground text-sm">No data found</td></tr>
                ) : (
                  displayed.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className={`border-t border-border ${onRowClick ? "hover:bg-muted/50 cursor-pointer transition-colors" : ""}`}
                      onClick={() => onRowClick?.(item)}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className="px-3 py-2.5 whitespace-nowrap text-xs">
                          {col.render ? col.render(item) : String(item[col.key] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground">
            Showing {displayed.length} of {filtered.length} entries
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export default ReportPage;
