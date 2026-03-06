import { haversineDistance } from '@/lib/utils'

export interface CorrelatedEntity {
  domain: string
  id: string
  name: string
  lat: number
  lon: number
  distance: number // km
}

/**
 * Find entities from other domains that are within `radiusKm` of the given point.
 * Uses haversine distance.
 */
export function findNearbyEntities(
  lat: number,
  lon: number,
  radiusKm: number,
  excludeId: string,
  sources: Array<{
    domain: string
    entities: Array<{ id: string; name: string; lat: number; lon: number }>
  }>,
): CorrelatedEntity[] {
  const results: CorrelatedEntity[] = []

  for (const source of sources) {
    for (const entity of source.entities) {
      if (entity.id === excludeId) continue
      const dist = haversineDistance(lat, lon, entity.lat, entity.lon)
      if (dist <= radiusKm) {
        results.push({
          domain: source.domain,
          id: entity.id,
          name: entity.name,
          lat: entity.lat,
          lon: entity.lon,
          distance: dist,
        })
      }
    }
  }

  return results.sort((a, b) => a.distance - b.distance)
}
