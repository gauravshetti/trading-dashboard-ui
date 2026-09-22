import { useEffect, useMemo, useState } from 'react'
import {
  Activity, BarChart3, BookOpen, CalendarDays, ChevronRight, CircleDollarSign,
  Download, LayoutDashboard, Moon, PieChart, Plus, Settings2, ShieldCheck,
  Sparkles, Sun, Target, TrendingDown, TrendingUp, WalletCards, X,
} from 'lucide-react'
import { equityPoints, trades } from './data'
import Funds from './Funds'
import Performance from './Performance'

type Screen = 'dashboard' | 'strategy' | 'positions' | 'analytics' | 'journal' | 'funds'
const money = (value: number) => `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString()}`

const navItems: { id: Screen; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'strategy', label: 'Current day', icon: Sun },
  { id: 'positions', label: 'Positions', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'funds', label: 'Fund management', icon: WalletCards },
]

const screenPaths: Record<Screen, string> = {
  dashboard: '/',
  strategy: '/current-day',
  positions: '/positions',
  analytics: '/analytics',
  journal: '/journal',
  funds: '/fund-management',
}
const appBase = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')
const pathForScreen = (screen: Screen) => `${appBase}${screenPaths[screen]}` || '/'
const screenForPath = (pathname: string): Screen | null => {
  const relativePath = appBase && (pathname === appBase || pathname.startsWith(`${appBase}/`)) ? pathname.slice(appBase.length) || '/' : pathname
  const normalizedPath = relativePath !== '/' ? relativePath.replace(/\/+$/, '') : relativePath
  return (Object.keys(screenPaths) as Screen[]).find(screen => screenPaths[screen] === normalizedPath) || null
}

function StatCard({ label, value, detail, tone = 'default' }: { label: string; value: string; detail: string; tone?: 'default' | 'profit' | 'loss' }) {
  return (
    <article className={`stat-card ${tone}`}>
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function EquityChart() {
  const width = 760
  const height = 230
  const min = Math.min(...equityPoints)
  const max = Math.max(...equityPoints)
  const points = equityPoints.map((point, index) => {
    const x = 8 + (index / (equityPoints.length - 1)) * (width - 16)
    const y = height - 14 - ((point - min) / (max - min)) * (height - 28)
    return `${x},${y}`
  }).join(' ')
  const area = `8,${height - 10} ${points} ${width - 8},${height - 10}`

  return (
    <div className="chart-wrap" aria-label="Cumulative profit chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00afb9" stopOpacity=".32" />
            <stop offset="1" stopColor="#00afb9" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[46, 92, 138, 184].map(y => <line key={y} x1="8" x2="752" y1={y} y2={y} className="grid-line" />)}
        <polygon points={area} fill="url(#area)" />
        <polyline points={points} className="equity-line" />
      </svg>
      <div className="chart-labels"><span>Jun 2</span><span>Jun 11</span><span>Jun 18</span><span>Jun 29</span></div>
    </div>
  )
}

function Dashboard() {
  const [filter, setFilter] = useState<'all' | 'SPX' | 'stocks'>('all')
  const visible = trades.filter(t => filter === 'all' || (filter === 'SPX' ? t.ticker === 'SPX' : t.ticker !== 'SPX'))
  const net = visible.reduce((sum, trade) => sum + trade.pnl, 0)
  const wins = visible.filter(t => t.pnl > 0).length
  const winRate = visible.length ? Math.round((wins / visible.length) * 100) : 0

  return (
    <>
      <section className="hero-row">
        <div>
          <span className="eyebrow">Performance overview</span>
          <h1>Trade with a measurable edge.</h1>
          <p>Review execution quality, spot recurring patterns, and protect what is working.</p>
        </div>
        <div className="period-control" role="group" aria-label="Instrument filter">
          {(['all', 'SPX', 'stocks'] as const).map(item => (
            <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>
              {item === 'all' ? 'All trades' : item === 'stocks' ? 'Stocks' : item}
            </button>
          ))}
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Net profit" value={money(net)} detail="Selected trades" tone="profit" />
        <StatCard label="Win rate" value={`${winRate}%`} detail={`${wins} of ${visible.length} winners`} />
        <StatCard label="Profit factor" value="2.36" detail="Healthy · above 1.5" />
        <StatCard label="Average hold" value="35m" detail="Inside your target" />
      </section>

      <section className="two-column wide-left">
        <article className="card">
          <div className="card-heading">
            <div><span className="eyebrow">Growth</span><h2>Cumulative P&amp;L</h2></div>
            <span className="positive-chip"><TrendingUp size={14} /> +$3,485</span>
          </div>
          <EquityChart />
        </article>
        <article className="card edge-card">
          <span className="eyebrow">Edge snapshot</span>
          <div className="score-ring"><strong>{winRate}%</strong><span>win rate</span></div>
          <div className="edge-row"><span>Best setup</span><strong>Iron Condor</strong></div>
          <div className="edge-row"><span>Best instrument</span><strong>SPX</strong></div>
          <div className="edge-row warning"><span>Watch</span><strong>Late entries</strong></div>
        </article>
      </section>

      <section className="card">
        <div className="card-heading">
          <div><span className="eyebrow">Execution log</span><h2>Recent trades</h2></div>
          <button className="text-button">View journal <ChevronRight size={15} /></button>
        </div>
        <div className="trade-list">
          {visible.slice().reverse().slice(0, 6).map(trade => (
            <div className="trade-row" key={trade.id}>
              <div className="ticker">{trade.ticker}</div>
              <div className="trade-main"><strong>{trade.setup}</strong><span>{trade.date} · {trade.side} · held {trade.time}</span></div>
              <span className={`result ${trade.result.toLowerCase()}`}>{trade.result}</span>
              <strong className={trade.pnl >= 0 ? 'profit-text' : 'loss-text'}>{money(trade.pnl)}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function Strategy() {
  const [vix, setVix] = useState(14.5)
  const [gap, setGap] = useState(0.3)
  const [bias, setBias] = useState('Neutral')
  const [event, setEvent] = useState('None')
  const highRisk = event !== 'None' || vix > 24 || Math.abs(gap) > 1.2
  const strategy = highRisk ? 'Defined-risk butterfly' : bias === 'Bullish' ? 'Put credit spread' : bias === 'Bearish' ? 'Call credit spread' : 'Iron condor'

  return (
    <>
      <section className="hero-row"><div><span className="eyebrow">SPX · Credit strategies</span><h1>Morning decision tree</h1><p>Set today’s conditions to surface a disciplined setup.</p></div><span className="date-chip"><CalendarDays size={15} /> Sep 7, 2026</span></section>
      <section className="two-column">
        <article className="card news-card"><span className="eyebrow">Market context</span><h2>Pre-market checklist</h2><div className="news-item"><i className="teal" />VIX is {vix < 20 ? 'inside the normal premium-selling range' : 'elevated; widen strikes'}.</div><div className="news-item"><i className="green" />SPX remains above its daily 50 EMA.</div><div className="news-item"><i className="orange" />Dealer gamma is positive; expect mean reversion.</div></article>
        <article className="cushion-card"><span className="eyebrow">Margin cushion</span><strong>$9,270</strong><p>Remaining after this month’s losses</p><div className="progress"><i style={{ width: '79%' }} /></div><div className="cushion-line"><span>Carried over</span><b>$11,750</b></div><div className="cushion-line"><span>Losses this month</span><b>−$2,480</b></div></article>
      </section>
      <section className="card controls-card">
        <div className="range-control"><label htmlFor="vix">VIX level <strong>{vix.toFixed(1)}</strong></label><input id="vix" type="range" min="8" max="60" step="0.5" value={vix} onChange={e => setVix(+e.target.value)} /></div>
        <div className="range-control"><label htmlFor="gap">Overnight gap <strong>{gap.toFixed(1)}%</strong></label><input id="gap" type="range" min="-3" max="3" step="0.1" value={gap} onChange={e => setGap(+e.target.value)} /></div>
        <Choice label="Morning bias" options={['Neutral', 'Bullish', 'Bearish', 'Choppy']} value={bias} onChange={setBias} />
        <Choice label="Scheduled event" options={['None', 'FOMC', 'CPI / PPI', 'Jobs / NFP']} value={event} onChange={setEvent} />
      </section>
      <section className="recommendation">
        <div className="recommend-icon"><Sparkles /></div><div><span className="eyebrow">Today’s playbook</span><h2>{strategy}</h2><p>{highRisk ? 'Event or volatility risk calls for tightly defined exposure and smaller size.' : 'Balanced conditions favor a neutral, defined-risk premium structure.'}</p></div>
        <div className="recommend-stats"><span>Target credit <b>$1.80–$2.30</b></span><span>Entry window <b>7:00–8:15 PDT</b></span><span>Risk <b>0.5× size</b></span></div>
      </section>
    </>
  )
}

function Choice({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="choice"><span>{label}</span><div>{options.map(option => <button key={option} className={value === option ? 'active' : ''} onClick={() => onChange(option)}>{option}</button>)}</div></div>
}

function Positions() {
  const positions = [
    { symbol: 'SPX', setup: 'Iron Condor · 5540/5550 · 5700/5710', expiry: 'Sep 8', credit: '$2.10', pnl: 184, delta: '−0.04' },
    { symbol: 'NVDA', setup: 'Put Credit Spread · 165/160', expiry: 'Sep 11', credit: '$1.35', pnl: -72, delta: '0.11' },
    { symbol: 'AAPL', setup: 'Call Debit Spread · 240/245', expiry: 'Sep 18', credit: '$2.48', pnl: 126, delta: '0.28' },
  ]
  return <><section className="hero-row"><div><span className="eyebrow">Live book</span><h1>Active positions</h1><p>Monitor risk, exposure, and exits from one focused view.</p></div><button className="primary-button"><Plus size={16} /> Add position</button></section><section className="stats-grid three"><StatCard label="Open P&L" value="+$238" detail="Across 3 positions" tone="profit" /><StatCard label="Buying power" value="$14,260" detail="31% currently deployed" /><StatCard label="Portfolio delta" value="+0.35" detail="Slight bullish exposure" /></section><section className="card position-table"><div className="table-head"><span>Position</span><span>Expiry</span><span>Credit</span><span>Delta</span><span>Open P&amp;L</span></div>{positions.map(p => <div className="table-row" key={p.symbol}><div><b>{p.symbol}</b><small>{p.setup}</small></div><span>{p.expiry}</span><span>{p.credit}</span><span>{p.delta}</span><strong className={p.pnl >= 0 ? 'profit-text' : 'loss-text'}>{money(p.pnl)}</strong></div>)}</section></>
}

function Analytics() {
  return <Performance />
}

function Journal() {
  const [query, setQuery] = useState('')
  const filtered = trades.filter(t => `${t.ticker} ${t.setup} ${t.result}`.toLowerCase().includes(query.toLowerCase()))
  return <><section className="hero-row"><div><span className="eyebrow">Review and improve</span><h1>Trading journal</h1><p>Every execution, result, and setup in a searchable record.</p></div><input className="search" placeholder="Search trades…" value={query} onChange={e => setQuery(e.target.value)} /></section><section className="card"><div className="journal-grid journal-head"><span>Date</span><span>Instrument</span><span>Setup</span><span>Duration</span><span>Result</span></div>{filtered.map(t => <div className="journal-grid" key={t.id}><span>{t.date}</span><b>{t.ticker}</b><span>{t.setup}</span><span>{t.time}</span><strong className={t.pnl >= 0 ? 'profit-text' : 'loss-text'}>{money(t.pnl)}</strong></div>)}</section></>
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => screenForPath(window.location.pathname) || 'dashboard')
  const [dark, setDark] = useState(false)
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])
  useEffect(() => {
    const syncScreenToUrl = () => {
      const nextScreen = screenForPath(window.location.pathname)
      if (nextScreen) setScreen(nextScreen)
      else {
        window.history.replaceState({}, '', pathForScreen('dashboard'))
        setScreen('dashboard')
      }
    }
    syncScreenToUrl()
    window.addEventListener('popstate', syncScreenToUrl)
    return () => window.removeEventListener('popstate', syncScreenToUrl)
  }, [])
  const content = useMemo(() => ({ dashboard: <Dashboard />, strategy: <Strategy />, positions: <Positions />, analytics: <Analytics />, journal: <Journal />, funds: <Funds /> })[screen], [screen])
  const navigate = (nextScreen: Screen) => {
    const nextPath = pathForScreen(nextScreen)
    if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath)
    setScreen(nextScreen)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href={pathForScreen('dashboard')} onClick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate('dashboard') } }} aria-label="Open dashboard"><span><TrendingUp /></span><b>Trade<span>Flow</span></b></a>
        <nav>{navItems.map(item => { const Icon = item.icon; return <a key={item.id} href={pathForScreen(item.id)} className={screen === item.id ? 'active' : ''} aria-current={screen === item.id ? 'page' : undefined} onClick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(item.id) } }} title={item.label}><Icon size={17} /><span>{item.label}</span></a> })}</nav>
        <div className="top-actions"><button className="icon-button" onClick={() => setDark(value => !value)} aria-label="Toggle color theme">{dark ? <Sun /> : <Moon />}</button><button className="import-button"><Download size={16} /> Import trades</button></div>
      </header>
      <main>{content}</main>
      <footer><CircleDollarSign size={15} /> {screen === 'analytics' || screen === 'funds' ? 'TradeFlow · Data from your local API' : 'TradeFlow prototype · Illustrative data'}</footer>
    </div>
  )
}
