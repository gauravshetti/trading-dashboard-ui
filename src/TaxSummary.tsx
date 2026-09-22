import { useEffect, useState } from 'react'

const API_URL = (import.meta.env.VITE_ALLOCATIONS_API_URL || 'http://localhost:7810').replace(/\/$/, '')
type Authority = { authority: string; cumulative_estimated_tax_liability: string; assumed_prior_payments: string; assumed_payment_credit: string; suggested_tax_payment?: string }
export type TaxSummary = { tax_year: number } & (
  { status: 'unavailable'; reason: string } |
  { status?: undefined; calculation_method: 'configured_rate_ytd_assumed_payments'; current: { as_of: string; currency: string; authorities: Authority[] } }
)
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const money = (value: string | null | undefined, currency: string) => value == null || !Number.isFinite(Number(value)) ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value))
const label = (authority: string) => authority.replaceAll('_', ' ').replace(/^./, value => value.toUpperCase())
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))

export default function TaxSummaryPanel({ year, historical, snapshot }: { year: number; historical: boolean; snapshot?: TaxSummary }) {
  const [taxYear, setTaxYear] = useState(year)
  const [loaded, setLoaded] = useState<TaxSummary | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (historical) return
    const controller = new AbortController()
    setLoaded(null); setError('')
    void fetch(`${API_URL}/api/v1/allocations/taxes/assumed-summary?tax_year=${taxYear}&as_of=${today()}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Could not load tax balances.'); return response.json() as Promise<TaxSummary> })
      .then(value => { if (!controller.signal.aborted) setLoaded(value) })
      .catch(() => { if (!controller.signal.aborted) setError('Could not load tax balances. Please retry.') })
    return () => controller.abort()
  }, [taxYear, historical, revision])
  const summary = historical ? snapshot : loaded
  const unavailable = summary?.status === 'unavailable' ? summary.reason : error
  const balance = summary && summary.status !== 'unavailable' && summary.calculation_method === 'configured_rate_ytd_assumed_payments' ? summary.current : null

  return <section className="card tax-summary" aria-label="Tax payments">
    <div className="card-heading"><div><span className="eyebrow">Tax year {taxYear}{balance ? ` · through ${dateLabel(balance.as_of)}` : ''}</span><h2>Tax payments</h2></div>{historical ? <span className="read-only-chip">Historical view</span> : <div className="tax-summary-actions"><label>Tax year <select aria-label="Tax year" value={taxYear} onChange={event => { setLoaded(null); setTaxYear(Number(event.target.value)) }}><option value={year}>{year}</option><option value={year - 1}>{year - 1}</option></select></label><button className="small-button" onClick={() => setRevision(value => value + 1)}>Refresh taxes</button></div>}</div>
    {unavailable ? <p role="alert">Tax summary unavailable. {unavailable}</p> : !balance ? <p role="status">{historical || summary ? 'Assumed tax summary unavailable for this period.' : 'Loading tax balances…'}</p> : <>
      <p className="section-note">Based on net year-to-date trading profit and your configured tax rates, including earlier losses. Earlier period payments are assumed paid after their scheduled dates. No actual payments are tracked in this view.</p>
      {balance.authorities.length === 0 && <p>No tax authorities are available.</p>}
      {balance.authorities.map(authority => {
        return <article className="tax-authority" key={authority.authority}>
          <div className="card-heading"><h3>{label(authority.authority)}</h3></div>
          <div className="tax-figures">
            <div><span>Estimated tax liability to date</span><strong>{money(authority.cumulative_estimated_tax_liability, balance.currency)}</strong></div>
            <div><span>Assumed prior payments</span><strong>{money(authority.assumed_prior_payments, balance.currency)}</strong></div>
            <div><span>Suggested tax payment</span><strong>{money(authority.suggested_tax_payment, balance.currency)}</strong></div>
          </div>
          {Number(authority.assumed_payment_credit) > 0 && <p className="section-note">Assumed payment credit: {money(authority.assumed_payment_credit, balance.currency)}</p>}
        </article>
      })}
    </>}
  </section>
}
