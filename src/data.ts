export type Trade = {
  id: number
  ticker: 'SPX' | 'NVDA' | 'AAPL' | 'TSLA'
  setup: string
  side: 'Calls' | 'Puts' | 'Neutral'
  date: string
  time: string
  pnl: number
  result: 'Win' | 'Loss'
}

export const trades: Trade[] = [
  { id: 1, ticker: 'SPX', setup: 'Iron Condor', side: 'Neutral', date: 'Jun 2', time: '41m', pnl: 480, result: 'Win' },
  { id: 2, ticker: 'SPX', setup: 'Put Credit Spread', side: 'Puts', date: 'Jun 4', time: '28m', pnl: 620, result: 'Win' },
  { id: 3, ticker: 'NVDA', setup: 'EMA Reclaim', side: 'Calls', date: 'Jun 5', time: '52m', pnl: -390, result: 'Loss' },
  { id: 4, ticker: 'SPX', setup: 'Iron Condor', side: 'Neutral', date: 'Jun 8', time: '34m', pnl: 710, result: 'Win' },
  { id: 5, ticker: 'AAPL', setup: 'Opening Range Break', side: 'Calls', date: 'Jun 10', time: '23m', pnl: 285, result: 'Win' },
  { id: 6, ticker: 'SPX', setup: 'Call Credit Spread', side: 'Calls', date: 'Jun 11', time: '47m', pnl: -520, result: 'Loss' },
  { id: 7, ticker: 'TSLA', setup: 'VWAP Rejection', side: 'Puts', date: 'Jun 12', time: '19m', pnl: 340, result: 'Win' },
  { id: 8, ticker: 'SPX', setup: 'Iron Condor', side: 'Neutral', date: 'Jun 15', time: '38m', pnl: 825, result: 'Win' },
  { id: 9, ticker: 'NVDA', setup: 'EMA Reclaim', side: 'Calls', date: 'Jun 17', time: '31m', pnl: 475, result: 'Win' },
  { id: 10, ticker: 'SPX', setup: 'Broken Wing Butterfly', side: 'Neutral', date: 'Jun 18', time: '63m', pnl: -610, result: 'Loss' },
  { id: 11, ticker: 'AAPL', setup: 'Put Credit Spread', side: 'Puts', date: 'Jun 22', time: '26m', pnl: 390, result: 'Win' },
  { id: 12, ticker: 'SPX', setup: 'Iron Condor', side: 'Neutral', date: 'Jun 24', time: '44m', pnl: 920, result: 'Win' },
  { id: 13, ticker: 'TSLA', setup: 'Opening Drive', side: 'Calls', date: 'Jun 26', time: '17m', pnl: -440, result: 'Loss' },
  { id: 14, ticker: 'SPX', setup: 'Put Credit Spread', side: 'Puts', date: 'Jun 29', time: '32m', pnl: 800, result: 'Win' },
]

export const equityPoints = trades.reduce<number[]>((points, trade) => {
  points.push((points.at(-1) ?? 0) + trade.pnl)
  return points
}, [0])
