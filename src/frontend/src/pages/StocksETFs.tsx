import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { type StockHolding, usePortfolio } from "@/context/PortfolioContext";
import { cn } from "@/lib/utils";
import {
  formatDate,
  formatINR,
  formatINRWithSign,
  formatPercent,
  gainLossClass,
  todayStr,
} from "@/utils/format";
import {
  BarChart2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Add/Edit Modal ───────────────────────────────────────────────────────

interface StockFormData {
  symbol: string;
  exchange: string;
  companyName: string;
  quantity: string;
  buyPrice: string;
  buyDate: string;
}

const EMPTY_FORM = (_assetType: "stock" | "etf"): StockFormData => ({
  symbol: "",
  exchange: "NSE",
  companyName: "",
  quantity: "",
  buyPrice: "",
  buyDate: todayStr(),
});

interface StockModalProps {
  open: boolean;
  onClose: () => void;
  assetType: "stock" | "etf";
  editData?: StockHolding | null;
}

function StockModal({ open, onClose, assetType, editData }: StockModalProps) {
  const { addStock, updateStock, addTransaction } = usePortfolio();
  const [form, setForm] = useState<StockFormData>(() => EMPTY_FORM(assetType));

  // Sync form with editData
  useState(() => {
    if (editData) {
      setForm({
        symbol: editData.symbol,
        exchange: editData.exchange,
        companyName: editData.companyName,
        quantity: String(editData.quantity),
        buyPrice: String(editData.buyPrice),
        buyDate: editData.buyDate,
      });
    } else {
      setForm(EMPTY_FORM(assetType));
    }
  });

  // Reset on open
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      if (editData) {
        setForm({
          symbol: editData.symbol,
          exchange: editData.exchange,
          companyName: editData.companyName,
          quantity: String(editData.quantity),
          buyPrice: String(editData.buyPrice),
          buyDate: editData.buyDate,
        });
      } else {
        setForm(EMPTY_FORM(assetType));
      }
    }
  }

  function handleField(field: keyof StockFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number.parseFloat(form.quantity);
    const price = Number.parseFloat(form.buyPrice);
    if (
      !form.symbol ||
      !form.companyName ||
      Number.isNaN(qty) ||
      Number.isNaN(price)
    ) {
      toast.error("Please fill all required fields.");
      return;
    }

    const symbolFormatted = form.symbol.toUpperCase();

    if (editData) {
      updateStock(editData.id, {
        symbol: symbolFormatted,
        exchange: form.exchange,
        companyName: form.companyName,
        quantity: qty,
        buyPrice: price,
        buyDate: form.buyDate,
      });
      toast.success(`${assetType === "etf" ? "ETF" : "Stock"} updated.`);
    } else {
      addStock({
        symbol: symbolFormatted,
        exchange: form.exchange,
        companyName: form.companyName,
        quantity: qty,
        buyPrice: price,
        buyDate: form.buyDate,
        currentPrice: price,
        assetType,
      });
      addTransaction({
        assetType,
        assetName: form.companyName,
        transactionType: "buy",
        quantity: qty,
        price,
        date: form.buyDate,
        notes: `${assetType === "etf" ? "ETF" : "Stock"} purchase`,
      });
      toast.success(
        `${assetType === "etf" ? "ETF" : "Stock"} added to portfolio.`,
      );
    }
    onClose();
  }

  const typeLabel = assetType === "etf" ? "ETF" : "Stock";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-card border-border text-foreground sm:max-w-md"
        data-ocid="stocks.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {editData ? `Edit ${typeLabel}` : `Add ${typeLabel}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-symbol">Symbol</Label>
              <Input
                id="s-symbol"
                placeholder={
                  assetType === "etf" ? "NSE:NIFTYBEES" : "NSE:ICICIBANK"
                }
                className="bg-background border-border uppercase"
                value={form.symbol}
                onChange={(e) => handleField("symbol", e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Format: NSE:ICICIBANK or BSE:RELIANCE
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-exchange">Exchange</Label>
              <Select
                value={form.exchange}
                onValueChange={(v) => handleField("exchange", v)}
              >
                <SelectTrigger
                  id="s-exchange"
                  className="bg-background border-border"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="NSE">NSE</SelectItem>
                  <SelectItem value="BSE">BSE</SelectItem>
                  <SelectItem value="US">US</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-name">Company Name</Label>
            <Input
              id="s-name"
              placeholder="Reliance Industries"
              className="bg-background border-border"
              value={form.companyName}
              onChange={(e) => handleField("companyName", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-qty">Quantity</Label>
              <Input
                id="s-qty"
                type="number"
                step="1"
                min="0"
                placeholder="25"
                className="bg-background border-border"
                value={form.quantity}
                onChange={(e) => handleField("quantity", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-price">Buy Price (₹)</Label>
              <Input
                id="s-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="2450.00"
                className="bg-background border-border"
                value={form.buyPrice}
                onChange={(e) => handleField("buyPrice", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-date">Buy Date</Label>
            <Input
              id="s-date"
              type="date"
              className="bg-background border-border"
              value={form.buyDate}
              max={todayStr()}
              onChange={(e) => handleField("buyDate", e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="stocks.cancel_button"
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid={
                assetType === "etf"
                  ? "etfs.add.submit_button"
                  : "stocks.add.submit_button"
              }
              className="bg-primary text-primary-foreground"
            >
              {editData ? "Save Changes" : `Add ${typeLabel}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── StocksETFs Page ──────────────────────────────────────────────────────

type SortField =
  | "company"
  | "currentPrice"
  | "qty"
  | "invested"
  | "value"
  | "gain"
  | "gainPct";
type SortDir = "asc" | "desc";

interface HoldingsTableProps {
  holdings: StockHolding[];
  onEdit: (h: StockHolding) => void;
  onDelete: (id: string, name: string) => void;
  assetType: "stock" | "etf";
  isLoading: boolean;
}

function HoldingsTable({
  holdings,
  onEdit,
  onDelete,
  assetType,
  isLoading,
}: HoldingsTableProps) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(f: SortField) {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(f);
      setSortDir("desc");
    }
  }

  const sorted = [...holdings].sort((a, b) => {
    const investedA = a.quantity * a.buyPrice;
    const investedB = b.quantity * b.buyPrice;
    const valueA = a.quantity * a.currentPrice;
    const valueB = b.quantity * b.currentPrice;
    const gainA = valueA - investedA;
    const gainB = valueB - investedB;
    const gainPctA = investedA > 0 ? (gainA / investedA) * 100 : 0;
    const gainPctB = investedB > 0 ? (gainB / investedB) * 100 : 0;

    const map: Record<SortField, number> = {
      company: a.companyName.localeCompare(b.companyName),
      currentPrice: a.currentPrice - b.currentPrice,
      qty: a.quantity - b.quantity,
      invested: investedA - investedB,
      value: valueA - valueB,
      gain: gainA - gainB,
      gainPct: gainPctA - gainPctB,
    };
    const raw = map[sortField] ?? 0;
    return sortDir === "asc" ? raw : -raw;
  });

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ChevronUp className="w-3 h-3 text-muted-foreground opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-primary" />
    ) : (
      <ChevronDown className="w-3 h-3 text-primary" />
    );
  }

  function Th({
    field,
    children,
    right,
  }: { field: SortField; children: React.ReactNode; right?: boolean }) {
    return (
      <th
        className={cn(
          "px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none whitespace-nowrap",
          right ? "text-right" : "text-left",
        )}
        onClick={() => handleSort(field)}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && handleSort(field)
        }
      >
        <span className={cn("flex items-center gap-1", right && "justify-end")}>
          {children}
          <SortIcon field={field} />
        </span>
      </th>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {["r1", "r2", "r3"].map((k) => (
          <Skeleton key={k} className="h-12 w-full" />
        ))}
        <div data-ocid="stocks.loading_state" className="sr-only">
          Loading stock data
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div
        data-ocid={`${assetType === "etf" ? "etf" : "stock"}.empty_state`}
        className="py-12 flex flex-col items-center gap-3 text-muted-foreground"
      >
        <BarChart2 className="w-10 h-10 opacity-30" />
        <p className="text-sm">
          No {assetType === "etf" ? "ETFs" : "stocks"} added yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr>
            <Th field="company">Symbol / Company</Th>
            <Th field="currentPrice" right>
              Current Price
            </Th>
            <Th field="qty" right>
              Qty
            </Th>
            <Th field="invested" right>
              Invested
            </Th>
            <Th field="value" right>
              Current Value
            </Th>
            <Th field="gain" right>
              Gain / Loss
            </Th>
            <Th field="gainPct" right>
              Returns
            </Th>
            <th className="px-3 py-2.5 text-right pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => {
            const invested = s.quantity * s.buyPrice;
            const value = s.quantity * s.currentPrice;
            const gain = value - invested;
            const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
            const idx = i + 1;
            return (
              <tr
                key={s.id}
                data-ocid={`${assetType === "etf" ? "etf" : "stock"}.item.${idx}`}
                className="border-b border-border/50 hover:bg-accent/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-foreground">{s.symbol}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.companyName} · {s.exchange}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(s.buyDate)}
                  </p>
                </td>
                <td className="px-3 py-3 text-right number-tabular font-semibold">
                  {formatINR(s.currentPrice)}
                </td>
                <td className="px-3 py-3 text-right number-tabular text-muted-foreground">
                  {s.quantity}
                </td>
                <td className="px-3 py-3 text-right number-tabular text-muted-foreground">
                  {formatINR(invested)}
                </td>
                <td className="px-3 py-3 text-right number-tabular font-semibold">
                  {formatINR(value)}
                </td>
                <td
                  className={cn(
                    "px-3 py-3 text-right number-tabular font-semibold",
                    gainLossClass(gain),
                  )}
                >
                  {formatINRWithSign(gain)}
                </td>
                <td
                  className={cn(
                    "px-3 py-3 text-right number-tabular font-semibold",
                    gainLossClass(gain),
                  )}
                >
                  {formatPercent(gainPct)}
                </td>
                <td className="px-3 py-3 pr-4">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      data-ocid={`${assetType === "etf" ? "etf" : "stock"}.edit_button.${idx}`}
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 hover:bg-accent"
                      onClick={() => onEdit(s)}
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      data-ocid={`${assetType === "etf" ? "etf" : "stock"}.delete_button.${idx}`}
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 hover:bg-loss/20 hover:text-loss"
                      onClick={() => onDelete(s.id, s.companyName)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function StocksETFs() {
  const {
    stocks,
    deleteStock,
    isRefreshingStocks,
    refreshStockPrices,
    totals,
  } = usePortfolio();
  const [activeTab, setActiveTab] = useState<"stock" | "etf">("stock");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StockHolding | null>(null);

  const stocksList = stocks.filter((s) => s.assetType === "stock");
  const etfsList = stocks.filter((s) => s.assetType === "etf");
  const currentList = activeTab === "stock" ? stocksList : etfsList;

  const activeValue =
    activeTab === "stock" ? totals.stockValue : totals.etfValue;
  const activeInvested =
    activeTab === "stock" ? totals.stockInvested : totals.etfInvested;
  const activeGain = activeValue - activeInvested;
  const activeGainPct =
    activeInvested > 0 ? (activeGain / activeInvested) * 100 : 0;

  function handleDelete(id: string, name: string) {
    if (confirm(`Remove "${name}" from portfolio?`)) {
      deleteStock(id);
      toast.success("Holding removed.");
    }
  }

  function handleEdit(h: StockHolding) {
    setEditTarget(h);
    setActiveTab(h.assetType);
    setModalOpen(true);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Stocks & ETFs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stocksList.length} stocks, {etfsList.length} ETFs ·{" "}
            <span
              className={gainLossClass(
                totals.stockValue +
                  totals.etfValue -
                  totals.stockInvested -
                  totals.etfInvested,
              )}
            >
              {formatINRWithSign(
                totals.stockValue +
                  totals.etfValue -
                  totals.stockInvested -
                  totals.etfInvested,
              )}{" "}
              overall
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-ocid="stocks.refresh.button"
            variant="outline"
            size="sm"
            onClick={refreshStockPrices}
            disabled={isRefreshingStocks}
            className="border-border gap-2"
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5",
                isRefreshingStocks && "animate-spin",
              )}
            />
            {isRefreshingStocks ? "Updating…" : "Refresh Prices"}
          </Button>
          <Button
            data-ocid={
              activeTab === "etf"
                ? "etfs.add.open_modal_button"
                : "stocks.add.open_modal_button"
            }
            onClick={() => {
              setEditTarget(null);
              setModalOpen(true);
            }}
            className="bg-primary text-primary-foreground gap-2"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add {activeTab === "etf" ? "ETF" : "Stock"}
          </Button>
        </div>
      </div>

      {/* Tab + Summary */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-secondary rounded-lg p-1">
          <button
            data-ocid="stocks.tab"
            type="button"
            onClick={() => setActiveTab("stock")}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              activeTab === "stock"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Stocks ({stocksList.length})
          </button>
          <button
            data-ocid="etfs.tab"
            type="button"
            onClick={() => setActiveTab("etf")}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              activeTab === "etf"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            ETFs ({etfsList.length})
          </button>
        </div>

        <div className="flex gap-3">
          {[
            { label: "Invested", value: formatINR(activeInvested) },
            { label: "Current", value: formatINR(activeValue) },
            {
              label: "Gain/Loss",
              value: `${formatINRWithSign(activeGain)} (${formatPercent(activeGainPct)})`,
              cls: gainLossClass(activeGain),
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-card border border-border rounded-lg px-3 py-1.5"
            >
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("text-sm font-semibold number-tabular", s.cls)}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card border-border shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {activeTab === "etf" ? "ETF" : "Stock"} Holdings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <HoldingsTable
            holdings={currentList}
            onEdit={handleEdit}
            onDelete={handleDelete}
            assetType={activeTab}
            isLoading={isRefreshingStocks}
          />
        </CardContent>
      </Card>

      <StockModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTarget(null);
        }}
        assetType={activeTab}
        editData={editTarget}
      />
    </div>
  );
}
