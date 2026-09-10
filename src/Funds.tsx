import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, Cloud, LoaderCircle, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'

const API_URL = (import.meta.env.VITE_ALLOCATIONS_API_URL || 'http://localhost:7810').replace(/\/$/, '')

type Child = { id: string; label: string; ticker?: string; percentage: string; amount?: string }
type Distribution = { id: string; color: string; label: string; percentage: string; amount?: string; transferToBank?: boolean; rollsIntoNextMonth?: boolean; children?: Child[] }
type Tax = { id: string; label: string; basis: { kind: 'profit_portion' | 'total_profit'; percentage?: string }; ratePercentage: string; amount?: string }
type Expense = { id: string; label: string; amount: string }
type Config = { schemaVersion: number; currency: string; closeoutDays: number; roundingMode: string; taxes: Tax[]; distribution: Distribution[]; fixedExpenses: Expense[] }
type AllocationDefault = { version_id: number; configuration_name: string; version: number; effective_from: string; configuration: Config; created_at: string }
type AllocationState = { source?: { kind?: string; tradingDayCount?: number }; taxes?: Tax[]; distribution?: Distribution[]; fixedExpenses?: Expense[]; lossCarryforward?: string; distributionBase?: string }
type Monthly = { allocation_month: string; default_version_id: number; status: 'DRAFT' | 'FINAL'; gross_profit: string | null; total_tax: string | null; after_tax_profit: string | null; fixed_expenses: string | null; remaining_profit: string | null; transfer_to_bank: string | null; allocation_state: AllocationState; calculation_version: number; editable_until: string | null; finalized_at: string | null }
type Daily = { trading_day: string; realized_pnl: string; total_commission: string | null; net_pnl: string | null }

const monthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const monthEnd = (month: string) => { const [y, m] = month.split('-').map(Number); return `${month}-${new Date(y, m, 0).getDate()}` }
const monthLabel = (value: string) => { const [y, m] = value.slice(0, 7).split('-').map(Number); return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1))) }
const dayLabel = (value: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
const numeric = (value: string | null | undefined) => { const parsed = Number(value || 0); return Number.isFinite(parsed) ? parsed : 0 }
const cash = (value: string | number | null | undefined) => { const amount = typeof value === 'number' ? value : numeric(value); return `${amount < 0 ? '−' : ''}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  if (!response.ok) throw new Error((await response.text()) || `Request failed with status ${response.status}`)
  return response.json() as Promise<T>
}

export default function Funds() {
  const current = monthKey()
  const [selected, setSelected] = useState(current)
  const [monthly, setMonthly] = useState<Monthly[]>([])
  const [daily, setDaily] = useState<Daily[]>([])
  const [activeDefault, setActiveDefault] = useState<AllocationDefault | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [defaults, months, days] = await Promise.all([
        request<AllocationDefault>(`/api/v1/allocations/default?as_of=${current}`),
        request<Monthly[]>('/api/v1/allocations/monthly?limit=100'),
        request<Daily[]>(`/api/v1/pnl/daily?start=${current}-01&end=${monthEnd(current)}&limit=1000`),
      ])
      setActiveDefault(defaults); setConfig(clone(defaults.configuration)); setMonthly(months); setDaily(days); setDirty(false)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load the allocations service.') }
    finally { setLoading(false) }
  }, [current])

  useEffect(() => { void load() }, [load])
  const snapshot = monthly.find(item => item.allocation_month.slice(0, 7) === selected)
  const availableMonths = useMemo(() => [...new Set([current, ...monthly.map(item => item.allocation_month.slice(0, 7))])].sort().reverse(), [current, monthly])
  const configurationValid = config ? config.distribution.reduce((sum, item) => sum + numeric(item.percentage), 0) === 100 && config.distribution.every(item => !item.children?.length || item.children.reduce((sum, child) => sum + numeric(child.percentage), 0) === 100) : false
  const update = (next: Config) => { setConfig(next); setDirty(true); setSaved(false) }

  const publish = async () => {
    if (!config || !activeDefault) return
    setSaving(true); setError('')
    try {
      const created = await request<AllocationDefault>('/api/v1/allocations/defaults', { method: 'POST', body: JSON.stringify({ configuration_name: activeDefault.configuration_name, effective_from: current, configuration: config }) })
      setActiveDefault(created); setConfig(clone(created.configuration)); setDirty(false); setSaved(true); window.setTimeout(() => setSaved(false), 2500)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not publish the allocation configuration.') }
    finally { setSaving(false) }
  }

  if (loading) return <State icon={<LoaderCircle className="spin" />} title="Loading fund management" detail="Reading allocation defaults, monthly snapshots, and daily P&L…" />
  if (!config || !activeDefault) return <State icon={<AlertCircle />} title="Allocations API unavailable" detail={error || 'No allocation default was returned.'} action={<button className="primary-button" onClick={() => void load()}><RefreshCw size={15} /> Retry</button>} />

  return <>
    <section className="fund-title-row"><div><span className="eyebrow">Live fund operations</span><h1>Fund management</h1><p>Bookkeeping and allocation data from the Fund Management API.</p></div><div className="api-connected"><Cloud size={15} /><span>API connected</span><small>Default v{activeDefault.version}</small></div></section>
    <section className="month-switcher fund-api-months">{availableMonths.map(value => <button key={value} className={selected === value ? 'active' : ''} onClick={() => setSelected(value)}>{monthLabel(value)}{value === current ? ' · Current' : ''}</button>)}</section>
    {error && <div className="api-warning"><AlertCircle size={16} /><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}
    {selected === current ? <CurrentMonth daily={daily} config={config} activeDefault={activeDefault} onChange={update} /> : snapshot ? <MonthlySnapshot snapshot={snapshot} /> : <State icon={<AlertCircle />} title="No monthly snapshot" detail={`The API has no allocation snapshot for ${monthLabel(selected)}.`} />}
    {selected === current && (dirty || saved) && <div className={`save-dock ${saved ? 'success' : ''}`}>{saved ? <><Check size={17} /><b>Default version {activeDefault.version} published</b></> : <><span>{configurationValid ? 'Unsaved default changes' : 'Allocation totals need attention'}</span><button onClick={() => { setConfig(clone(activeDefault.configuration)); setDirty(false) }}>Discard</button><button className="save" disabled={saving || !configurationValid} onClick={() => void publish()}>{saving ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />}{saving ? 'Publishing…' : 'Publish new default'}</button></>}</div>}
  </>
}

function State({ icon, title, detail, action }: { icon: React.ReactNode; title: string; detail: string; action?: React.ReactNode }) {
  return <section className="fund-state">{icon}<h2>{title}</h2><p>{detail}</p>{action}</section>
}

function CurrentMonth({ daily, config, activeDefault, onChange }: { daily: Daily[]; config: Config; activeDefault: AllocationDefault; onChange: (value: Config) => void }) {
  const gross = daily.reduce((sum, row) => sum + numeric(row.realized_pnl), 0)
  const commissions = daily.reduce((sum, row) => sum + numeric(row.total_commission), 0)
  const activeDays = daily.filter(row => numeric(row.realized_pnl) !== 0 || numeric(row.total_commission) !== 0).length
  const total = config.distribution.reduce((sum, item) => sum + numeric(item.percentage), 0)
  const expenseTotal = config.fixedExpenses.reduce((sum, item) => sum + numeric(item.amount), 0)
  const etf = config.distribution.find(item => item.id === 'reinvest_etf')
  const etfTotal = etf?.children?.reduce((sum, item) => sum + numeric(item.percentage), 0) || 0
  const setDistribution = (id: string, patch: Partial<Distribution>) => onChange({ ...config, distribution: config.distribution.map(item => item.id === id ? { ...item, ...patch } : item) })
  const setTax = (id: string, patch: Partial<Tax>) => onChange({ ...config, taxes: config.taxes.map(item => item.id === id ? { ...item, ...patch } : item) })
  const setExpense = (id: string, patch: Partial<Expense>) => onChange({ ...config, fixedExpenses: config.fixedExpenses.map(item => item.id === id ? { ...item, ...patch } : item) })
  const setChild = (id: string, patch: Partial<Child>) => etf && setDistribution(etf.id, { children: (etf.children || []).map(item => item.id === id ? { ...item, ...patch } : item) })

  return <>
    <section className="current-month-band api-current-band"><div><span className="eyebrow">Month to date · {monthLabel(monthKey())}</span><strong>{cash(gross)}</strong><p>{activeDays} trading days reported by the API</p></div><div className="api-current-stats"><span>Commissions<b>{cash(commissions)}</b></span><span>Latest day<b>{daily.length ? dayLabel(daily.at(-1)!.trading_day) : '—'}</b></span><span>Default effective<b>{monthLabel(activeDefault.effective_from)}</b></span></div></section>
    <section className="two-column fund-current-grid"><article className="card"><div className="card-heading"><div><span className="eyebrow">Realized profit by day</span><h2>Daily P&amp;L</h2></div><span className="record-count">{daily.length} rows</span></div><div className="api-daily-list">{daily.slice().reverse().map(row => <div className="simple-ledger-row" key={row.trading_day}><span>{dayLabel(row.trading_day)}<small>Commission {cash(row.total_commission)}</small></span><b className={numeric(row.realized_pnl) < 0 ? 'loss-text' : 'profit-text'}>{cash(row.realized_pnl)}</b></div>)}</div></article><article className="card api-config-summary"><span className="eyebrow">Active configuration</span><h2>{activeDefault.configuration_name}</h2><p>Version {activeDefault.version}, effective {monthLabel(activeDefault.effective_from)}. Publishing changes creates a new immutable version effective this month.</p><div><span>Closeout period<b>{config.closeoutDays} days</b></span><span>Fixed expenses<b>{cash(expenseTotal)}</b></span><span>Allocation total<b className={total === 100 ? 'profit-text' : 'loss-text'}>{total}%</b></span><span>Currency<b>{config.currency}</b></span></div></article></section>
    <section className="bookkeeping-grid api-default-editor"><article className="card bookkeeping-card"><div className="card-heading"><div><span className="eyebrow">Default configuration</span><h2>Tax rules</h2></div><button className="small-button" onClick={() => onChange({ ...config, taxes: [...config.taxes, { id: `tax_${Date.now()}`, label: 'New tax', basis: { kind: 'total_profit' }, ratePercentage: '0' }] })}><Plus size={13} /> Add</button></div>{config.taxes.map(tax => <div className="edit-ledger-row api-tax-row" key={tax.id}><div><input value={tax.label} onChange={event => setTax(tax.id, { label: event.target.value })} /><select value={tax.basis.kind === 'total_profit' ? '100' : tax.basis.percentage} onChange={event => setTax(tax.id, { basis: event.target.value === '100' ? { kind: 'total_profit' } : { kind: 'profit_portion', percentage: event.target.value } })}><option value="60">60% of profit</option><option value="40">40% of profit</option><option value="100">Total profit</option></select></div><label><input type="number" min="0" max="100" step="0.1" value={tax.ratePercentage} onChange={event => setTax(tax.id, { ratePercentage: event.target.value })} />%</label><button className="delete-button" onClick={() => onChange({ ...config, taxes: config.taxes.filter(item => item.id !== tax.id) })}><Trash2 size={14} /></button></div>)}</article><article className="card bookkeeping-card"><div className="card-heading"><div><span className="eyebrow">Default configuration</span><h2>Fixed expenses</h2></div><button className="small-button" onClick={() => onChange({ ...config, fixedExpenses: [...config.fixedExpenses, { id: `expense_${Date.now()}`, label: 'New expense', amount: '0.00' }] })}><Plus size={13} /> Add</button></div>{config.fixedExpenses.map(expense => <div className="edit-ledger-row expense" key={expense.id}><input value={expense.label} onChange={event => setExpense(expense.id, { label: event.target.value })} /><label>$<input type="number" min="0" step="0.01" value={expense.amount} onChange={event => setExpense(expense.id, { amount: event.target.value })} /></label><button className="delete-button" onClick={() => onChange({ ...config, fixedExpenses: config.fixedExpenses.filter(item => item.id !== expense.id) })}><Trash2 size={14} /></button></div>)}<div className="ledger-total"><span>Monthly expense total</span><strong>{cash(expenseTotal)}</strong></div></article></section>
    <section className="card allocation-section api-allocation-editor"><div className="card-heading"><div><span className="eyebrow">Default configuration</span><h2>Distribution plan</h2></div><div className="allocation-status"><span className={total === 100 ? 'valid' : 'invalid'}>{total}% total</span></div></div><p className="section-note">These percentages become the default for future monthly snapshots. Existing months remain unchanged.</p><div className="allocation-layout"><div className="allocation-donut" style={{ background: gradient(config.distribution) }}><div><b>{total}%</b><span>{total === 100 ? 'Ready to publish' : 'Adjust total'}</span></div></div><div className="allocation-list detailed">{config.distribution.map(item => <div className="allocation-row" key={item.id}><i style={{ background: item.color }} /><div><b>{item.label}</b><span>{item.transferToBank ? 'Transfers to bank' : item.rollsIntoNextMonth ? 'Rolls forward' : 'Retained / invested'}</span></div><input type="number" min="0" max="100" value={item.percentage} onChange={event => setDistribution(item.id, { percentage: event.target.value })} /><em>%</em></div>)}</div></div>{total !== 100 && <div className="error-banner"><AlertCircle size={16} /> Allocation percentages must total exactly 100% before publishing.</div>}{etf && <div className="etf-split"><div className="card-heading"><div><span className="eyebrow">Inside reinvest in ETF</span><h3>ETF sub-allocation</h3></div><div className="allocation-status"><span className={etfTotal === 100 ? 'valid' : 'invalid'}>{etfTotal}% split</span><button className="small-button" onClick={() => setDistribution(etf.id, { children: [...(etf.children || []), { id: `etf_${Date.now()}`, ticker: 'NEW', label: 'New fund', percentage: '0' }] })}><Plus size={13} /> Add ETF</button></div></div>{etf.children?.map(child => <div className="etf-row api-etf-row" key={child.id}><i style={{ background: etf.color }} /><input className="ticker-input" value={child.ticker || ''} onChange={event => setChild(child.id, { ticker: event.target.value })} /><div><input value={child.label} onChange={event => setChild(child.id, { label: event.target.value })} /></div><label><input type="number" min="0" max="100" value={child.percentage} onChange={event => setChild(child.id, { percentage: event.target.value })} />%</label><button className="delete-button" onClick={() => setDistribution(etf.id, { children: etf.children?.filter(item => item.id !== child.id) })}><Trash2 size={14} /></button></div>)}</div>}</section>
  </>
}

function MonthlySnapshot({ snapshot }: { snapshot: Monthly }) {
  const state = snapshot.allocation_state
  const distribution = state.distribution || []
  const loss = numeric(state.lossCarryforward)
  return <><section className={`closed-month-band api-snapshot-band ${numeric(snapshot.gross_profit) < 0 ? 'negative' : ''}`}><div><span>Gross realized profit · {monthLabel(snapshot.allocation_month)}</span><strong>{cash(snapshot.gross_profit)}</strong><small>{state.source?.tradingDayCount || 0} trading days · calculation v{snapshot.calculation_version}</small></div><div><span>Total tax<b>{cash(snapshot.total_tax)}</b></span><span>After tax<b>{cash(snapshot.after_tax_profit)}</b></span><span>Fixed expenses<b>{cash(snapshot.fixed_expenses)}</b></span><span>Remaining profit<b>{cash(snapshot.remaining_profit)}</b></span></div><aside><span>Transfer to bank</span><strong>{cash(snapshot.transfer_to_bank)}</strong><small className={`snapshot-status ${snapshot.status.toLowerCase()}`}>{snapshot.status}</small></aside></section>{loss > 0 && <div className="carry-banner"><AlertCircle size={18} /><div><b>Loss carried forward</b><span>{cash(loss)} remains to be recovered by a future profitable month.</span></div></div>}<section className="bookkeeping-grid snapshot-details"><article className="card"><div className="card-heading"><div><span className="eyebrow">API calculation</span><h2>Taxes</h2></div><span className="record-count">Default v{snapshot.default_version_id}</span></div>{(state.taxes || []).map(tax => <div className="snapshot-row" key={tax.id}><div><b>{tax.label}</b><span>{tax.basis.kind === 'total_profit' ? 'Total profit' : `${tax.basis.percentage}% profit portion`} · {tax.ratePercentage}%</span></div><strong>{cash(tax.amount)}</strong></div>)}<div className="ledger-total"><span>Total tax</span><strong>{cash(snapshot.total_tax)}</strong></div></article><article className="card"><div className="card-heading"><div><span className="eyebrow">API calculation</span><h2>Fixed expenses</h2></div></div>{(state.fixedExpenses || []).map(expense => <div className="snapshot-row" key={expense.id}><b>{expense.label}</b><strong>{cash(expense.amount)}</strong></div>)}<div className="ledger-total"><span>Total fixed expenses</span><strong>{cash(snapshot.fixed_expenses)}</strong></div></article></section><section className="card allocation-section snapshot-allocation"><div className="card-heading"><div><span className="eyebrow">Recorded monthly snapshot</span><h2>Distribution</h2></div><span className="read-only-chip">Read only</span></div><div className="allocation-layout"><div className="allocation-donut" style={{ background: gradient(distribution) }}><div><b>{distribution.reduce((sum, item) => sum + numeric(item.percentage), 0)}%</b><span>{cash(state.distributionBase)}</span></div></div><div className="snapshot-distribution">{distribution.map(item => <div className="snapshot-row" key={item.id}><i style={{ background: item.color }} /><div><b>{item.label}</b><span>{item.percentage}%{item.children?.length ? ` · ${item.children.map(child => `${child.ticker} ${child.percentage}%`).join(' · ')}` : ''}</span></div><strong>{cash(item.amount)}</strong></div>)}</div></div></section></>
}

function gradient(items: Distribution[]) {
  let cursor = 0
  const stops = items.map(item => { const start = cursor; cursor += numeric(item.percentage); return `${item.color || '#95a3a7'} ${start}% ${cursor}%` })
  return stops.length ? `conic-gradient(${stops.join(',')})` : 'var(--border)'
}
