/**
 * ReachscopeGeometry — pure 2D geometry on the countertop plane (X/Z, height ignored).
 *
 * Owns: distance, segment-vs-axis-aligned-rectangle intersection (Liang–Barsky clip),
 *       and the single-verdict priority rule TOO FAR > PATH BLOCKED > DIRECT PATH CLEAR.
 * Expects: plain numbers (world-space cm) — callers read them from live world transforms.
 * Must not: touch the scene, hold state, or know about any "scenario" or preset positions.
 */

export type Verdict = "TOO FAR" | "PATH BLOCKED" | "DIRECT PATH CLEAR"

export interface Vec2 {
  x: number
  z: number
}

export interface RectXZ {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface SegmentRectHit {
  hit: boolean
  /** Parameter along the segment (0 = start, 1 = end) where the segment first enters the rectangle. */
  tEnter: number
  /** Parameter where it leaves the rectangle. */
  tExit: number
  /** World-space XZ point where the segment first enters the rectangle (valid when hit). */
  entry: Vec2
  /** Midpoint of the clipped part inside the rectangle (valid when hit). */
  mid: Vec2
}

export function distance2D(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x
  const dz = b.z - a.z
  return Math.sqrt(dx * dx + dz * dz)
}

/**
 * Exact segment / axis-aligned rectangle intersection (Liang–Barsky).
 * Touching the boundary counts as crossing. No clearance padding.
 */
export function segmentRectIntersection(a: Vec2, b: Vec2, r: RectXZ): SegmentRectHit {
  const dx = b.x - a.x
  const dz = b.z - a.z
  let t0 = 0
  let t1 = 1
  const p = [-dx, dx, -dz, dz]
  const q = [a.x - r.minX, r.maxX - a.x, a.z - r.minZ, r.maxZ - a.z]
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) {
        return miss()
      }
    } else {
      const t = q[i] / p[i]
      if (p[i] < 0) {
        if (t > t1) return miss()
        if (t > t0) t0 = t
      } else {
        if (t < t0) return miss()
        if (t < t1) t1 = t
      }
    }
  }
  const entry = {x: a.x + dx * t0, z: a.z + dz * t0}
  const tm = (t0 + t1) * 0.5
  const mid = {x: a.x + dx * tm, z: a.z + dz * tm}
  return {hit: true, tEnter: t0, tExit: t1, entry, mid}
}

function miss(): SegmentRectHit {
  return {hit: false, tEnter: 0, tExit: 0, entry: {x: 0, z: 0}, mid: {x: 0, z: 0}}
}

/** Footprint of an unrotated divider centered at (cx, cz). Width along X, thickness along Z. */
export function footprintRect(cx: number, cz: number, widthCm: number, thicknessCm: number): RectXZ {
  return {
    minX: cx - widthCm / 2,
    maxX: cx + widthCm / 2,
    minZ: cz - thicknessCm / 2,
    maxZ: cz + thicknessCm / 2
  }
}

export interface Evaluation {
  verdict: Verdict
  distanceCm: number
  crossing: SegmentRectHit
}

/** Evaluation order from the brief: distance first, then obstruction, else clear. */
export function evaluate(marker: Vec2, button: Vec2, divider: RectXZ, maxReachCm: number): Evaluation {
  const distanceCm = distance2D(marker, button)
  const crossing = segmentRectIntersection(marker, button, divider)
  let verdict: Verdict
  if (distanceCm > maxReachCm) {
    verdict = "TOO FAR"
  } else if (crossing.hit) {
    verdict = "PATH BLOCKED"
  } else {
    verdict = "DIRECT PATH CLEAR"
  }
  return {verdict, distanceCm, crossing}
}
