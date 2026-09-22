# TradeFlow Dashboard

A responsive trading-performance dashboard built with React, TypeScript, and Vite.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

Fund Management reads from the local Fund Management API at `http://localhost:7810`.
Month tabs use `/api/v1/allocations/monthly/months`; selecting a historical
month fetches `/api/v1/allocations/monthly/{YYYY-MM}` afresh. Switching tabs
cancels the previous request. The full monthly snapshot list is not downloaded.
The API must provide `operating_summary` on month details and
`/api/v1/allocations/monthly/{YYYY-MM}/operating-summary` for the current month,
even when no current snapshot exists. These summaries supply cumulative losses
after taxes and fixed expenses, and prior-month bookkeeping totals for YTD.
Unavailable summaries show missing balances rather than zero; tax-summary loss
is not a substitute for expense-inclusive operating carryforward.

Tax payments show estimated liability, assumed prior payments, and the suggested
payment for each authority. The current-month panel reads
`/api/v1/allocations/taxes/assumed-summary`; historical tabs use the embedded
`assumed_tax_summary`. The current/prior tax-year selector supports January.
Period dues are calculated from net YTD profits and configured tax rates at
March, May, August, and December cutoffs. Each due is assumed paid on the day
after its nominal April 15, June 15, September 15, or January 15 payment date.
Later losses reduce suggestions and can leave an assumed payment credit.
The UI clearly labels this assumption. No payment confirmation, ledger writes,
annual targets, or payment plans are needed; actual payment records remain
separate from this view. Missing historical configuration shows unavailable.
Start that service before opening the page. To use another API origin:

```bash
VITE_ALLOCATIONS_API_URL=http://localhost:7810 npm run dev
```

Leverage cash starts at `$30,000` by default. Override that opening balance when
starting the UI if needed:

```bash
VITE_LEVERAGE_STARTING_CASH=30000 npm run dev
```

The page uses the versioned `/api/v1` allocation endpoints. Historical monthly
snapshots are read-only; publishing configuration changes creates a new default
version through `POST /api/v1/allocations/defaults`.

## Performance analytics

The existing Analytics tab (`/analytics`) reads `GET /api/v1/performance/overview`
from the same API origin. It displays realized plus current unrealized P&L,
results after allocated fixed expenses (before taxes), completed-month averages,
and a monthly breakdown. Realized P&L is already net of commissions. Monthly
combined results use the change in unrealized balances, not their sum.
Totals cover retained history, not necessarily the lifetime of the account.
Full monthly expense allocations include the current partial month; averages
exclude partial months and disclose their eligible months separately.

Daily, month-to-date, and trailing-12-month portfolio/SPY comparison slots are
included. Numeric returns still require account-wide valuation and external
cash-flow coverage, dividend-adjusted SPY history, and backend return-engine
work. Missing unrealized balances or return data show **Unavailable**, not zero.
The current local source provides realized figures and allocated expenses only.

An optional annual inflation percentage is entered manually, saved in this
browser, and sent as `annual_inflation_percentage`. There is no default or live
inflation feed. Inflation-adjusted comparisons apply only to trailing 12 months
and require available nominal returns. These views do not record tax payments
or fetch external market data.

## Production build

```bash
npm run build
npm run preview
```

The previous `.dc.html` prototype remains in the repository as a reference. The active application starts from `src/main.tsx`.
