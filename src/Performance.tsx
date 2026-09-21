import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import './Performance.css'

const API_URL = (import.meta.env.VITE_ALLOCATIONS_API_URL || 'http://localhost:7810').replace(/\/$/, '')
type Metric = { status: 'available' | 'unavailable'; amount: string | null; reason: string | null }
type Month = { month: string; realized: Metric; unrealized_change: Metric; combined_before_expenses: Metric; allocated_fixed_expenses: Metric; combined_after_expenses: Metric }
type Comparison = { period: 'daily' | 'month_to_date' | 'trailing_12_months'; start_date: string | null; end_date: string | null; portfolio_return_percentage: Metric; spy_return_percentage: Metric; excess_return_percentage: Metric; real_portfolio_return_percentage: Metric; real_spy_return_percentage: Metric }
type Overview = {
  as_of: string; latest_observation_date: string | null; source_start_date: string | null
  pnl: { realized: Metric; current_unrealized: Metric; realized_plus_current_unrealized: Metric; allocated_fixed_expenses: Metric; combined_after_expenses: Metric; realized_after_expenses?: Metric }
  monthly_average: { completed_month_count: number; included_months: string[]; excluded_months: { month: string; reason: string }[]; before_expenses: Metric; after_expenses: Metric; realized_before_expenses: Metric; realized_after_expenses: Metric; realized_month_count: number; realized_included_months: string[]; months: Month[] }
  comparisons: Comparison[]; annual_inflation_percentage: string | null; notes: string[]
}
const STORAGE_KEY = 'tradeflow.annual-inflation-percentage'
const validInflation = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) > -100 && Number(value) <= 1000
const storedInflation = () => { try { const value = localStorage.getItem(STORAGE_KEY) || ''; return validInflation(value) ? value : '' } catch { return '' } }
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : 'Unavailable'
const monthLabel = (value: string) => new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 7)}-01T00:00:00Z`))
const amount = (metric?: Metric) => metric?.status === 'available' && metric.amount !== null && Number.isFinite(Number(metric.amount)) ? Number(metric.amount) : null
const cash = (metric?: Metric) => { const value = amount(metric); return value === null ? 'Unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) }
const percent = (metric?: Metric, points = false) => { const value = amount(metric); return value === null ? 'Unavailable' : `${value > 0 ? '+' : ''}${value.toFixed(2)}${points ? ' pp' : '%'}` }
const tone = (metric?: Metric) => { const value = amount(metric); return value === null || value === 0 ? '' : value > 0 ? 'profit-text' : 'loss-text' }
const reason = (metric?: Metric) => amount(metric) === null ? metric?.reason || 'The required history is not available.' : null
const periodLabels = { daily: 'Daily', month_to_date: 'Month to date', trailing_12_months: 'Trailing 12 months' }

function Value({ metric, percentage = false, points = false }: { metric?: Metric; percentage?: boolean; points?: boolean }) {
  return <><strong className={tone(metric)}>{percentage ? percent(metric, points) : cash(metric)}</strong>{reason(metric) && <small>{reason(metric)}</small>}</>
}

export default function Performance() {
  const [inflation, setInflation] = useState(storedInflation)
  const [draftInflation, setDraftInflation] = useState(inflation)
  const [inputError, setInputError] = useState('')
  const [storageNote, setStorageNote] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setOverview(null); setError('')
    const params = new URLSearchParams()
    if (inflation !== '') params.set('annual_inflation_percentage', inflation)
    void fetch(`${API_URL}/api/v1/performance/overview${params.size ? `?${params}` : ''}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Could not load performance data.'); return response.json() as Promise<Overview> })
      .then(data => { if (!controller.signal.aborted) setOverview(data) })
      .catch(() => { if (!controller.signal.aborted) setError('Performance data could not be loaded. Please retry.') })
    return () => controller.abort()
  }, [inflation, revision])

  const applyInflation = (event: React.FormEvent) => {
    event.preventDefault()
    const value = draftInflation.trim()
    if (value !== '' && !validInflation(value)) { setInputError('Enter an annual percentage greater than −100 and no more than 1000, or leave it blank.'); return }
    setInputError(''); setStorageNote(''); setInflation(value)
    try { if (value === '') localStorage.removeItem(STORAGE_KEY); else localStorage.setItem(STORAGE_KEY, value) } catch { setStorageNote('This rate applies for this session; browser storage is unavailable.') }
  }
  const average = overview?.monthly_average
  const annual = overview?.comparisons.find(item => item.period === 'trailing_12_months')
  return <div className="performance-page">
    <section className="hero-row"><div><span className="eyebrow">Portfolio performance</span><h1>Profits, costs &amp; returns</h1><p>Realized and unrealized results, with expenses and benchmark comparisons.</p></div><button className="small-button" onClick={() => setRevision(value => value + 1)}><RefreshCw size={14} /> Refresh</button></section>
    {error ? <div className="api-warning" role="alert"><AlertCircle size={16} /><span>{error}</span><button onClick={() => setRevision(value => value + 1)}>Retry</button></div> : !overview ? <p className="performance-status" role="status">Loading portfolio performance…</p> : <>
      <p className="performance-range">Stored trading history: {dateLabel(overview.source_start_date)} – {dateLabel(overview.latest_observation_date)}. Requested through {dateLabel(overview.as_of)}. Totals cover the available history, not necessarily the account’s lifetime.</p>
      <section className="performance-grid" aria-label="Profit and loss overview">
        <article className="performance-metric"><h2>Total trading P&amp;L</h2><Value metric={overview.pnl.realized_plus_current_unrealized} /><p>Cumulative realized + current unrealized, counted once.</p><dl><div><dt>Realized</dt><dd>{cash(overview.pnl.realized)}</dd></div><div><dt>Current unrealized</dt><dd>{cash(overview.pnl.current_unrealized)}</dd></div></dl></article>
        <article className="performance-metric"><h2>P&amp;L after expenses</h2><Value metric={overview.pnl.combined_after_expenses} /><p>Combined P&amp;L less allocated fixed expenses; before taxes. Commissions are already included in realized P&amp;L.</p><dl><div><dt>Allocated fixed expenses</dt><dd>{cash(overview.pnl.allocated_fixed_expenses)}</dd></div><div><dt>Realized-only after expenses</dt><dd>{cash(overview.pnl.realized_after_expenses)}</dd></div></dl></article>
        <article className="performance-metric"><h2>Average monthly P&amp;L</h2><Value metric={average!.before_expenses} /><p>Before expenses · {average!.completed_month_count} eligible completed months.</p><dl><div><dt>After expenses</dt><dd>{cash(average!.after_expenses)}</dd></div><div><dt>Realized-only average</dt><dd>{cash(average!.realized_before_expenses)}</dd></div><div><dt>Realized-only after expenses</dt><dd>{cash(average!.realized_after_expenses)}</dd></div></dl><small>Realized-only averages use {average!.realized_month_count} completed months. Current partial month excluded.</small></article>
      </section>
      <section className="card"><div className="card-heading"><div><span className="eyebrow">Same dates, comparable returns</span><h2>Portfolio vs SPY</h2></div></div><p className="section-note">Portfolio returns require valuations and deposit/withdrawal history. SPY uses dividend-adjusted prices for matching dates. Missing history is shown as unavailable.</p>
        <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th scope="col">Period</th><th scope="col">Portfolio return</th><th scope="col">SPY return</th><th scope="col">Difference</th></tr></thead><tbody>{overview.comparisons.map(row => <tr key={row.period}><td>{periodLabels[row.period]}<small>{dateLabel(row.start_date)} – {dateLabel(row.end_date)}</small></td><td><Value metric={row.portfolio_return_percentage} percentage /></td><td><Value metric={row.spy_return_percentage} percentage /></td><td><Value metric={row.excess_return_percentage} percentage points /></td></tr>)}</tbody></table></div>
      </section>
    </>}
    <section className="card"><div className="card-heading"><div><span className="eyebrow">Your annual inflation assumption</span><h2>Inflation comparison</h2></div></div>
      <form className="performance-inflation" onSubmit={applyInflation}><label>Annual inflation rate (%)<input type="number" step="any" max="1000" value={draftInflation} placeholder="Enter annual rate" onChange={event => setDraftInflation(event.target.value)} aria-describedby="inflation-help" /></label><button className="small-button" type="submit">Apply rate</button><button className="small-button" type="button" onClick={() => { setDraftInflation(''); setInflation(''); setInputError(''); setStorageNote(''); try { localStorage.removeItem(STORAGE_KEY) } catch { setStorageNote('The rate was cleared for this session, but browser storage could not be updated.') } }}>Clear</button></form>
      <p id="inflation-help" className="section-note">{inflation === '' ? 'No rate entered.' : `Using ${inflation}% annual inflation.`} This is your input, not a live inflation feed. It applies only to the trailing 12-month comparison and is saved in this browser.</p>
      {inputError && <p role="alert" className="loss-text">{inputError}</p>}{storageNote && <p role="status">{storageNote}</p>}
      {inflation !== '' && annual && <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th scope="col">Trailing 12 months</th><th scope="col">Portfolio</th><th scope="col">SPY</th></tr></thead><tbody><tr><td>Inflation-adjusted return<small>Compounded adjustment using your annual rate</small></td><td><Value metric={annual.real_portfolio_return_percentage} percentage /></td><td><Value metric={annual.real_spy_return_percentage} percentage /></td></tr></tbody></table></div>}
    </section>
    {average && <section className="card"><div className="card-heading"><h2>Monthly breakdown</h2></div><p className="section-note">Unrealized P&amp;L is the change between month-end balances. Allocated expenses use saved monthly costs or configured budgets, not confirmed cash payments; a full month is charged, including the current partial month.</p><div className="performance-table-wrap"><table className="performance-table"><thead><tr><th scope="col">Month</th><th scope="col">Realized</th><th scope="col">Unrealized change</th><th scope="col">Combined</th><th scope="col">Expenses</th><th scope="col">After expenses</th></tr></thead><tbody>{average.months.map(row => <tr key={row.month}><td>{monthLabel(row.month)}</td><td><Value metric={row.realized} /></td><td><Value metric={row.unrealized_change} /></td><td><Value metric={row.combined_before_expenses} /></td><td>{cash(row.allocated_fixed_expenses)}{reason(row.allocated_fixed_expenses) && <small>{reason(row.allocated_fixed_expenses)}</small>}</td><td><Value metric={row.combined_after_expenses} /></td></tr>)}</tbody></table></div><details className="performance-notes"><summary>Average coverage and calculation notes</summary><p>Combined averages: {average.included_months.map(monthLabel).join(', ') || 'No eligible months'}. Realized-only averages: {average.realized_included_months.map(monthLabel).join(', ') || 'No eligible months'}.</p><ul>{average.excluded_months.map(row => <li key={row.month}>{monthLabel(row.month)}: {row.reason}</li>)}{overview?.notes.map((note, index) => <li key={`note-${index}`}>{note}</li>)}</ul></details></section>}
  </div>
}
