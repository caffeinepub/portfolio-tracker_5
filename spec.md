# Sreekanth Seelam – Portfolio Tracker

## Current State

The app uses ICP backend canister for all data persistence. Users must log in with Internet Identity before accessing the app. All CRUD operations (mutual funds, stocks, debt, NPS, SGB, transactions) call the canister via an authenticated actor. NPS NAV refresh also goes through the canister's HTTP outcall. The `PortfolioProvider` takes an `actor` prop and all mutations call `actor.*` methods.

## Requested Changes (Diff)

### Add
- Session-based storage using `sessionStorage` (data lives only for the browser tab/session, cleared on close)
- NPS NAV fetch directly from browser (via allorigins CORS proxy) instead of canister outcall

### Modify
- `App.tsx`: Remove Internet Identity login, `useInternetIdentity`, `useActor`, profile setup modal, loading gate. App loads immediately with no auth, wrapping `PortfolioProvider` directly.
- `PortfolioContext.tsx`: Remove `actor` prop and all canister calls. Replace all CRUD operations with in-memory state + sessionStorage persistence. On mount, load from sessionStorage instead of canister.
- `priceService.ts`: Update `fetchNPSNav` to call npsnav.in directly via a CORS proxy (no actor parameter).

### Remove
- Login screen component
- `ProfileSetupModal` component
- `useInternetIdentity` and `useActor` hook usage in `App.tsx`
- All `actor.*` calls in `PortfolioContext.tsx`
- Backend conversion helpers (`toBackendMF`, `fromBackendMF`, etc.) — no longer needed
- Loading/timeout logic tied to auth initialization

## Implementation Plan

1. Rewrite `PortfolioContext.tsx`:
   - Remove `actor` prop from `PortfolioProviderProps`
   - Remove all backend conversion helpers
   - Replace `loadData` useEffect (canister fetch) with sessionStorage load on mount
   - Replace all `actor.*` CRUD calls with sessionStorage.setItem after state update
   - Update `refreshNPSPrices` to call `fetchNPSNav(pfmId)` without actor
   - Keep all computed totals, refresh logic, price service calls unchanged

2. Rewrite `App.tsx`:
   - Remove `useInternetIdentity`, `useActor` imports and usage
   - Remove `LoginScreen`, `ProfileSetupModal` components
   - Remove all auth state, profile state, loading gate
   - App renders directly into `PortfolioProvider > AppContent`
   - Keep theme toggle (localStorage persisted)

3. Update `priceService.ts`:
   - Change `fetchNPSNav(pfmId, actor)` signature to `fetchNPSNav(pfmId)` 
   - Implement direct browser fetch via allorigins proxy (same as MF fetch)
