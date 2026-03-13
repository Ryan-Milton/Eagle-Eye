export interface StockData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
}

const SYMBOL_NAMES: Record<string, string> = {
  RTX: 'Raytheon',
  LMT: 'Lockheed Martin',
  NOC: 'Northrop Grumman',
  GD: 'General Dynamics',
  BA: 'Boeing',
  PLTR: 'Palantir',
  'CL=F': 'WTI Crude',
  'BZ=F': 'Brent Crude',
}

/** Parse Yahoo Finance chart response for a single symbol */
export function parseYahooChart(json: unknown, symbol: string): StockData | null {
  const data = json as {
    chart?: {
      result?: Array<{
        meta?: {
          regularMarketPrice?: number
          previousClose?: number
          currency?: string
          symbol?: string
        }
      }>
    }
  }

  const meta = data?.chart?.result?.[0]?.meta
  if (!meta?.regularMarketPrice) return null

  const price = meta.regularMarketPrice
  const prevClose = meta.previousClose ?? price
  const change = price - prevClose
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0

  return {
    symbol,
    name: SYMBOL_NAMES[symbol] ?? symbol,
    price,
    change,
    changePercent,
    currency: meta.currency ?? 'USD',
  }
}
