# Sreekanth Seelam – Portfolio Tracker

## Current State
The Mutual Funds page shows every individual MutualFundHolding as a separate table row. When the same scheme has multiple SIP purchases (each added as a separate entry), it results in a cluttered list of duplicate-looking rows per fund.

## Requested Changes (Diff)

### Add
- XIRR calculation utility function in `utils/format.ts` using the Newton-Raphson method.
- Consolidated "fund-level" view in MutualFunds.tsx that groups all holdings with the same `schemeCode` into a single row showing:
  - Fund Name
  - Current NAV (live)
  - Total Units (sum)
  - Average NAV (weighted average by units)
  - Total Invested
  - Current Value
  - Gain / Loss (₹ and %)
  - XIRR (computed from individual purchase cashflows to today)
- Expandable row (chevron toggle) that reveals all individual transaction entries for that fund (each with date, units, purchase NAV, invested, current value, gain).
- "Add Transaction" button within the expanded row so the user can add another SIP purchase to the same fund without re-searching.

### Modify
- MutualFunds.tsx table rendering: replace flat row-per-holding with grouped consolidated rows + expandable sub-rows.
- The Add Fund modal remains unchanged for adding new entries; when editing, target the individual transaction row.
- Summary strip and header stats remain the same.

### Remove
- Nothing removed from the data model or context; all existing holdings are preserved.

## Implementation Plan
1. Add `calcXIRR(cashflows: {amount: number, date: string}[], finalValue: number, finalDate: string): number` to `utils/format.ts`.
2. In `MutualFunds.tsx`, write a `groupByScheme` function that aggregates holdings sharing the same `schemeCode`:
   - totalUnits = sum of units
   - avgNAV = sum(units * purchaseNAV) / totalUnits
   - totalInvested = sum(units * purchaseNAV)
   - currentValue = totalUnits * currentNAV (currentNAV is the same for all entries of the same scheme)
   - xirr = calcXIRR over all purchase cashflows
3. Render one consolidated row per scheme group. Add a chevron expand/collapse button on the left of each row.
4. When expanded, render sub-rows (indented) for each individual holding in the group, showing: date, units, purchase NAV, amount invested, current value, gain/loss, and action buttons (edit/delete).
5. The top-level "Add Fund" button remains for adding new schemes. Within an expanded group, add a small "+ Add SIP" button that opens the fund modal pre-filled with the scheme (no search needed, just units/NAV/date fields).
