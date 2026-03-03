# Sreekanth Seelam – Portfolio Tracker

## Current State

All portfolio data (Mutual Funds, Stocks/ETFs, Debt, NPS, SGB, Transactions) is stored in **browser localStorage**. Data is device/browser-specific and will be lost when the browser cache is cleared. The backend canister only provides HTTP outcall helpers (fetchMFData, fetchNPSNav, fetchStockPrice, searchMutualFunds). There is no authentication or user-bound persistent storage.

## Requested Changes (Diff)

### Add
- Internet Identity login (via authorization component) so data is user-bound
- Backend Motoko data stores for all 6 portfolio entity types (MutualFundHolding, StockHolding, DebtHolding, NpsHolding, SgbHolding, Transaction) keyed by caller principal
- Full CRUD backend APIs: add, update, delete, getAll for each entity type
- Login/logout button in the sidebar and a login gate screen before the portfolio is shown
- Migration helper: on first login, offer to import existing localStorage data into the backend canister
- Loading state while data is being fetched from the canister on login

### Modify
- PortfolioContext to call backend canister APIs instead of reading/writing localStorage
- Data initialisation to load from canister after successful login rather than from localStorage
- CRUD operations to persist to canister instead of localStorage
- Keep localStorage only for theme preference (not portfolio data)

### Remove
- localStorage read/write for all portfolio data (KEY_MF, KEY_STOCKS, KEY_DEBT, KEY_NPS, KEY_SGB, KEY_TXS)
- clearSampleDataIfNeeded() helper (no longer needed)

## Implementation Plan

1. Select `authorization` Caffeine component
2. Generate Motoko backend with:
   - Stable storage HashMap keyed by Principal for each entity type
   - CRUD methods: addMutualFund, updateMutualFund, deleteMutualFund, getMutualFunds
   - CRUD methods: addStock, updateStock, deleteStock, getStocks
   - CRUD methods: addDebt, updateDebt, deleteDebt, getDebtHoldings
   - CRUD methods: addNps, updateNps, deleteNps, getNpsHoldings
   - CRUD methods: addSgb, updateSgb, deleteSgb, getSgbHoldings
   - CRUD methods: addTransaction, deleteTransaction, getTransactions
   - Retain existing HTTP outcall functions (fetchMFData, fetchNPSNav, fetchStockPrice, searchMutualFunds)
3. Update PortfolioContext to:
   - Accept authenticated actor
   - Load all data from canister on login
   - Call canister on every CRUD mutation
   - Show loading state during initial fetch
4. Add login gate in App.tsx: show login screen if not authenticated, show portfolio if authenticated
5. Add login/logout control in Layout sidebar
