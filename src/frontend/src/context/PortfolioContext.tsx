import {
  fetchMFNAV,
  fetchNPSNav,
  fetchSGBPrice,
  fetchStockPrice,
} from "@/utils/priceService";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MutualFundHolding {
  id: string;
  schemeCode: string;
  schemeName: string;
  units: number;
  purchaseNAV: number;
  purchaseDate: string;
  currentNAV: number;
  lastUpdated: number;
}

export interface StockHolding {
  id: string;
  symbol: string;
  exchange: string;
  companyName: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  currentPrice: number;
  assetType: "stock" | "etf";
  lastUpdated: number;
}

export interface DebtHolding {
  id: string;
  debtType: "sgb" | "epf" | "ppf" | "fd" | "other";
  name: string;
  principal: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  currentValue: number;
  metadata: Record<string, string | number | boolean>;
  lastUpdated: number;
}

export interface NpsHolding {
  id: string;
  pfmId: string; // scheme code used with npsnav.in/api
  schemeName: string;
  tier: "I" | "II";
  units: number;
  purchaseNAV: number;
  purchaseDate: string;
  currentNAV: number;
  lastUpdated: number;
}

export interface SgbHolding {
  id: string;
  symbol: string; // e.g. "SGBMAR29" - used to fetch live price
  name: string; // e.g. "SGB Jan 2029"
  units: number; // grams
  issuePricePerGram: number;
  purchaseDate: string;
  maturityDate: string;
  currentPricePerGram: number;
  lastUpdated: number;
}

export interface Transaction {
  id: string;
  assetType: "mutualfund" | "stock" | "etf" | "debt";
  assetName: string;
  transactionType: "buy" | "sell";
  quantity: number;
  price: number;
  date: string;
  notes: string;
}

// ─── Computed Totals ───────────────────────────────────────────────────────

export interface PortfolioTotals {
  mfValue: number;
  mfInvested: number;
  stockValue: number;
  stockInvested: number;
  etfValue: number;
  etfInvested: number;
  debtValue: number;
  debtInvested: number;
  npsValue: number;
  npsInvested: number;
  sgbValue: number;
  sgbInvested: number;
  totalValue: number;
  totalInvested: number;
  totalGain: number;
  totalGainPercent: number;
}

// ─── Context Interface ─────────────────────────────────────────────────────

interface PortfolioContextValue {
  mutualFunds: MutualFundHolding[];
  stocks: StockHolding[];
  debtHoldings: DebtHolding[];
  npsHoldings: NpsHolding[];
  sgbHoldings: SgbHolding[];
  transactions: Transaction[];
  totals: PortfolioTotals;
  isRefreshingMF: boolean;
  isRefreshingStocks: boolean;
  isRefreshingNPS: boolean;
  isRefreshingSGB: boolean;
  lastRefreshed: number | null;

  addMutualFund: (
    holding: Omit<MutualFundHolding, "id" | "lastUpdated">,
  ) => void;
  updateMutualFund: (id: string, updates: Partial<MutualFundHolding>) => void;
  deleteMutualFund: (id: string) => void;

  addStock: (holding: Omit<StockHolding, "id" | "lastUpdated">) => void;
  updateStock: (id: string, updates: Partial<StockHolding>) => void;
  deleteStock: (id: string) => void;

  addDebt: (holding: Omit<DebtHolding, "id" | "lastUpdated">) => void;
  updateDebt: (id: string, updates: Partial<DebtHolding>) => void;
  deleteDebt: (id: string) => void;

  addNps: (holding: Omit<NpsHolding, "id" | "lastUpdated">) => void;
  updateNps: (id: string, updates: Partial<NpsHolding>) => void;
  deleteNps: (id: string) => void;

  addSgb: (holding: Omit<SgbHolding, "id" | "lastUpdated">) => void;
  updateSgb: (id: string, updates: Partial<SgbHolding>) => void;
  deleteSgb: (id: string) => void;

  addTransaction: (tx: Omit<Transaction, "id">) => void;
  deleteTransaction: (id: string) => void;

  refreshMFPrices: () => Promise<void>;
  refreshStockPrices: () => Promise<void>;
  refreshNPSPrices: () => Promise<void>;
  refreshSGBPrices: () => Promise<void>;
}

// ─── Storage Keys ──────────────────────────────────────────────────────────

const KEY_MF = "portfolio_mf";
const KEY_STOCKS = "portfolio_stocks";
const KEY_DEBT = "portfolio_debt";
const KEY_NPS = "portfolio_nps";
const KEY_SGB = "portfolio_sgb";
const KEY_TXS = "portfolio_txs";
const KEY_INITIALIZED = "portfolio_initialized_v2";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Clear sample data on first load by checking an initialization flag
function clearSampleDataIfNeeded() {
  try {
    if (!localStorage.getItem(KEY_INITIALIZED)) {
      // First time loading with v2 -- clear all portfolio keys so sample data is gone
      localStorage.removeItem(KEY_MF);
      localStorage.removeItem(KEY_STOCKS);
      localStorage.removeItem(KEY_DEBT);
      localStorage.removeItem(KEY_NPS);
      localStorage.removeItem(KEY_SGB);
      localStorage.removeItem(KEY_TXS);
      localStorage.setItem(KEY_INITIALIZED, "true");
    }
  } catch {
    // ignore
  }
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded – silently skip
  }
}

// ─── Compute Totals ────────────────────────────────────────────────────────

function computeTotals(
  mfs: MutualFundHolding[],
  stocks: StockHolding[],
  debt: DebtHolding[],
  nps: NpsHolding[],
  sgb: SgbHolding[],
): PortfolioTotals {
  const mfValue = mfs.reduce((s, h) => s + h.units * h.currentNAV, 0);
  const mfInvested = mfs.reduce((s, h) => s + h.units * h.purchaseNAV, 0);

  const allStocks = stocks.filter((s) => s.assetType === "stock");
  const allEtfs = stocks.filter((s) => s.assetType === "etf");

  const stockValue = allStocks.reduce(
    (s, h) => s + h.quantity * h.currentPrice,
    0,
  );
  const stockInvested = allStocks.reduce(
    (s, h) => s + h.quantity * h.buyPrice,
    0,
  );
  const etfValue = allEtfs.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
  const etfInvested = allEtfs.reduce((s, h) => s + h.quantity * h.buyPrice, 0);

  const debtValue = debt.reduce((s, h) => s + h.currentValue, 0);
  const debtInvested = debt.reduce((s, h) => s + h.principal, 0);

  const npsValue = nps.reduce((s, h) => s + h.units * h.currentNAV, 0);
  const npsInvested = nps.reduce((s, h) => s + h.units * h.purchaseNAV, 0);

  const sgbValue = sgb.reduce((s, h) => s + h.units * h.currentPricePerGram, 0);
  const sgbInvested = sgb.reduce(
    (s, h) => s + h.units * h.issuePricePerGram,
    0,
  );

  const totalValue =
    mfValue + stockValue + etfValue + debtValue + npsValue + sgbValue;
  const totalInvested =
    mfInvested +
    stockInvested +
    etfInvested +
    debtInvested +
    npsInvested +
    sgbInvested;
  const totalGain = totalValue - totalInvested;
  const totalGainPercent =
    totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  return {
    mfValue,
    mfInvested,
    stockValue,
    stockInvested,
    etfValue,
    etfInvested,
    debtValue,
    debtInvested,
    npsValue,
    npsInvested,
    sgbValue,
    sgbInvested,
    totalValue,
    totalInvested,
    totalGain,
    totalGainPercent,
  };
}

// ─── Context ───────────────────────────────────────────────────────────────

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  // ── State ──────────────────────────────────────────────────────────────
  // Clear sample data on very first load
  clearSampleDataIfNeeded();

  const [mutualFunds, setMutualFunds] = useState<MutualFundHolding[]>(() =>
    load<MutualFundHolding[]>(KEY_MF, []),
  );
  const [stocks, setStocks] = useState<StockHolding[]>(() =>
    load<StockHolding[]>(KEY_STOCKS, []),
  );
  const [debtHoldings, setDebt] = useState<DebtHolding[]>(() => {
    const stored = load<DebtHolding[]>(KEY_DEBT, []);
    // Filter out any legacy "nps" or "sgb" type entries that may be in local storage
    return stored.filter(
      (h) =>
        (h.debtType as string) !== "nps" && (h.debtType as string) !== "sgb",
    );
  });
  const [npsHoldings, setNps] = useState<NpsHolding[]>(() =>
    load<NpsHolding[]>(KEY_NPS, []),
  );
  const [sgbHoldings, setSgb] = useState<SgbHolding[]>(() =>
    load<SgbHolding[]>(KEY_SGB, []),
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    load<Transaction[]>(KEY_TXS, []),
  );

  const [isRefreshingMF, setRefreshingMF] = useState(false);
  const [isRefreshingStocks, setRefreshingStocks] = useState(false);
  const [isRefreshingNPS, setRefreshingNPS] = useState(false);
  const [isRefreshingSGB, setRefreshingSGB] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);

  // ── Persist on change ──────────────────────────────────────────────────
  useEffect(() => {
    save(KEY_MF, mutualFunds);
  }, [mutualFunds]);
  useEffect(() => {
    save(KEY_STOCKS, stocks);
  }, [stocks]);
  useEffect(() => {
    save(KEY_DEBT, debtHoldings);
  }, [debtHoldings]);
  useEffect(() => {
    save(KEY_NPS, npsHoldings);
  }, [npsHoldings]);
  useEffect(() => {
    save(KEY_SGB, sgbHoldings);
  }, [sgbHoldings]);
  useEffect(() => {
    save(KEY_TXS, transactions);
  }, [transactions]);

  // ── Computed totals ────────────────────────────────────────────────────
  const totals = computeTotals(
    mutualFunds,
    stocks,
    debtHoldings,
    npsHoldings,
    sgbHoldings,
  );

  // ── CRUD: Mutual Funds ─────────────────────────────────────────────────
  const addMutualFund = useCallback(
    (holding: Omit<MutualFundHolding, "id" | "lastUpdated">) => {
      const h: MutualFundHolding = {
        ...holding,
        id: uid(),
        lastUpdated: Date.now(),
      };
      setMutualFunds((prev) => [...prev, h]);
    },
    [],
  );

  const updateMutualFund = useCallback(
    (id: string, updates: Partial<MutualFundHolding>) => {
      setMutualFunds((prev) =>
        prev.map((h) =>
          h.id === id ? { ...h, ...updates, lastUpdated: Date.now() } : h,
        ),
      );
    },
    [],
  );

  const deleteMutualFund = useCallback((id: string) => {
    setMutualFunds((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ── CRUD: Stocks ───────────────────────────────────────────────────────
  const addStock = useCallback(
    (holding: Omit<StockHolding, "id" | "lastUpdated">) => {
      const h: StockHolding = {
        ...holding,
        id: uid(),
        lastUpdated: Date.now(),
      };
      setStocks((prev) => [...prev, h]);
    },
    [],
  );

  const updateStock = useCallback(
    (id: string, updates: Partial<StockHolding>) => {
      setStocks((prev) =>
        prev.map((h) =>
          h.id === id ? { ...h, ...updates, lastUpdated: Date.now() } : h,
        ),
      );
    },
    [],
  );

  const deleteStock = useCallback((id: string) => {
    setStocks((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ── CRUD: Debt ─────────────────────────────────────────────────────────
  const addDebt = useCallback(
    (holding: Omit<DebtHolding, "id" | "lastUpdated">) => {
      const h: DebtHolding = { ...holding, id: uid(), lastUpdated: Date.now() };
      setDebt((prev) => [...prev, h]);
    },
    [],
  );

  const updateDebt = useCallback(
    (id: string, updates: Partial<DebtHolding>) => {
      setDebt((prev) =>
        prev.map((h) =>
          h.id === id ? { ...h, ...updates, lastUpdated: Date.now() } : h,
        ),
      );
    },
    [],
  );

  const deleteDebt = useCallback((id: string) => {
    setDebt((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ── CRUD: NPS ──────────────────────────────────────────────────────────
  const addNps = useCallback(
    (holding: Omit<NpsHolding, "id" | "lastUpdated">) => {
      const h: NpsHolding = { ...holding, id: uid(), lastUpdated: Date.now() };
      setNps((prev) => [...prev, h]);
    },
    [],
  );

  const updateNps = useCallback((id: string, updates: Partial<NpsHolding>) => {
    setNps((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, ...updates, lastUpdated: Date.now() } : h,
      ),
    );
  }, []);

  const deleteNps = useCallback((id: string) => {
    setNps((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ── CRUD: SGB ──────────────────────────────────────────────────────────
  const addSgb = useCallback(
    (holding: Omit<SgbHolding, "id" | "lastUpdated">) => {
      const h: SgbHolding = { ...holding, id: uid(), lastUpdated: Date.now() };
      setSgb((prev) => [...prev, h]);
    },
    [],
  );

  const updateSgb = useCallback((id: string, updates: Partial<SgbHolding>) => {
    setSgb((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, ...updates, lastUpdated: Date.now() } : h,
      ),
    );
  }, []);

  const deleteSgb = useCallback((id: string) => {
    setSgb((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ── CRUD: Transactions ─────────────────────────────────────────────────
  const addTransaction = useCallback((tx: Omit<Transaction, "id">) => {
    const t: Transaction = { ...tx, id: uid() };
    setTransactions((prev) => [t, ...prev]);
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Price Refresh ──────────────────────────────────────────────────────
  const mfRef = useRef(mutualFunds);
  const stocksRef = useRef(stocks);
  const npsRef = useRef(npsHoldings);
  const sgbRef = useRef(sgbHoldings);

  useEffect(() => {
    mfRef.current = mutualFunds;
  }, [mutualFunds]);

  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);

  useEffect(() => {
    npsRef.current = npsHoldings;
  }, [npsHoldings]);

  useEffect(() => {
    sgbRef.current = sgbHoldings;
  }, [sgbHoldings]);

  const refreshMFPrices = useCallback(async () => {
    setRefreshingMF(true);
    try {
      const updated = await Promise.all(
        mfRef.current.map(async (mf) => {
          const nav = await fetchMFNAV(mf.schemeCode);
          return nav !== null
            ? { ...mf, currentNAV: nav, lastUpdated: Date.now() }
            : mf;
        }),
      );
      setMutualFunds(updated);
    } finally {
      setRefreshingMF(false);
      setLastRefreshed(Date.now());
    }
  }, []);

  const refreshStockPrices = useCallback(async () => {
    setRefreshingStocks(true);
    try {
      const updated = await Promise.all(
        stocksRef.current.map(async (s) => {
          const price = await fetchStockPrice(s.symbol);
          return price !== null
            ? { ...s, currentPrice: price, lastUpdated: Date.now() }
            : s;
        }),
      );
      setStocks(updated);
    } finally {
      setRefreshingStocks(false);
      setLastRefreshed(Date.now());
    }
  }, []);

  const refreshNPSPrices = useCallback(async () => {
    setRefreshingNPS(true);
    try {
      const updated = await Promise.all(
        npsRef.current.map(async (h) => {
          const nav = await fetchNPSNav(h.pfmId);
          return nav !== null
            ? { ...h, currentNAV: nav, lastUpdated: Date.now() }
            : h;
        }),
      );
      setNps(updated);
    } finally {
      setRefreshingNPS(false);
      setLastRefreshed(Date.now());
    }
  }, []);

  const refreshSGBPrices = useCallback(async () => {
    setRefreshingSGB(true);
    try {
      const updated = await Promise.all(
        sgbRef.current.map(async (h) => {
          const price = await fetchSGBPrice(h.symbol);
          return price !== null
            ? { ...h, currentPricePerGram: price, lastUpdated: Date.now() }
            : h;
        }),
      );
      setSgb(updated);
    } finally {
      setRefreshingSGB(false);
      setLastRefreshed(Date.now());
    }
  }, []);

  // ── Auto-refresh on mount and every 5 minutes ──────────────────────────
  const didMount = useRef(false);
  useEffect(() => {
    if (didMount.current) return;
    didMount.current = true;

    // Initial price fetch
    void refreshMFPrices();
    void refreshStockPrices();
    void refreshNPSPrices();
    void refreshSGBPrices();

    const intervalId = setInterval(
      () => {
        void refreshMFPrices();
        void refreshStockPrices();
        void refreshNPSPrices();
        void refreshSGBPrices();
      },
      5 * 60 * 1000,
    );
    return () => clearInterval(intervalId);
  }, [refreshMFPrices, refreshStockPrices, refreshNPSPrices, refreshSGBPrices]);

  return (
    <PortfolioContext.Provider
      value={{
        mutualFunds,
        stocks,
        debtHoldings,
        npsHoldings,
        sgbHoldings,
        transactions,
        totals,
        isRefreshingMF,
        isRefreshingStocks,
        isRefreshingNPS,
        isRefreshingSGB,
        lastRefreshed,
        addMutualFund,
        updateMutualFund,
        deleteMutualFund,
        addStock,
        updateStock,
        deleteStock,
        addDebt,
        updateDebt,
        deleteDebt,
        addNps,
        updateNps,
        deleteNps,
        addSgb,
        updateSgb,
        deleteSgb,
        addTransaction,
        deleteTransaction,
        refreshMFPrices,
        refreshStockPrices,
        refreshNPSPrices,
        refreshSGBPrices,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx)
    throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}
