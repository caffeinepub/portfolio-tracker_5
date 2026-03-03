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

// ─── Sample Data ───────────────────────────────────────────────────────────

const now = Date.now();

const SAMPLE_MUTUAL_FUNDS: MutualFundHolding[] = [
  {
    id: "mf1",
    schemeCode: "120503",
    schemeName: "Axis Bluechip Fund - Direct Plan - Growth",
    units: 150.234,
    purchaseNAV: 42.5,
    purchaseDate: "2022-03-15",
    currentNAV: 58.75,
    lastUpdated: now,
  },
  {
    id: "mf2",
    schemeCode: "118989",
    schemeName: "Mirae Asset Large Cap Fund - Direct Growth",
    units: 200.5,
    purchaseNAV: 65.2,
    purchaseDate: "2021-11-10",
    currentNAV: 89.4,
    lastUpdated: now,
  },
  {
    id: "mf3",
    schemeCode: "125354",
    schemeName: "Parag Parikh Flexi Cap Fund - Direct Growth",
    units: 85.75,
    purchaseNAV: 38.1,
    purchaseDate: "2022-07-20",
    currentNAV: 72.6,
    lastUpdated: now,
  },
  {
    id: "mf4",
    schemeCode: "119598",
    schemeName: "HDFC Mid-Cap Opportunities Fund - Direct Growth",
    units: 120.0,
    purchaseNAV: 75.8,
    purchaseDate: "2021-05-05",
    currentNAV: 134.25,
    lastUpdated: now,
  },
];

const SAMPLE_STOCKS: StockHolding[] = [
  {
    id: "st1",
    symbol: "RELIANCE.NS",
    exchange: "NSE",
    companyName: "Reliance Industries",
    quantity: 25,
    buyPrice: 2450.0,
    buyDate: "2022-01-10",
    currentPrice: 2875.5,
    assetType: "stock",
    lastUpdated: now,
  },
  {
    id: "st2",
    symbol: "TCS.NS",
    exchange: "NSE",
    companyName: "Tata Consultancy Services",
    quantity: 15,
    buyPrice: 3200.0,
    buyDate: "2021-08-20",
    currentPrice: 3856.75,
    assetType: "stock",
    lastUpdated: now,
  },
  {
    id: "st3",
    symbol: "INFY.NS",
    exchange: "NSE",
    companyName: "Infosys Ltd",
    quantity: 40,
    buyPrice: 1450.0,
    buyDate: "2022-04-05",
    currentPrice: 1678.3,
    assetType: "stock",
    lastUpdated: now,
  },
  {
    id: "etf1",
    symbol: "NIFTYBEES.NS",
    exchange: "NSE",
    companyName: "Nippon India ETF Nifty BeES",
    quantity: 500,
    buyPrice: 185.0,
    buyDate: "2022-02-15",
    currentPrice: 234.8,
    assetType: "etf",
    lastUpdated: now,
  },
  {
    id: "etf2",
    symbol: "GOLDBEES.NS",
    exchange: "NSE",
    companyName: "Nippon India ETF Gold BeES",
    quantity: 200,
    buyPrice: 42.5,
    buyDate: "2021-10-01",
    currentPrice: 58.2,
    assetType: "etf",
    lastUpdated: now,
  },
];

const SAMPLE_DEBT: DebtHolding[] = [
  {
    id: "debt1",
    debtType: "epf",
    name: "Employee Provident Fund",
    principal: 450000,
    interestRate: 8.25,
    startDate: "2018-04-01",
    maturityDate: "2045-04-01",
    currentValue: 685000,
    metadata: { yearlyContribution: 120000 },
    lastUpdated: now,
  },
  {
    id: "debt2",
    debtType: "ppf",
    name: "Public Provident Fund",
    principal: 150000,
    interestRate: 7.1,
    startDate: "2019-04-01",
    maturityDate: "2034-04-01",
    currentValue: 198000,
    metadata: { yearlyContribution: 50000 },
    lastUpdated: now,
  },
  {
    id: "debt3",
    debtType: "fd",
    name: "SBI Fixed Deposit",
    principal: 200000,
    interestRate: 7.5,
    startDate: "2023-06-01",
    maturityDate: "2026-06-01",
    currentValue: 234500,
    metadata: { compoundingFrequency: "quarterly", bankName: "SBI" },
    lastUpdated: now,
  },
];

const SAMPLE_SGB: SgbHolding[] = [
  {
    id: "sgb1",
    symbol: "SGBMAR29",
    name: "SGB 2021-22 Series X",
    units: 10,
    issuePricePerGram: 4791,
    purchaseDate: "2021-11-12",
    maturityDate: "2029-11-12",
    currentPricePerGram: 7200,
    lastUpdated: now,
  },
  {
    id: "sgb2",
    symbol: "SGBAUG28",
    name: "SGB 2020-21 Series VI",
    units: 5,
    issuePricePerGram: 5117,
    purchaseDate: "2020-08-24",
    maturityDate: "2028-08-24",
    currentPricePerGram: 7200,
    lastUpdated: now,
  },
];

const SAMPLE_NPS: NpsHolding[] = [
  {
    id: "nps1",
    pfmId: "SM008001",
    schemeName: "SBI Pension Fund - Scheme E - Tier I",
    tier: "I",
    units: 1250.5,
    purchaseNAV: 28.45,
    purchaseDate: "2020-04-01",
    currentNAV: 44.32,
    lastUpdated: now,
  },
  {
    id: "nps2",
    pfmId: "SM008002",
    schemeName: "SBI Pension Fund - Scheme G - Tier I",
    tier: "I",
    units: 800.0,
    purchaseNAV: 22.1,
    purchaseDate: "2021-01-15",
    currentNAV: 30.85,
    lastUpdated: now,
  },
];

function buildSampleTransactions(): Transaction[] {
  const txs: Transaction[] = [];
  for (const mf of SAMPLE_MUTUAL_FUNDS) {
    txs.push({
      id: `tx_${mf.id}`,
      assetType: "mutualfund",
      assetName: mf.schemeName,
      transactionType: "buy",
      quantity: mf.units,
      price: mf.purchaseNAV,
      date: mf.purchaseDate,
      notes: "Initial purchase",
    });
  }
  for (const s of SAMPLE_STOCKS) {
    txs.push({
      id: `tx_${s.id}`,
      assetType: s.assetType,
      assetName: s.companyName,
      transactionType: "buy",
      quantity: s.quantity,
      price: s.buyPrice,
      date: s.buyDate,
      notes: "Initial purchase",
    });
  }
  for (const d of SAMPLE_DEBT) {
    txs.push({
      id: `tx_${d.id}`,
      assetType: "debt",
      assetName: d.name,
      transactionType: "buy",
      quantity: 1,
      price: d.principal,
      date: d.startDate,
      notes: `${d.debtType.toUpperCase()} investment`,
    });
  }
  for (const s of SAMPLE_SGB) {
    txs.push({
      id: `tx_${s.id}`,
      assetType: "debt",
      assetName: s.name,
      transactionType: "buy",
      quantity: s.units,
      price: s.issuePricePerGram * s.units,
      date: s.purchaseDate,
      notes: "SGB investment",
    });
  }
  return txs;
}

// ─── Storage Keys ──────────────────────────────────────────────────────────

const KEY_MF = "portfolio_mf";
const KEY_STOCKS = "portfolio_stocks";
const KEY_DEBT = "portfolio_debt";
const KEY_NPS = "portfolio_nps";
const KEY_SGB = "portfolio_sgb";
const KEY_TXS = "portfolio_txs";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
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
  const [mutualFunds, setMutualFunds] = useState<MutualFundHolding[]>(() => {
    const stored = load<MutualFundHolding[]>(KEY_MF, []);
    return stored.length > 0 ? stored : SAMPLE_MUTUAL_FUNDS;
  });
  const [stocks, setStocks] = useState<StockHolding[]>(() => {
    const stored = load<StockHolding[]>(KEY_STOCKS, []);
    return stored.length > 0 ? stored : SAMPLE_STOCKS;
  });
  const [debtHoldings, setDebt] = useState<DebtHolding[]>(() => {
    const stored = load<DebtHolding[]>(KEY_DEBT, []);
    // Filter out any legacy "nps" or "sgb" type entries that may be in local storage
    const filtered = stored.filter(
      (h) =>
        (h.debtType as string) !== "nps" && (h.debtType as string) !== "sgb",
    );
    return filtered.length > 0 ? filtered : SAMPLE_DEBT;
  });
  const [npsHoldings, setNps] = useState<NpsHolding[]>(() => {
    const stored = load<NpsHolding[]>(KEY_NPS, []);
    return stored.length > 0 ? stored : SAMPLE_NPS;
  });
  const [sgbHoldings, setSgb] = useState<SgbHolding[]>(() => {
    const stored = load<SgbHolding[]>(KEY_SGB, []);
    return stored.length > 0 ? stored : SAMPLE_SGB;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const stored = load<Transaction[]>(KEY_TXS, []);
    return stored.length > 0 ? stored : buildSampleTransactions();
  });

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
