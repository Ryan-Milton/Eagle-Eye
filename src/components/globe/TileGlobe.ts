import { MapView, MapProvider } from 'geo-three'
import { LODSpatial } from './LODSpatial'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

function fetchTileImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    img.crossOrigin = 'anonymous'
    img.src = url
    img.onload = () => resolve(img)
    img.onerror = reject
  })
}

class CartoDarkProvider extends MapProvider {
  fetchTile(zoom: number, x: number, y: number): Promise<HTMLImageElement> {
    return fetchTileImage(`https://basemaps.cartocdn.com/dark_all/${zoom}/${x}/${y}.png`)
  }
}

class CartoVoyagerProvider extends MapProvider {
  fetchTile(zoom: number, x: number, y: number): Promise<HTMLImageElement> {
    return fetchTileImage(`https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${x}/${y}.png`)
  }
}

class MapBoxSatelliteProvider extends MapProvider {
  fetchTile(zoom: number, x: number, y: number): Promise<HTMLImageElement> {
    if (!MAPBOX_TOKEN) return Promise.reject(new Error('VITE_MAPBOX_TOKEN not set'))
    return fetchTileImage(`https://api.mapbox.com/v4/mapbox.satellite/${zoom}/${x}/${y}.jpg90?access_token=${MAPBOX_TOKEN}`)
  }
}

class MapBoxStreetsProvider extends MapProvider {
  fetchTile(zoom: number, x: number, y: number): Promise<HTMLImageElement> {
    if (!MAPBOX_TOKEN) return Promise.reject(new Error('VITE_MAPBOX_TOKEN not set'))
    return fetchTileImage(`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/${zoom}/${x}/${y}?access_token=${MAPBOX_TOKEN}`)
  }
}

class MapBoxTerrainProvider extends MapProvider {
  fetchTile(zoom: number, x: number, y: number): Promise<HTMLImageElement> {
    if (!MAPBOX_TOKEN) return Promise.reject(new Error('VITE_MAPBOX_TOKEN not set'))
    return fetchTileImage(`https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/${zoom}/${x}/${y}?access_token=${MAPBOX_TOKEN}`)
  }
}

export type TileStyle = 'dark' | 'light' | 'satellite' | 'streets' | 'terrain'

const providers: Record<TileStyle, () => MapProvider> = {
  'dark': () => new CartoDarkProvider(),
  'light': () => new CartoVoyagerProvider(),
  'satellite': () => new MapBoxSatelliteProvider(),
  'streets': () => new MapBoxStreetsProvider(),
  'terrain': () => new MapBoxTerrainProvider(),
}

/**
 * Creates a geo-three MapView configured as a spherical globe with map tiles.
 * The returned MapView is a THREE.Mesh that can be added to the scene graph.
 */
export function createTileGlobe(style: TileStyle = 'dark'): MapView {
  const provider = providers[style]()
  provider.maxZoom = 18
  const map = new MapView(MapView.SPHERICAL, provider)
  map.cacheTiles = true
  // Tiles are now patched to unit sphere scale (see LODSpatial.ts patches),
  // so no scale transform is needed.
  map.frustumCulled = false // baseGeometry is at EARTH_RADIUS scale for frustum — skip culling
  map.onBeforeRender = () => {} // disable geo-three's built-in LOD call — we call updateLOD manually
  map.lod = new LODSpatial()
  return map
}
