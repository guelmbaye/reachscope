/**
 * ReachscopePathLine — renders the flat marker→button path line and the intersection mark.
 *
 * Owns: a MeshBuilder ribbon (solid or dashed) lying flat just above the countertop, a small
 *       ring mark at the divider crossing, and the one-shot ~0.4 s "clear" pulse animation.
 * Expects: lineMaterial + markMaterial (unlit) wired in the Inspector; ReachscopeMain pushes
 *          endpoints and style every frame via setPath()/setIntersection(); this object sits at
 *          the world origin with identity transform so mesh coordinates are world coordinates.
 * Must not: decide the verdict — it only draws what it is told.
 */

export interface LineStyle {
  color: vec4
  widthCm: number
  dashed: boolean
  dashCm: number
  gapCm: number
}

@component
export class ReachscopePathLine extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ReachscopePathLine – flat path line renderer</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Unlit material for the path line (color is set at runtime).")
  lineMaterial!: Material

  @input
  @hint("Unlit material for the red intersection mark.")
  markMaterial!: Material
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Height of the line above the countertop, in cm.")
  @widget(new SliderWidget(0.2, 5, 0.1))
  heightAboveCounterCm: number = 1

  @input
  @hint("Outer radius of the intersection mark ring, in cm.")
  @widget(new SliderWidget(0.5, 5, 0.1))
  markRadiusCm: number = 1.8

  @input
  @hint("Duration of the one-shot green pulse on entering DIRECT PATH CLEAR, in seconds.")
  @widget(new SliderWidget(0.1, 1.5, 0.05))
  pulseDurationSec: number = 0.4

  @input
  @hint("Extra line width at the peak of the pulse (multiplier added to 1).")
  @widget(new SliderWidget(0, 4, 0.1))
  pulseWidthBoost: number = 1.5
  @ui.group_end

  private lineVisual!: RenderMeshVisual
  private markObj!: SceneObject
  private lineMat!: Material
  private counterTopY = 0
  private pulseStart = -1
  private lastKey = ""

  onAwake(): void {
    this.lineMat = this.lineMaterial.clone()
    this.lineMat.mainPass.twoSided = true
    this.lineVisual = this.sceneObject.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    this.lineVisual.mainMaterial = this.lineMat

    this.markObj = global.scene.createSceneObject("IntersectionMark")
    this.markObj.setParent(this.sceneObject)
    const markVisual = this.markObj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    const markMat = this.markMaterial.clone()
    markMat.mainPass.twoSided = true
    markVisual.mainMaterial = markMat
    markVisual.mesh = this.buildRing(this.markRadiusCm, this.markRadiusCm * 0.45, 24)
    this.markObj.enabled = false
  }

  setCounterTopY(y: number): void {
    this.counterTopY = y
  }

  /** Starts the single pulse. Caller is responsible for only calling it on a transition. */
  triggerPulse(): void {
    this.pulseStart = getTime()
  }

  isPulsing(): boolean {
    return this.pulseStart >= 0 && getTime() - this.pulseStart < this.pulseDurationSec
  }

  setPath(a: vec3, b: vec3, style: LineStyle): void {
    let width = style.widthCm
    let color = style.color
    if (this.pulseStart >= 0) {
      const t = (getTime() - this.pulseStart) / this.pulseDurationSec
      if (t >= 1) {
        this.pulseStart = -1
      } else {
        const k = Math.sin(Math.PI * t)
        width = width * (1 + this.pulseWidthBoost * k)
        color = new vec4(
          Math.min(1, color.x + 0.35 * k),
          Math.min(1, color.y + 0.1 * k),
          Math.min(1, color.z + 0.35 * k),
          color.w
        )
      }
    }
    this.lineMat.mainPass.baseColor = color
    const y = this.counterTopY + this.heightAboveCounterCm
    const key = [a.x, a.z, b.x, b.z, width, style.dashed, style.dashCm, style.gapCm, y]
      .map((v) => (typeof v === "number" ? v.toFixed(2) : String(v)))
      .join("|")
    if (key === this.lastKey) return
    this.lastKey = key
    this.lineVisual.mesh = this.buildRibbon(a.x, a.z, b.x, b.z, y, width, style)
  }

  /** Show the mark at a world XZ point (on the divider base), or hide it with null. */
  setIntersection(p: vec2 | null): void {
    if (!p) {
      this.markObj.enabled = false
      return
    }
    this.markObj.enabled = true
    this.markObj
      .getTransform()
      .setWorldPosition(new vec3(p.x, this.counterTopY + this.heightAboveCounterCm + 0.15, p.y))
  }

  private buildRibbon(ax: number, az: number, bx: number, bz: number, y: number, width: number, s: LineStyle): RenderMesh {
    const mb = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3},
      {name: "texture0", components: 2}
    ])
    mb.topology = MeshTopology.Triangles
    mb.indexType = MeshIndexType.UInt16
    const dx = bx - ax
    const dz = bz - az
    const len = Math.sqrt(dx * dx + dz * dz)
    if (len < 1e-3) {
      mb.appendVerticesInterleaved([ax, y, az, 0, 1, 0, 0, 0])
      mb.appendIndices([0, 0, 0])
      mb.updateMesh()
    return mb.getMesh()
    }
    const ux = dx / len
    const uz = dz / len
    const px = -uz * (width / 2)
    const pz = ux * (width / 2)
    const segs: number[][] = []
    if (!s.dashed) {
      segs.push([0, len])
    } else {
      const period = s.dashCm + s.gapCm
      for (let d = 0; d < len; d += period) {
        segs.push([d, Math.min(len, d + s.dashCm)])
      }
    }
    let base = 0
    for (const [d0, d1] of segs) {
      const x0 = ax + ux * d0
      const z0 = az + uz * d0
      const x1 = ax + ux * d1
      const z1 = az + uz * d1
      mb.appendVerticesInterleaved([
        x0 - px, y, z0 - pz, 0, 1, 0, 0, 0,
        x0 + px, y, z0 + pz, 0, 1, 0, 1, 0,
        x1 + px, y, z1 + pz, 0, 1, 0, 1, 1,
        x1 - px, y, z1 - pz, 0, 1, 0, 0, 1
      ])
      mb.appendIndices([base, base + 1, base + 2, base, base + 2, base + 3])
      base += 4
    }
    mb.updateMesh()
    return mb.getMesh()
  }

  private buildRing(outer: number, inner: number, n: number): RenderMesh {
    const mb = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3},
      {name: "texture0", components: 2}
    ])
    mb.topology = MeshTopology.Triangles
    mb.indexType = MeshIndexType.UInt16
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const c = Math.cos(a)
      const s = Math.sin(a)
      mb.appendVerticesInterleaved([c * outer, 0, s * outer, 0, 1, 0, 0, 0, c * inner, 0, s * inner, 0, 1, 0, 1, 1])
    }
    for (let i = 0; i < n; i++) {
      const o0 = i * 2
      const i0 = i * 2 + 1
      const o1 = ((i + 1) % n) * 2
      const i1 = ((i + 1) % n) * 2 + 1
      mb.appendIndices([o0, i0, o1, o1, i0, i1])
    }
    mb.updateMesh()
    return mb.getMesh()
  }
}
