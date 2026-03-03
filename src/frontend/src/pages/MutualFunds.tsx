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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type MutualFundHolding,
  usePortfolio,
} from "@/context/PortfolioContext";
import { cn } from "@/lib/utils";
import {
  calcCAGR,
  formatDate,
  formatINR,
  formatINRWithSign,
  formatPercent,
  gainLossClass,
  todayStr,
  yearsBetween,
} from "@/utils/format";
import { type MFSearchResult, searchMutualFunds } from "@/utils/priceService";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Add/Edit Fund Modal ──────────────────────────────────────────────────

interface FundFormData {
  schemeCode: string;
  schemeName: string;
  units: string;
  purchaseNAV: string;
  purchaseDate: string;
}

const EMPTY_FORM: FundFormData = {
  schemeCode: "",
  schemeName: "",
  units: "",
  purchaseNAV: "",
  purchaseDate: todayStr(),
};

interface FundModalProps {
  open: boolean;
  onClose: () => void;
  editData?: MutualFundHolding | null;
}

function FundModal({ open, onClose, editData }: FundModalProps) {
  const { addMutualFund, updateMutualFund, addTransaction } = usePortfolio();
  const [form, setForm] = useState<FundFormData>(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MFSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [fundSelected, setFundSelected] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Populate form when modal opens
  useEffect(() => {
    if (!open) return;
    if (editData) {
      setForm({
        schemeCode: editData.schemeCode,
        schemeName: editData.schemeName,
        units: String(editData.units),
        purchaseNAV: String(editData.purchaseNAV),
        purchaseDate: editData.purchaseDate,
      });
      setFundSelected(true);
      setSearchQuery(editData.schemeName);
    } else {
      setForm(EMPTY_FORM);
      setFundSelected(false);
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open, editData]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchMutualFunds(q);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchQuery(val);
    setFundSelected(false);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(val), 400);
  }

  function selectFund(fund: MFSearchResult) {
    setForm((prev) => ({
      ...prev,
      schemeCode: fund.schemeCode,
      schemeName: fund.schemeName,
    }));
    setSearchQuery(fund.schemeName);
    setFundSelected(true);
    setSearchResults([]);
  }

  function handleField(field: keyof FundFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const units = Number.parseFloat(form.units);
    const nav = Number.parseFloat(form.purchaseNAV);
    if (
      !form.schemeCode ||
      !form.schemeName ||
      Number.isNaN(units) ||
      Number.isNaN(nav)
    ) {
      toast.error("Please fill all required fields.");
      return;
    }

    if (editData) {
      updateMutualFund(editData.id, {
        units,
        purchaseNAV: nav,
        purchaseDate: form.purchaseDate,
        schemeCode: form.schemeCode,
        schemeName: form.schemeName,
      });
      toast.success("Fund updated successfully.");
    } else {
      addMutualFund({
        schemeCode: form.schemeCode,
        schemeName: form.schemeName,
        units,
        purchaseNAV: nav,
        purchaseDate: form.purchaseDate,
        currentNAV: nav,
      });
      addTransaction({
        assetType: "mutualfund",
        assetName: form.schemeName,
        transactionType: "buy",
        quantity: units,
        price: nav,
        date: form.purchaseDate,
        notes: "Added to portfolio",
      });
      toast.success("Fund added successfully.");
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-card border-border text-foreground sm:max-w-lg"
        data-ocid="mf.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {editData ? "Edit Fund" : "Add Mutual Fund"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search */}
          {!editData && (
            <div className="space-y-1.5">
              <Label>Search Fund</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  data-ocid="mf.search.input"
                  className="pl-9 bg-background border-border"
                  placeholder="Type fund name (min 3 chars)…"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setFundSelected(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search results */}
              {(isSearching || searchResults.length > 0) && !fundSelected && (
                <ScrollArea className="max-h-48 border border-border rounded-lg bg-background">
                  {isSearching ? (
                    <div className="p-3 space-y-2">
                      {["s1", "s2", "s3", "s4"].map((k) => (
                        <Skeleton key={k} className="h-9 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="p-1">
                      {searchResults.map((r) => (
                        <button
                          key={r.schemeCode}
                          type="button"
                          onClick={() => selectFund(r)}
                          className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                        >
                          <p className="font-medium text-foreground truncate">
                            {r.schemeName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Code: {r.schemeCode}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}

              {fundSelected && (
                <p className="text-xs text-gain flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gain inline-block" />
                  {form.schemeName} (Code: {form.schemeCode})
                </p>
              )}
            </div>
          )}

          {editData && (
            <div className="space-y-1.5">
              <Label>Fund Name</Label>
              <p className="text-sm text-muted-foreground bg-background rounded-lg px-3 py-2 border border-border">
                {form.schemeName}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="modal-units">Units Held</Label>
              <Input
                id="modal-units"
                type="number"
                step="0.001"
                placeholder="150.234"
                className="bg-background border-border"
                value={form.units}
                onChange={(e) => handleField("units", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modal-nav">Purchase NAV (₹)</Label>
              <Input
                id="modal-nav"
                type="number"
                step="0.01"
                placeholder="42.50"
                className="bg-background border-border"
                value={form.purchaseNAV}
                onChange={(e) => handleField("purchaseNAV", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="modal-date">Purchase Date</Label>
            <Input
              id="modal-date"
              type="date"
              className="bg-background border-border"
              value={form.purchaseDate}
              max={todayStr()}
              onChange={(e) => handleField("purchaseDate", e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="mf.cancel_button"
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="mf.add.submit_button"
              className="bg-primary text-primary-foreground"
            >
              {editData ? "Save Changes" : "Add Fund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mutual Funds Page ────────────────────────────────────────────────────

type SortField =
  | "schemeName"
  | "currentNAV"
  | "units"
  | "invested"
  | "currentValue"
  | "gainLoss"
  | "gainPct";
type SortDir = "asc" | "desc";

export default function MutualFunds() {
  const {
    mutualFunds,
    deleteMutualFund,
    isRefreshingMF,
    refreshMFPrices,
    totals,
  } = usePortfolio();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MutualFundHolding | null>(null);
  const [sortField, setSortField] = useState<SortField>("currentValue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete "${name}" from your portfolio?`)) {
      deleteMutualFund(id);
      toast.success("Fund removed from portfolio.");
    }
  }

  const sorted = [...mutualFunds].sort((a, b) => {
    const investedA = a.units * a.purchaseNAV;
    const investedB = b.units * b.purchaseNAV;
    const valueA = a.units * a.currentNAV;
    const valueB = b.units * b.currentNAV;
    const gainA = valueA - investedA;
    const gainB = valueB - investedB;
    const gainPctA = investedA > 0 ? (gainA / investedA) * 100 : 0;
    const gainPctB = investedB > 0 ? (gainB / investedB) * 100 : 0;

    const map: Record<SortField, number> = {
      schemeName: a.schemeName.localeCompare(b.schemeName),
      currentNAV: a.currentNAV - b.currentNAV,
      units: a.units - b.units,
      invested: investedA - investedB,
      currentValue: valueA - valueB,
      gainLoss: gainA - gainB,
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

  function SortTh({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <th
        className={cn(
          "px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none whitespace-nowrap",
          className,
        )}
        onClick={() => handleSort(field)}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && handleSort(field)
        }
      >
        <span className="flex items-center gap-1">
          {children}
          <SortIcon field={field} />
        </span>
      </th>
    );
  }

  const totalInvested = totals.mfInvested;
  const totalValue = totals.mfValue;
  const totalGain = totalValue - totalInvested;
  const totalGainPct =
    totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Mutual Funds</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mutualFunds.length} holdings · {formatINR(totalValue)} ·{" "}
            <span className={gainLossClass(totalGain)}>
              {formatINRWithSign(totalGain)} ({formatPercent(totalGainPct)})
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-ocid="mf.refresh.button"
            variant="outline"
            size="sm"
            onClick={refreshMFPrices}
            disabled={isRefreshingMF}
            className="border-border gap-2"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isRefreshingMF && "animate-spin")}
            />
            {isRefreshingMF ? "Updating…" : "Refresh NAV"}
          </Button>
          <Button
            data-ocid="mf.add.open_modal_button"
            onClick={() => {
              setEditTarget(null);
              setModalOpen(true);
            }}
            className="bg-primary text-primary-foreground gap-2"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Fund
          </Button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Invested", value: formatINR(totalInvested) },
          { label: "Current Value", value: formatINR(totalValue) },
          {
            label: "Total Gain",
            value: formatINRWithSign(totalGain),
            cls: gainLossClass(totalGain),
          },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p
                className={cn(
                  "text-lg font-display font-bold number-tabular mt-0.5",
                  s.cls,
                )}
              >
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Holdings Table */}
      <Card className="bg-card border-border shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Holdings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isRefreshingMF ? (
            <div className="p-4 space-y-3">
              {["r1", "r2", "r3", "r4"].map((k) => (
                <Skeleton key={k} className="h-12 w-full" />
              ))}
              <div data-ocid="mf.loading_state" className="sr-only">
                Loading mutual fund data
              </div>
            </div>
          ) : mutualFunds.length === 0 ? (
            <div
              data-ocid="mf.empty_state"
              className="py-16 flex flex-col items-center gap-3 text-muted-foreground"
            >
              <TrendingUp className="w-10 h-10 opacity-30" />
              <p className="text-sm">No funds added yet.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(true)}
                className="border-border"
              >
                Add your first fund
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <SortTh field="schemeName" className="text-left pl-4">
                      Fund Name
                    </SortTh>
                    <SortTh field="currentNAV" className="text-right">
                      Current NAV
                    </SortTh>
                    <SortTh field="units" className="text-right">
                      Units
                    </SortTh>
                    <SortTh field="invested" className="text-right">
                      Invested
                    </SortTh>
                    <SortTh field="currentValue" className="text-right">
                      Current Value
                    </SortTh>
                    <SortTh field="gainLoss" className="text-right">
                      Gain / Loss
                    </SortTh>
                    <SortTh field="gainPct" className="text-right">
                      Returns
                    </SortTh>
                    <th className="px-3 py-2.5 text-right pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((mf, i) => {
                    const invested = mf.units * mf.purchaseNAV;
                    const value = mf.units * mf.currentNAV;
                    const gain = value - invested;
                    const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
                    const years = yearsBetween(mf.purchaseDate, todayStr());
                    const cagr = calcCAGR(invested, value, years);
                    const idx = i + 1;

                    return (
                      <tr
                        key={mf.id}
                        data-ocid={`mf.item.${idx}`}
                        className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground leading-snug max-w-[240px] truncate">
                            {mf.schemeName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Purchase: {formatDate(mf.purchaseDate)} · NAV: ₹
                            {mf.purchaseNAV.toFixed(4)}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right number-tabular font-semibold">
                          ₹{mf.currentNAV.toFixed(4)}
                        </td>
                        <td className="px-3 py-3 text-right number-tabular text-muted-foreground">
                          {mf.units.toFixed(3)}
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
                            "px-3 py-3 text-right number-tabular",
                            gainLossClass(gain),
                          )}
                        >
                          <div className="flex flex-col items-end">
                            <span className="font-semibold">
                              {formatPercent(gainPct)}
                            </span>
                            {years >= 0.5 && (
                              <span className="text-xs text-muted-foreground">
                                {cagr.toFixed(1)}% CAGR
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              data-ocid={`mf.edit_button.${idx}`}
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 hover:bg-accent"
                              onClick={() => {
                                setEditTarget(mf);
                                setModalOpen(true);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              data-ocid={`mf.delete_button.${idx}`}
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 hover:bg-loss/20 hover:text-loss"
                              onClick={() => handleDelete(mf.id, mf.schemeName)}
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
          )}
        </CardContent>
      </Card>

      <FundModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTarget(null);
        }}
        editData={editTarget}
      />
    </div>
  );
}
