export const VESSEL_TYPE_COLORS: Record<string, string> = {
  cargo: 'text-cyan-400 border-cyan-800/60 bg-cyan-950/40',
  tanker: 'text-rose-400 border-rose-800/60 bg-rose-950/40',
  passenger: 'text-violet-400 border-violet-800/60 bg-violet-950/40',
  fishing: 'text-green-400 border-green-800/60 bg-green-950/40',
  military: 'text-red-400 border-red-800/60 bg-red-950/40',
  tug: 'text-amber-400 border-amber-800/60 bg-amber-950/40',
  pleasure: 'text-blue-400 border-blue-800/60 bg-blue-950/40',
  other: 'text-zinc-400 border-zinc-700/60 bg-zinc-800/40',
}

export const VESSEL_TYPE_DOT_COLORS: Record<string, string> = {
  cargo: '#22d3ee', tanker: '#fb7185', passenger: '#a78bfa', fishing: '#4ade80',
  military: '#f87171', tug: '#fbbf24', pleasure: '#60a5fa', other: '#a1a1aa',
}

export const FLIGHT_TYPE_COLORS: Record<string, string> = {
  commercial: 'text-yellow-400 border-yellow-800/60 bg-yellow-950/40',
  cargo: 'text-amber-400 border-amber-800/60 bg-amber-950/40',
  military: 'text-red-400 border-red-800/60 bg-red-950/40',
  private: 'text-blue-400 border-blue-800/60 bg-blue-950/40',
  helicopter: 'text-green-400 border-green-800/60 bg-green-950/40',
  other: 'text-zinc-400 border-zinc-700/60 bg-zinc-800/40',
}

export const FLIGHT_TYPE_DOT_COLORS: Record<string, string> = {
  commercial: '#facc15', cargo: '#f59e0b', military: '#f87171',
  private: '#60a5fa', helicopter: '#4ade80', other: '#a1a1aa',
}

export const WEATHER_TYPE_COLORS: Record<string, string> = {
  earthquake: 'text-amber-400 border-amber-800/60 bg-amber-950/40',
  wildfire: 'text-orange-400 border-orange-800/60 bg-orange-950/40',
  volcano: 'text-red-400 border-red-800/60 bg-red-950/40',
  storm: 'text-purple-400 border-purple-800/60 bg-purple-950/40',
  flood: 'text-blue-400 border-blue-800/60 bg-blue-950/40',
  iceberg: 'text-sky-400 border-sky-800/60 bg-sky-950/40',
  drought: 'text-yellow-400 border-yellow-800/60 bg-yellow-950/40',
  alert: 'text-rose-400 border-rose-800/60 bg-rose-950/40',
}

export const WEATHER_TYPE_DOT_COLORS: Record<string, string> = {
  earthquake: '#fbbf24', wildfire: '#fb923c', volcano: '#f87171',
  storm: '#c084fc', flood: '#60a5fa', iceberg: '#38bdf8',
  drought: '#facc15', alert: '#fb7185',
}
