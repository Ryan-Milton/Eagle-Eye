import { cn } from '@/lib/utils'
import { useMarketStore } from '@/stores/market-store'
import { PipelineError } from '@/components/ui/PipelineError'

const DEFENSE_SYMBOLS = ['RTX', 'LMT', 'NOC', 'GD', 'BA', 'PLTR']
const COMMODITY_SYMBOLS = ['CL=F', 'BZ=F']

export function MarketSection({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { stocks, version, errors } = useMarketStore()
  void version

  const hasData = stocks.size > 0

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors"
      >
        <span className="text-[11px] text-zinc-600">{expanded ? '▾' : '▸'}</span>
        <span className="font-display text-[12px] font-semibold tracking-[2px] text-emerald-400 uppercase flex-1 text-left">Markets</span>
        <PipelineError errors={errors} />
        <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1', hasData ? 'bg-emerald-400' : 'bg-zinc-600')} />
        <span className="font-mono text-[11px] text-zinc-500">{stocks.size}</span>
      </button>

      {expanded && (
        <div className="border-b border-zinc-800">
          {/* Defense stocks */}
          <div className="px-3.5 py-1.5 border-b border-zinc-800/40">
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">Defense</span>
          </div>
          {DEFENSE_SYMBOLS.map(sym => {
            const stock = stocks.get(sym)
            if (!stock) return (
              <div key={sym} className="flex items-center gap-2 pl-5 pr-3 py-1 border-b border-zinc-800/20">
                <span className="font-mono text-[11px] text-zinc-500 flex-1">{sym}</span>
                <span className="font-mono text-[10px] text-zinc-600">—</span>
              </div>
            )
            return <StockRow key={sym} stock={stock} />
          })}

          {/* Commodities */}
          <div className="px-3.5 py-1.5 border-b border-zinc-800/40">
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">Commodities</span>
          </div>
          {COMMODITY_SYMBOLS.map(sym => {
            const stock = stocks.get(sym)
            if (!stock) return (
              <div key={sym} className="flex items-center gap-2 pl-5 pr-3 py-1 border-b border-zinc-800/20">
                <span className="font-mono text-[11px] text-zinc-500 flex-1">{sym}</span>
                <span className="font-mono text-[10px] text-zinc-600">—</span>
              </div>
            )
            return <StockRow key={sym} stock={stock} />
          })}
        </div>
      )}
    </div>
  )
}

function StockRow({ stock }: { stock: { symbol: string; name: string; price: number; change: number; changePercent: number } }) {
  const isUp = stock.change >= 0
  return (
    <div className="flex items-center gap-2 pl-5 pr-3 py-1 border-b border-zinc-800/20 hover:bg-zinc-800/20">
      <span className="font-mono text-[11px] text-zinc-400 w-12">{stock.symbol.replace('=F', '')}</span>
      <span className="font-mono text-[10px] text-zinc-500 flex-1 truncate">{stock.name}</span>
      <span className="font-mono text-[11px] text-zinc-300">${stock.price.toFixed(2)}</span>
      <span className={cn('font-mono text-[10px] w-16 text-right', isUp ? 'text-green-400' : 'text-red-400')}>
        {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
      </span>
    </div>
  )
}
