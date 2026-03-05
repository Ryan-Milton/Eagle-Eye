export type NavView = 'Globe' | 'Objects' | 'Graph' | 'Signals' | 'Reports'

export type SatCategory = 'station' | 'comms' | 'nav' | 'weather' | 'earth-obs' | 'scientific' | 'military' | 'amateur'

export type ConstellationId =
  | 'iss' | 'starlink' | 'oneweb' | 'iridium' | 'iridium-next'
  | 'globalstar' | 'orbcomm' | 'ses' | 'intelsat' | 'telesat'
  | 'gps' | 'glonass' | 'galileo' | 'beidou'
  | 'noaa' | 'goes' | 'meteosat'
  | 'landsat' | 'sentinel' | 'planet'
  | 'science' | 'military-sat' | 'amateur'

export interface ConstellationMeta {
  id: ConstellationId
  name: string
  category: SatCategory
  celestrakGroup: string
  color: number
  defaultOn: boolean
}

export interface OmmRecord {
  OBJECT_NAME: string
  OBJECT_ID: string
  NORAD_CAT_ID: number
  EPOCH: string
  MEAN_MOTION: number
  ECCENTRICITY: number
  INCLINATION: number
  RA_OF_ASC_NODE: number
  ARG_OF_PERICENTER: number
  MEAN_ANOMALY: number
  CLASSIFICATION_TYPE: 'U' | 'C' | 'S'
  ELEMENT_SET_NO: number
  REV_AT_EPOCH: number
  BSTAR: number
  MEAN_MOTION_DOT: number
  MEAN_MOTION_DDOT: number
}

export interface SatelliteRecord {
  noradId: number
  name: string
  constellationId: ConstellationId
  satrec: unknown
  epoch: Date
  inclination: number
  period: number
  eccentricity: number
}

export interface SatellitePosition {
  noradId: number
  lat: number
  lon: number
  alt: number
  velocity: number
}

export type TrackingMode = 'satellites' | 'maritime' | 'flights'

export type VesselType = 'cargo' | 'tanker' | 'passenger' | 'fishing' | 'military' | 'tug' | 'pleasure' | 'other'

export type FlightType = 'commercial' | 'cargo' | 'military' | 'private' | 'helicopter' | 'other'

export interface FlightRecord {
  icao24: string
  callsign: string
  type: FlightType
  originCountry: string
  lat: number
  lon: number
  altitude: number       // meters (barometric)
  speed: number          // m/s
  heading: number        // degrees
  verticalRate: number   // m/s
  onGround: boolean
  lastUpdate: number     // timestamp ms
}

export interface VesselRecord {
  mmsi: number
  name: string
  type: VesselType
  lat: number
  lon: number
  speed: number       // knots (SOG)
  course: number      // degrees (COG)
  heading: number     // true heading
  navStatus: number   // AIS nav status code
  lastUpdate: number  // timestamp ms
}
