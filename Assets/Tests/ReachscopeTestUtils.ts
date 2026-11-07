import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName} from "Leaf.lspkg/Utils/common/Utils"
import {ReachscopeMain} from "../Scripts/ReachscopeMain"

/**
 * Shared helpers for the REACHSCOPE LEAF scenarios (test code only).
 * Expected verdicts are computed HERE, independently of ReachscopeGeometry, from the live world
 * transforms of ReferenceMarker / AssistanceButton / Divider and the brief's rule:
 *   TOO FAR if dist > 65 cm, else PATH BLOCKED if the marker→button segment touches the divider's
 *   20 × 2 cm footprint, else DIRECT PATH CLEAR.
 */

export const TAG = "[REACHSCOPE-LEAF]"
export const BRIEF_REACH_CM = 65
export const BRIEF_FOOTPRINT_W = 20 // across the path (X)
export const BRIEF_FOOTPRINT_T = 2 // thickness (Z)
export const COUNTER_TOP_Y = -62

export function log(msg: string): void {
  print(`${TAG} ${msg}`)
}

/** Assertion that prints a PASS/FAIL line with the observed values, then asserts via LEAF expect. */
export function check(label: string, cond: boolean, detail: string): void {
  log(`${cond ? "PASS" : "FAIL"} ${label} :: ${detail}`)
  if (!cond) throw new Error(`${label} :: ${detail}`)
  expect(cond).toBe(true)
}

export function near(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol
}

export function fmt(v: vec3): string {
  return `(${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)})`
}

export function fmtQ(q: quat): string {
  return `(${q.w.toFixed(4)},${q.x.toFixed(4)},${q.y.toFixed(4)},${q.z.toFixed(4)})`
}

export function quatSame(a: quat, b: quat): boolean {
  const d = Math.abs(a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z)
  return d > 0.99999
}

export interface Rig {
  main: ReachscopeMain
  marker: SceneObject
  button: SceneObject
  divider: SceneObject
  label: Text
  pathLineVisual: RenderMeshVisual
  mark: SceneObject
}

export function getRig(): Rig {
  const root = findSceneObjectByName("REACHSCOPE")
  if (!root) throw new Error('SceneObject "REACHSCOPE" not found')
  const main = root.getComponent(ReachscopeMain.getTypeName()) as ReachscopeMain
  if (!main) throw new Error("ReachscopeMain component not found on REACHSCOPE")
  const statusText = findSceneObjectByName("StatusText")
  const pathLine = findSceneObjectByName("PathLine")
  const mark = findSceneObjectByName("IntersectionMark")
  return {
    main,
    marker: findSceneObjectByName("ReferenceMarker"),
    button: findSceneObjectByName("AssistanceButton"),
    divider: findSceneObjectByName("Divider"),
    label: statusText.getComponent("Component.Text") as Text,
    pathLineVisual: pathLine.getComponent("Component.RenderMeshVisual") as RenderMeshVisual,
    mark,
  }
}

// ---------- Independent geometry (orientation-based, not Liang–Barsky) ----------
interface P {
  x: number
  z: number
}
function orient(a: P, b: P, c: P): number {
  const v = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)
  return Math.abs(v) < 1e-9 ? 0 : v > 0 ? 1 : -1
}
function onSeg(a: P, b: P, c: P): boolean {
  return (
    Math.min(a.x, b.x) - 1e-9 <= c.x &&
    c.x <= Math.max(a.x, b.x) + 1e-9 &&
    Math.min(a.z, b.z) - 1e-9 <= c.z &&
    c.z <= Math.max(a.z, b.z) + 1e-9
  )
}
function segsTouch(p1: P, p2: P, p3: P, p4: P): boolean {
  const d1 = orient(p3, p4, p1)
  const d2 = orient(p3, p4, p2)
  const d3 = orient(p1, p2, p3)
  const d4 = orient(p1, p2, p4)
  if (d1 !== d2 && d3 !== d4) return true
  if (d1 === 0 && onSeg(p3, p4, p1)) return true
  if (d2 === 0 && onSeg(p3, p4, p2)) return true
  if (d3 === 0 && onSeg(p1, p2, p3)) return true
  if (d4 === 0 && onSeg(p1, p2, p4)) return true
  return false
}
function inRect(p: P, minX: number, maxX: number, minZ: number, maxZ: number): boolean {
  return p.x >= minX && p.x <= maxX && p.z >= minZ && p.z <= maxZ
}

export function expectedCrossing(m: vec3, b: vec3, d: vec3): boolean {
  const minX = d.x - BRIEF_FOOTPRINT_W / 2
  const maxX = d.x + BRIEF_FOOTPRINT_W / 2
  const minZ = d.z - BRIEF_FOOTPRINT_T / 2
  const maxZ = d.z + BRIEF_FOOTPRINT_T / 2
  const a: P = {x: m.x, z: m.z}
  const c: P = {x: b.x, z: b.z}
  if (inRect(a, minX, maxX, minZ, maxZ) || inRect(c, minX, maxX, minZ, maxZ)) return true
  const corners: P[] = [
    {x: minX, z: minZ},
    {x: maxX, z: minZ},
    {x: maxX, z: maxZ},
    {x: minX, z: maxZ},
  ]
  for (let i = 0; i < 4; i++) {
    if (segsTouch(a, c, corners[i], corners[(i + 1) % 4])) return true
  }
  return false
}

export function expectedDistance(m: vec3, b: vec3): number {
  const dx = b.x - m.x
  const dz = b.z - m.z
  return Math.sqrt(dx * dx + dz * dz)
}

export function expectedVerdict(m: vec3, b: vec3, d: vec3): string {
  if (expectedDistance(m, b) > BRIEF_REACH_CM) return "TOO FAR"
  if (expectedCrossing(m, b, d)) return "PATH BLOCKED"
  return "DIRECT PATH CLEAR"
}

export interface Snapshot {
  m: vec3
  b: vec3
  d: vec3
  bRot: quat
  dRot: quat
  verdict: string
  dist: number
  crossing: boolean
  label: string
  markOn: boolean
  lineColor: vec4
  pulsing: boolean
}

export function snap(r: Rig): Snapshot {
  return {
    m: r.marker.getTransform().getWorldPosition(),
    b: r.button.getTransform().getWorldPosition(),
    d: r.divider.getTransform().getWorldPosition(),
    bRot: r.button.getTransform().getWorldRotation(),
    dRot: r.divider.getTransform().getWorldRotation(),
    verdict: r.main.getVerdict(),
    dist: r.main.getDistanceCm(),
    crossing: r.main.isPathCrossingDivider(),
    label: r.label.text,
    markOn: r.mark.enabled,
    lineColor: r.pathLineVisual.mainMaterial.mainPass.baseColor,
    pulsing: r.main.pathLine.isPulsing(),
  }
}

export function describe(s: Snapshot): string {
  return (
    `verdict=${s.verdict} dist=${s.dist.toFixed(2)} crossing=${s.crossing} label="${s.label}" ` +
    `mark=${s.markOn} button=${fmt(s.b)} divider=${fmt(s.d)} marker=${fmt(s.m)}`
  )
}

function colorNear(a: vec4, b: vec4): boolean {
  return near(a.x, b.x, 0.02) && near(a.y, b.y, 0.02) && near(a.z, b.z, 0.02)
}

/**
 * Asserts the Lens state is consistent with the independent computation from live transforms:
 * verdict, distance, crossing, label text, intersection mark, and (when not pulsing) line color.
 */
export function assertConsistent(r: Rig, step: string): Snapshot {
  const s = snap(r)
  const ev = expectedVerdict(s.m, s.b, s.d)
  const ed = expectedDistance(s.m, s.b)
  const ec = expectedCrossing(s.m, s.b, s.d)
  log(`${step}: ${describe(s)} | independent: verdict=${ev} dist=${ed.toFixed(2)} crossing=${ec}`)
  check(`${step} verdict matches independent geometry`, s.verdict === ev, `lens=${s.verdict} expected=${ev}`)
  check(`${step} distance matches`, near(s.dist, ed, 0.05), `lens=${s.dist.toFixed(3)} expected=${ed.toFixed(3)}`)
  check(`${step} crossing matches`, s.crossing === ec, `lens=${s.crossing} expected=${ec}`)
  check(`${step} label text matches verdict`, s.label === s.verdict, `label="${s.label}" verdict=${s.verdict}`)
  check(
    `${step} intersection mark shown iff BLOCKED`,
    s.markOn === (s.verdict === "PATH BLOCKED"),
    `markEnabled=${s.markOn} verdict=${s.verdict}`,
  )
  if (!s.pulsing) {
    const want =
      s.verdict === "TOO FAR" ? r.main.tooFarColor : s.verdict === "PATH BLOCKED" ? r.main.blockedColor : r.main.clearColor
    check(
      `${step} line color matches verdict`,
      colorNear(s.lineColor, want),
      `line=(${s.lineColor.x.toFixed(2)},${s.lineColor.y.toFixed(2)},${s.lineColor.z.toFixed(2)}) want=(${want.x.toFixed(2)},${want.y.toFixed(2)},${want.z.toFixed(2)})`,
    )
  }
  check(`${step} button on countertop (Y)`, near(s.b.y, COUNTER_TOP_Y, 0.01), `button.y=${s.b.y.toFixed(3)}`)
  check(`${step} divider on countertop (Y)`, near(s.d.y, COUNTER_TOP_Y, 0.01), `divider.y=${s.d.y.toFixed(3)}`)
  return s
}

/** Asserts the Lens uses the brief's parameters, so the independent computation is meaningful. */
export function assertBriefParams(r: Rig): void {
  const fp = r.main.dividerFootprintCm
  check("reach limit is 65 cm", near(r.main.maxReachCm, BRIEF_REACH_CM, 1e-6), `maxReachCm=${r.main.maxReachCm}`)
  check(
    "divider footprint is 20 x 2 cm",
    near(fp.x, BRIEF_FOOTPRINT_W, 1e-6) && near(fp.y, BRIEF_FOOTPRINT_T, 1e-6),
    `footprint=(${fp.x},${fp.y})`,
  )
}

/** Installs a counting spy on the path line's pulse (test instrumentation; behavior unchanged). */
export function spyPulses(r: Rig): {count: () => number; restore: () => void} {
  const pl = r.main.pathLine
  const orig = pl.triggerPulse
  let n = 0
  pl.triggerPulse = function () {
    n++
    orig.call(pl)
  }
  return {
    count: () => n,
    restore: () => {
      pl.triggerPulse = orig
    },
  }
}
