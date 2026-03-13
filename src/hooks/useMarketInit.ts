import { useEffect } from 'react'
import { useMarketStore } from '@/stores/market-store'
import { parseYahooChart } from '@/lib/market-client'
import type { StockData } from '@/lib/market-client'

const POLL_INTERVAL = 900_000 // 15 minutes

export function useMarketInit() {
  const setStocks = useMarketStore(s => s.setStocks)
  const setErrors = useMarketStore(s => s.setErrors)

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const res = await fetch('/api/markets/quotes')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as { quotes: Array<{ symbol: string; data: unknown }> }
        const stocks: StockData[] = []
        for (const q of data.quotes ?? []) {
          const parsed = parseYahooChart(q.data, q.symbol)
          if (parsed) stocks.push(parsed)
        }
        setStocks(stocks)
      } catch (err) {
        setErrors([(err as Error).message])
        console.warn('[Markets] Fetch failed:', (err as Error).message)
      }
    }

    fetchMarkets()
    const interval = setInterval(fetchMarkets, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [setStocks, setErrors])
}
