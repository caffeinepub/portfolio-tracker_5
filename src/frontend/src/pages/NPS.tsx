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
import { type NpsHolding, usePortfolio } from "@/context/PortfolioContext";
import { cn } from "@/lib/utils";
import {
  formatDate,
  formatINR,
  formatINRWithSign,
  formatPercent,
  gainLossClass,
  todayStr,
} from "@/utils/format";
import { Pencil, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Add/Edit Modal ───────────────────────────────────────────────────────

interface NpsFormData {
  schemeName: string;
  pfmId: string;
  tier: "I" | "II";
  units: string;
  purchaseNAV: string;
  purchaseDate: string;
}

function emptyNpsForm(): NpsFormData {
  return {
    schemeName: "",
    pfmId: "",
    tier: "I",
    units: "",
    purchaseNAV: "",
    purchaseDate: todayStr(),
  };
}

interface NpsModalProps {
  open: boolean;
  onClose: () => void;
  editData?: NpsHolding | null;
}

function NpsModal({ open, onClose, editData }: NpsModalProps) {
  const { addNps, updateNps } = usePortfolio();
  const [form, setForm] = useState<NpsFormData>(() => emptyNpsForm());

  // Reset on open
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      if (editData) {
        setForm({
          schemeName: editData.schemeName,
          pfmId: editData.pfmId,
          tier: editData.tier,
          units: String(editData.units),
          purchaseNAV: String(editData.purchaseNAV),
          purchaseDate: editData.purchaseDate,
        });
      } else {
        setForm(emptyNpsForm());
      }
    }
  }

  function setField<K extends keyof NpsFormData>(key: K, val: NpsFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const units = Number.parseFloat(form.units);
    const purchaseNAV = Number.parseFloat(form.purchaseNAV);

    if (
      !form.schemeName ||
      !form.pfmId ||
      Number.isNaN(units) ||
      Number.isNaN(purchaseNAV)
    ) {
      toast.error("Please fill all required fields.");
      return;
    }

    if (editData) {
      updateNps(editData.id, {
        schemeName: form.schemeName,
        pfmId: form.pfmId,
        tier: form.tier,
        units,
        purchaseNAV,
        purchaseDate: form.purchaseDate,
      });
      toast.success("NPS holding updated.");
    } else {
      addNps({
        schemeName: form.schemeName,
        pfmId: form.pfmId,
        tier: form.tier,
        units,
        purchaseNAV,
        purchaseDate: form.purchaseDate,
        currentNAV: purchaseNAV,
      });
      toast.success("NPS holding added.");
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-card border-border text-foreground sm:max-w-lg"
        data-ocid="nps.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {editData ? "Edit NPS Holding" : "Add NPS Holding"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nps-scheme">Scheme Name</Label>
            <Input
              id="nps-scheme"
              placeholder="SBI Pension Fund - Scheme E - Tier I"
              className="bg-background border-border"
              value={form.schemeName}
              onChange={(e) => setField("schemeName", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nps-pfm">PFM Code</Label>
              <Input
                id="nps-pfm"
                placeholder="SM008001"
                className="bg-background border-border font-mono"
                value={form.pfmId}
                onChange={(e) => setField("pfmId", e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Used to fetch live NAV from npsnav.in
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Tier</Label>
              <Select
                value={form.tier}
                onValueChange={(v) => setField("tier", v as "I" | "II")}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="I">Tier I</SelectItem>
                  <SelectItem value="II">Tier II</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nps-units">Units</Label>
              <Input
                id="nps-units"
                type="number"
                step="0.0001"
                min="0"
                placeholder="1250.5"
                className="bg-background border-border"
                value={form.units}
                onChange={(e) => setField("units", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nps-nav">Purchase NAV (₹)</Label>
              <Input
                id="nps-nav"
                type="number"
                step="0.01"
                min="0"
                placeholder="28.45"
                className="bg-background border-border"
                value={form.purchaseNAV}
                onChange={(e) => setField("purchaseNAV", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nps-date">Purchase Date</Label>
            <Input
              id="nps-date"
              type="date"
              className="bg-background border-border"
              value={form.purchaseDate}
              max={todayStr()}
              onChange={(e) => setField("purchaseDate", e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="nps.cancel_button"
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="nps.add.submit_button"
              className="bg-primary text-primary-foreground"
            >
              {editData ? "Save Changes" : "Add Holding"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── NPS Table ────────────────────────────────────────────────────────────

interface NpsTableProps {
  holdings: NpsHolding[];
  onEdit: (h: NpsHolding) => void;
  onDelete: (id: string, name: string) => void;
  isLoading: boolean;
}

function NpsTable({ holdings, onEdit, onDelete, isLoading }: NpsTableProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {["r1", "r2", "r3"].map((k) => (
          <Skeleton key={k} className="h-12 w-full" />
        ))}
        <div data-ocid="nps.loading_state" className="sr-only">
          Loading NPS data
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div
        data-ocid="nps.empty_state"
        className="py-12 flex flex-col items-center gap-3 text-muted-foreground"
      >
        <ShieldCheck className="w-10 h-10 opacity-30" />
        <p className="text-sm">No NPS holdings added yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Scheme Name
            </th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tier
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Units
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Purchase NAV
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Current NAV
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Current Value
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Gain / Loss
            </th>
            <th className="px-3 py-2.5 text-right pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => {
            const invested = h.units * h.purchaseNAV;
            const value = h.units * h.currentNAV;
            const gain = value - invested;
            const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
            const idx = i + 1;

            return (
              <tr
                key={h.id}
                data-ocid={`nps.item.${idx}`}
                className="border-b border-border/50 hover:bg-accent/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{h.schemeName}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    PFM: {h.pfmId} · {formatDate(h.purchaseDate)}
                  </p>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/15 text-primary border border-primary/25">
                    Tier {h.tier}
                  </span>
                </td>
                <td className="px-3 py-3 text-right number-tabular text-muted-foreground">
                  {h.units.toFixed(4)}
                </td>
                <td className="px-3 py-3 text-right number-tabular text-muted-foreground">
                  ₹{h.purchaseNAV.toFixed(4)}
                </td>
                <td className="px-3 py-3 text-right number-tabular font-semibold">
                  ₹{h.currentNAV.toFixed(4)}
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
                  <span className="text-xs ml-1 opacity-70">
                    ({formatPercent(gainPct)})
                  </span>
                </td>
                <td className="px-3 py-3 pr-4">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      data-ocid={`nps.edit_button.${idx}`}
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 hover:bg-accent"
                      onClick={() => onEdit(h)}
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      data-ocid={`nps.delete_button.${idx}`}
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 hover:bg-loss/20 hover:text-loss"
                      onClick={() => onDelete(h.id, h.schemeName)}
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

// ─── NPS Page ─────────────────────────────────────────────────────────────

export default function NPS() {
  const { npsHoldings, deleteNps, isRefreshingNPS, refreshNPSPrices, totals } =
    usePortfolio();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NpsHolding | null>(null);

  const totalGain = totals.npsValue - totals.npsInvested;
  const totalGainPct =
    totals.npsInvested > 0 ? (totalGain / totals.npsInvested) * 100 : 0;

  function handleDelete(id: string, name: string) {
    if (confirm(`Remove "${name}" from portfolio?`)) {
      deleteNps(id);
      toast.success("NPS holding removed.");
    }
  }

  function handleEdit(h: NpsHolding) {
    setEditTarget(h);
    setModalOpen(true);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">NPS Holdings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {npsHoldings.length} holdings · {formatINR(totals.npsValue)} ·{" "}
            <span className={gainLossClass(totalGain)}>
              {formatINRWithSign(totalGain)} ({formatPercent(totalGainPct)})
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-ocid="nps.refresh_button"
            variant="outline"
            size="sm"
            onClick={refreshNPSPrices}
            disabled={isRefreshingNPS}
            className="border-border gap-2"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isRefreshingNPS && "animate-spin")}
            />
            {isRefreshingNPS ? "Updating…" : "Refresh NAV"}
          </Button>
          <Button
            data-ocid="nps.add.open_modal_button"
            onClick={() => {
              setEditTarget(null);
              setModalOpen(true);
            }}
            className="bg-primary text-primary-foreground gap-2"
            size="sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Holding
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Invested", value: formatINR(totals.npsInvested) },
          { label: "Current Value", value: formatINR(totals.npsValue) },
          {
            label: "Overall Gain / Loss",
            value: `${formatINRWithSign(totalGain)} (${formatPercent(totalGainPct)})`,
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

      {/* Info note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg px-4 py-3">
        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
        <span>
          Live NAV is fetched from{" "}
          <span className="font-mono text-primary">npsnav.in/api</span> using
          the PFM Code. Click <strong>Refresh NAV</strong> to pull the latest
          values.
        </span>
      </div>

      {/* Table */}
      <Card className="bg-card border-border shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            NPS Scheme Holdings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <NpsTable
            holdings={npsHoldings}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isRefreshingNPS}
          />
        </CardContent>
      </Card>

      <NpsModal
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
