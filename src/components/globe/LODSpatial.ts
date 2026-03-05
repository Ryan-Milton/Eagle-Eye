import { Camera, WebGLRenderer, Object3D, Vector3, Matrix4 } from 'three'
import { MapNode, MapSphereNode, type MapView, type LODControl } from 'geo-three'

const _cameraWorldPos = new Vector3()
const _cameraLocalPos = new Vector3()
const _tileDir = new Vector3()
const _inverseParent = new Matrix4()

/**
 * Patch MapNode.prototype.nodeReady to prevent nodesLoaded from exceeding
 * MapNode.childrens (4). geo-three has a race condition: when tile caching
 * is enabled, a rapid simplify→subdivide(cache) cycle can cause stale async
 * nodeReady() callbacks (from a previous createChildNodes init) to fire after
 * the cache restore has already set nodesLoaded = 4, pushing it to 5–8.
 *
 * The patch suppresses the increment but still runs the visibility logic,
 * because subdivide()'s cache-restore path sets nodesLoaded=4 without
 * making children visible — that's nodeReady()'s job.
 */
const _origNodeReady = MapNode.prototype.nodeReady
MapNode.prototype.nodeReady = function (this: any) {
  if (this.disposed) {
    _origNodeReady.call(this)
    return
  }
  if (this.parentNode !== null) {
    if (this.parentNode.nodesLoaded >= MapNode.childrens) {
      // Stale callback — don't increment past 4, but DO ensure
      // children are visible (cache restore sets nodesLoaded=4
      // without making children visible)
      if (this.parentNode.subdivided) {
        this.parentNode.isMesh = false
      }
      for (let i = 0; i < this.parentNode.children.length; i++) {
        this.parentNode.children[i].visible = true
      }
      return
    }
    _origNodeReady.call(this)
  } else {
    _origNodeReady.call(this)
  }
}

/**
 * Patch MapSphereNode.applyScaleNode to keep tile geometry at unit sphere scale.
 * The original multiplies vertex positions by EARTH_RADIUS (~6.37M), which places
 * tiles millions of units from origin — far beyond our camera's far plane.
 * This version only centers the geometry without scaling.
 */
MapSphereNode.prototype.applyScaleNode = function (this: any) {
  this.geometry.computeBoundingBox()
  const box = this.geometry.boundingBox.clone()
  const center = box.getCenter(new Vector3())
  // Only center the geometry — do NOT scale by EARTH_RADIUS
  const matrix = new Matrix4()
  matrix.makeTranslation(-center.x, -center.y, -center.z)
  this.geometry.applyMatrix4(matrix)
  this.position.copy(center)
  this.updateMatrix()
  this.updateMatrixWorld()

  // Scale webMercatorBounds from EARTH_RADIUS to unit sphere so the
  // fragment shader's UV calculation matches the unscaled vertex positions.
  const bounds = this.material.uniforms?.webMercatorBounds?.value
  if (bounds) {
    const R = 6371008
    bounds.x /= R
    bounds.y /= R
    bounds.z /= R
    bounds.w /= R
  }
}

/**
 * Patch MapSphereNode.updateMatrixWorld to use gGroup's matrixWorld (the MapView's
 * parent) so tiles are positioned on the rotated unit sphere. Each node independently
 * references gGroup, bypassing parent tile positions that would otherwise compound
 * incorrectly.
 */
MapSphereNode.prototype.updateMatrixWorld = function (this: any, force?: boolean) {
  if (this.matrixWorldNeedsUpdate || force) {
    const container = this.mapView?.parent // gGroup
    if (container) {
      this.matrixWorld.multiplyMatrices(container.matrixWorld, this.matrix)
    } else {
      this.matrixWorld.copy(this.matrix)
    }
    this.matrixWorldNeedsUpdate = false
  }
  // Propagate to children (original override skipped this)
  for (let i = 0; i < this.children.length; i++) {
    this.children[i].updateMatrixWorld(force)
  }
}

/**
 * Custom LOD that uses spatial culling on the unit sphere.
 *
 * geo-three's LODRadial uses world-space distances, which break when the
 * MapView is scaled down to unit-sphere size (all node positions collapse
 * near origin). This LOD instead:
 *   1. Computes camera altitude above the unit sphere
 *   2. Derives a target tile zoom from altitude (log-based)
 *   3. Culls tiles by dot-product against camera direction (horizon check)
 *   4. Only subdivides visible tiles up to the target zoom
 */
export class LODSpatial implements LODControl {
  /** Home altitude (camera distance - 1) at default zoom */
  private homeAltitude = 3.65

  updateLOD(view: MapView, camera: Camera, renderer: WebGLRenderer, scene: Object3D): void {
    const provider = view.provider
    if (!provider) return

    // 1. Camera world position → distance from origin
    camera.getWorldPosition(_cameraWorldPos)
    const cameraDist = _cameraWorldPos.length()
    const altitude = Math.max(cameraDist - 1.0, 0.0001)

    // 2. Target tile zoom from altitude (log-based)
    //    homeAltitude → level 4, halving altitude → +1 level
    const targetZoom = Math.min(
      provider.maxZoom,
      Math.max(0, Math.round(4 + Math.log2(this.homeAltitude / altitude))),
    )

    // 3. Camera direction in globe-local space
    //    The MapView's parent (gGroup) applies rotation; invert it to get
    //    the camera direction relative to the unrotated globe.
    const mapParent = view.parent
    if (mapParent) {
      _inverseParent.copy(mapParent.matrixWorld).invert()
      _cameraLocalPos.copy(_cameraWorldPos).applyMatrix4(_inverseParent)
    } else {
      _cameraLocalPos.copy(_cameraWorldPos)
    }
    const cameraDir = _cameraLocalPos.normalize()

    // 4. Horizon angle — how much of the sphere is visible from this altitude
    const horizonAngle = Math.acos(1.0 / Math.max(cameraDist, 1.0001))

    // 5. Traverse tile tree and collect subdivide/simplify decisions
    //    Don't mutate the tree during traversal — collect first, apply after.
    //    This prevents tree mutation during iteration and avoids contradictory
    //    operations on the same node within a single frame.
    const root = view.children[0]
    if (!root) return

    const toSubdivide: Object3D[] = []
    const toSimplify = new Set<Object3D>()

    root.traverse((node: any) => {
      if (node.level === undefined) return // skip non-tile nodes

      // Tile direction on unit sphere (node.position is at EARTH_RADIUS scale)
      _tileDir.copy(node.position).normalize()

      // Angular distance between camera look direction and tile center
      const dot = cameraDir.dot(_tileDir)
      const angle = Math.acos(Math.min(1, Math.max(-1, dot)))

      // Tile angular size — each zoom level halves the tile angular extent
      // Level 0 = π (hemisphere), level 1 = π/2, etc.
      const tileAngularSize = Math.PI / Math.pow(2, node.level)

      // Tile is visible if its center (plus its angular radius) is within the horizon
      const visible = angle - tileAngularSize < horizonAngle + tileAngularSize * 2

      if (visible && node.level < targetZoom) {
        toSubdivide.push(node)
      } else if (node.parentNode && (node.level > targetZoom + 1 || !visible)) {
        // Only simplify if all 4 children have finished loading
        if (node.parentNode.nodesLoaded >= MapNode.childrens) {
          toSimplify.add(node.parentNode)
        }
      }
    })

    // Remove contradictions: don't simplify a parent whose child we want to subdivide
    for (const node of toSubdivide) {
      toSimplify.delete((node as any).parentNode)
    }

    // Apply mutations after traversal is complete
    for (const node of toSubdivide) {
      ;(node as any).subdivide()
    }
    for (const node of toSimplify) {
      ;(node as any).simplify()
    }
  }
}
