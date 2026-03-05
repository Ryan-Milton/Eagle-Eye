import { create } from 'zustand'

interface SelectionState {
  selectedSatId: number | null
  selectedMmsi: number | null
  selectedIcao: string | null
  selectedEventId: string | null
  selectSatellite: (id: number | null) => void
  selectVessel: (mmsi: number | null) => void
  selectFlight: (icao: string | null) => void
  selectEvent: (id: string | null) => void
  clearAll: () => void
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selectedSatId: null,
  selectedMmsi: null,
  selectedIcao: null,
  selectedEventId: null,

  selectSatellite: (id) => set(
    id !== null
      ? { selectedSatId: id, selectedMmsi: null, selectedIcao: null, selectedEventId: null }
      : { selectedSatId: null },
  ),

  selectVessel: (mmsi) => set(
    mmsi !== null
      ? { selectedSatId: null, selectedMmsi: mmsi, selectedIcao: null, selectedEventId: null }
      : { selectedMmsi: null },
  ),

  selectFlight: (icao) => set(
    icao !== null
      ? { selectedSatId: null, selectedMmsi: null, selectedIcao: icao, selectedEventId: null }
      : { selectedIcao: null },
  ),

  selectEvent: (id) => set(
    id !== null
      ? { selectedSatId: null, selectedMmsi: null, selectedIcao: null, selectedEventId: id }
      : { selectedEventId: null },
  ),

  clearAll: () => set({ selectedSatId: null, selectedMmsi: null, selectedIcao: null, selectedEventId: null }),
}))
