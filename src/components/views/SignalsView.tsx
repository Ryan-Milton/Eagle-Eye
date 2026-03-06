import { useSatelliteStore } from '@/stores/satellite-store'
import { useVesselStore } from '@/stores/vessel-store'
import { useFlightStore } from '@/stores/flight-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useNewsStore } from '@/stores/news-store'
import { useConflictStore } from '@/stores/conflict-store'
import { useCyberStore } from '@/stores/cyber-store'
import { useOsintStore } from '@/stores/osint-store'
import { useAlertStore } from '@/stores/alert-store'

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-mono text-2xl font-bold ${color}`}>{value}</div>
    </div>
  )
}

function BarChart({ title, data }: { title: string; data: Array<{ label: string; value: number; color: string }> }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="font-display text-[12px] font-semibold tracking-[2px] text-zinc-500 uppercase mb-3">{title}</div>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-zinc-500 w-16 text-right uppercase">{d.label}</span>
            <div className="flex-1 h-4 bg-zinc-800 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-500"
                style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color }}
              />
            </div>
            <span className="font-mono text-[11px] text-zinc-400 w-10 text-right">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SignalsView() {
  const satStats = useSatelliteStore(s => s.getStats)()
  const vesselCount = useVesselStore(s => s.count)
  const flightCount = useFlightStore(s => s.count)
  const weatherCount = useWeatherStore(s => s.count)
  const newsCount = useNewsStore(s => s.count)
  const conflictCount = useConflictStore(s => s.count)
  const cyberCount = useCyberStore(s => s.count)
  const osintCount = useOsintStore(s => s.count)
  const alertCount = useAlertStore(s => s.alerts.length)
  const unackCount = useAlertStore(s => s.unacknowledgedCount)

  const totalEntities = satStats.enabledCount + vesselCount + flightCount + weatherCount + newsCount + conflictCount + cyberCount + osintCount

  const domainData = [
    { label: 'SAT', value: satStats.enabledCount, color: '#f97316' },
    { label: 'AIS', value: vesselCount, color: '#22d3ee' },
    { label: 'ADSB', value: flightCount, color: '#eab308' },
    { label: 'WX', value: weatherCount, color: '#4ade80' },
    { label: 'NEWS', value: newsCount, color: '#fb7185' },
    { label: 'CON', value: conflictCount, color: '#f87171' },
    { label: 'CYB', value: cyberCount, color: '#c084fc' },
    { label: 'OSINT', value: osintCount, color: '#2dd4bf' },
  ]

  return (
    <div className="fixed top-[46px] left-64 right-[272px] bottom-[34px] bg-zinc-950 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 p-4">
      <div className="font-display text-[13px] font-semibold tracking-[3px] text-zinc-600 uppercase mb-4">Signals Dashboard</div>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Entities" value={totalEntities.toLocaleString()} color="text-orange-400" />
        <StatCard label="Active Sources" value={`${domainData.filter(d => d.value > 0).length}/8`} color="text-green-400" />
        <StatCard label="Alerts" value={alertCount} color="text-yellow-400" />
        <StatCard label="Unacknowledged" value={unackCount} color={unackCount > 0 ? 'text-red-400' : 'text-zinc-400'} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-3">
        <BarChart title="Entities by Domain" data={domainData} />
        <BarChart title="Active Counts" data={domainData.filter(d => d.value > 0)} />
      </div>
    </div>
  )
}
