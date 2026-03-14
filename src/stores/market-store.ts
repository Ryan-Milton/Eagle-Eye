import { create } from 'zustand'
import type { StockData } from '@/lib/market-client'

interface MarketState {
  stocks: Map<string, StockData>
  version: number
  lastFetch: number | null
  errors: string[]

  setStocks: (stocks: StockData[]) => void
  setErrors: (errors: string[]) => void
}

export const useMarketStore = create<MarketState>()((set) => ({
  stocks: new Map(),
  version: 0,
  lastFetch: null,
  errors: [],

  setStocks: (stocks) => {
    const map = new Map<string, StockData>()
    for (const s of stocks) map.set(s.symbol, s)
    set(prev => ({ stocks: map, version: prev.version + 1, lastFetch: Date.now(), errors: [] }))
  },

  setErrors: (errors) => set({ errors }),
}))
