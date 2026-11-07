import {ReachscopeDraggable} from "./ReachscopeDraggable"
import {ReachscopePathLine, LineStyle} from "./ReachscopePathLine"
import {ReachscopeStatusLabelUI} from "./ReachscopeStatusLabelUI"
import {ReachscopeResetButtonUI} from "./ReachscopeResetButtonUI"
import {evaluate, footprintRect, Evaluation, Verdict} from "./ReachscopeGeometry"

/**
 * ReachscopeMain — orchestrator for REACHSCOPE.
 *
 * Owns: the single verdict (evaluated every LateUpdate from live world transforms), the
 *       start positions (captured from the authored scene at awake, restored by reset()), line
 *       styling per verdict, the one-shot pulse trigger, and verdict-change logging.
 * Expects (@input): ReferenceMarker, Counter, AssistanceButton/Divider draggables, PathLine,
 *       StatusLabel and ResetButton UI modules — all authored SceneObjects.
 * Must not: create UI text, hardcode outcomes, or branch on any scenario/preset position.
 *
 * Test-friendly API: getVerdict(), getDistanceCm(), isPathCrossingDivider(), reset().
 * Log line on each verdict change: "[REACHSCOPE] verdict=<V> dist=<cm> button=(x,z) divider=(x,z)".
 */
@component
export class ReachscopeMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ReachscopeMain – reach & direct-path checker</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Counter root. Its origin is the center of the countertop surface (world Y = countertop height).")
  counter!: SceneObject

  @input
  @hint("Fixed reach reference marker (not movable). Its world position is the path start.")
  referenceMarker!: SceneObject

  @input
  @hint("Draggable assistance button.")
  assistanceButton!: ReachscopeDraggable

  @input
  @hint("Draggable divider panel.")
  divider!: ReachscopeDraggable

  @input
  @hint("Path line renderer.")
  pathLine!: ReachscopePathLine

  @input
  @hint("Status label UI module.")
  statusLabel!: ReachscopeStatusLabelUI

  @input
  @hint("Reset button UI module.")
  resetButton!: ReachscopeResetButtonUI
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Reach limit in cm. Distance strictly greater than this reads TOO FAR (illustrative, not clinical).")
  @widget(new SliderWidget(30, 100, 0.5))
  maxReachCm: number = 65

  @input
  @hint("Countertop width (X) and depth (Z) in cm — used to keep dragged objects on the counter.")
  counterSizeCm: vec2 = new vec2(100, 70)

  @input
  @hint("Divider footprint: width across the path (X) and thickness (Z), in cm.")
  dividerFootprintCm: vec2 = new vec2(20, 2)

  @input
  @hint("Assistance button radius in cm (keeps the whole button on the counter).")
  @widget(new SliderWidget(1, 10, 0.5))
  buttonRadiusCm: number = 4

  @input
  @hint("Normal path line width in cm (BLOCKED / CLEAR).")
  @widget(new SliderWidget(0.1, 3, 0.05))
  lineWidthCm: number = 0.6

  @input
  @hint("Thin line width in cm used for TOO FAR.")
  @widget(new SliderWidget(0.1, 3, 0.05))
  thinLineWidthCm: number = 0.35

  @input
  @hint("Width multiplier while the button or divider is grabbed.")
  @widget(new SliderWidget(1, 4, 0.1))
  grabWidthMultiplier: number = 1.8

  @input("vec4", "{1, 0.32, 0.3, 1}")
  @hint("PATH BLOCKED color (line + label).")
  @widget(new ColorWidget())
  blockedColor: vec4 = new vec4(1, 0.32, 0.3, 1)

  @input("vec4", "{0.35, 1, 0.45, 1}")
  @hint("DIRECT PATH CLEAR color (line + label).")
  @widget(new ColorWidget())
  clearColor: vec4 = new vec4(0.35, 1, 0.45, 1)

  @input("vec4", "{1, 0.72, 0.2, 1}")
  @hint("TOO FAR color (line + label).")
  @widget(new ColorWidget())
  tooFarColor: vec4 = new vec4(1, 0.72, 0.2, 1)
  @ui.group_end

  @ui.separator
  @ui.group_start("Debug")
  @input
  @hint("DEBUG ONLY (default off). Moves button/divider through the drag code path to exercise every verdict; verdicts still come from live transforms.")
  debugSelfTest: boolean = false
  @ui.group_end

  private buttonStart: vec3 = vec3.zero()
  private dividerStart: vec3 = vec3.zero()
  private current: Evaluation | null = null
  private lastVerdict: Verdict | null = null

  onAwake(): void {
    // Child components (draggables, UI) awake after this root script in hierarchy order, so all
    // cross-component setup happens in OnStartEvent, when every component is awake.
    this.createEvent("OnStartEvent").bind(() => this.setup())
  }

  private setup(): void {
    if (!this.validateRefs()) return
    this.buttonStart = this.assistanceButton.sceneObject.getTransform().getWorldPosition()
    this.dividerStart = this.divider.sceneObject.getTransform().getWorldPosition()

    const top = this.counter.getTransform().getWorldPosition()
    const hw = this.counterSizeCm.x / 2
    const hd = this.counterSizeCm.y / 2
    const r = this.buttonRadiusCm
    this.assistanceButton.setPlane(top.y)
    this.assistanceButton.setBounds(top.x - hw + r, top.x + hw - r, top.z - hd + r, top.z + hd - r)
    const dw = this.dividerFootprintCm.x / 2
    const dt = this.dividerFootprintCm.y / 2
    this.divider.setPlane(top.y)
    this.divider.setBounds(top.x - hw + dw, top.x + hw - dw, top.z - hd + dt, top.z + hd - dt)
    this.pathLine.setCounterTopY(top.y)

    {
      this.resetButton.onReset.add(() => {
        print("[REACHSCOPE] reset pinched")
        this.reset()
      })
      this.assistanceButton.onDragStart.add(() => print("[REACHSCOPE] grab AssistanceButton"))
      this.assistanceButton.onDragEnd.add(() => this.logRelease("AssistanceButton"))
      this.divider.onDragStart.add(() => print("[REACHSCOPE] grab Divider"))
      this.divider.onDragEnd.add(() => this.logRelease("Divider"))
      this.evaluateNow()
      if (this.debugSelfTest) this.startSelfTest()
    }
    this.createEvent("LateUpdateEvent").bind(() => this.evaluateNow())
  }

  // ---------------- Public API ----------------
  getVerdict(): string {
    return this.current ? this.current.verdict : ""
  }

  getDistanceCm(): number {
    return this.current ? this.current.distanceCm : -1
  }

  isPathCrossingDivider(): boolean {
    return this.current ? this.current.crossing.hit : false
  }

  /** Restore the authored start positions of the button and divider, then re-evaluate. */
  reset(): void {
    this.assistanceButton.cancelDrag()
    this.divider.cancelDrag()
    this.assistanceButton.setWorldXZ(this.buttonStart.x, this.buttonStart.z)
    this.divider.setWorldXZ(this.dividerStart.x, this.dividerStart.z)
    this.evaluateNow()
  }

  // ---------------- Evaluation ----------------
  private evaluateNow(): void {
    const m = this.referenceMarker.getTransform().getWorldPosition()
    const b = this.assistanceButton.sceneObject.getTransform().getWorldPosition()
    const d = this.divider.sceneObject.getTransform().getWorldPosition()
    const rect = footprintRect(d.x, d.z, this.dividerFootprintCm.x, this.dividerFootprintCm.y)
    const ev = evaluate({x: m.x, z: m.z}, {x: b.x, z: b.z}, rect, this.maxReachCm)
    this.current = ev

    if (ev.verdict !== this.lastVerdict) {
      if (this.lastVerdict !== null && ev.verdict === "DIRECT PATH CLEAR") {
        this.pathLine.triggerPulse()
        print("[REACHSCOPE] clear pulse started (" + this.pathLine.pulseDurationSec.toFixed(2) + " s)")
      }
      print(
        `[REACHSCOPE] verdict=${ev.verdict} dist=${ev.distanceCm.toFixed(1)} ` +
          `button=(${b.x.toFixed(1)},${b.z.toFixed(1)}) divider=(${d.x.toFixed(1)},${d.z.toFixed(1)})`
      )
      this.lastVerdict = ev.verdict
    }

    const grabbed = this.assistanceButton.isDragging() || this.divider.isDragging()
    const style = this.styleFor(ev.verdict, grabbed)
    this.pathLine.setPath(m, b, style)
    this.pathLine.setIntersection(
      ev.verdict === "PATH BLOCKED" ? new vec2(ev.crossing.entry.x, ev.crossing.entry.z) : null
    )
    this.statusLabel.setVerdict(ev.verdict, this.labelColor(ev.verdict))
    this.statusLabel.setAnchorWorldPosition(b)
  }

  private styleFor(v: Verdict, grabbed: boolean): LineStyle {
    const mult = grabbed ? this.grabWidthMultiplier : 1
    const bright = (c: vec4) =>
      grabbed ? new vec4(Math.min(1, c.x + 0.15), Math.min(1, c.y + 0.15), Math.min(1, c.z + 0.15), c.w) : c
    switch (v) {
      case "TOO FAR":
        return {color: bright(this.tooFarColor), widthCm: this.thinLineWidthCm * mult, dashed: true, dashCm: 1.5, gapCm: 1.5}
      case "PATH BLOCKED":
        return {color: bright(this.blockedColor), widthCm: this.lineWidthCm * mult, dashed: true, dashCm: 2.5, gapCm: 1.5}
      default:
        return {color: bright(this.clearColor), widthCm: this.lineWidthCm * mult, dashed: false, dashCm: 0, gapCm: 0}
    }
  }

  private labelColor(v: Verdict): vec4 {
    if (v === "TOO FAR") return this.tooFarColor
    if (v === "PATH BLOCKED") return this.blockedColor
    return this.clearColor
  }

  private logRelease(name: string): void {
    print(`[REACHSCOPE] release ${name} verdict=${this.getVerdict()} dist=${this.getDistanceCm().toFixed(1)}`)
  }

  private validateRefs(): boolean {
    const missing: string[] = []
    if (!this.counter) missing.push("counter")
    if (!this.referenceMarker) missing.push("referenceMarker")
    if (!this.assistanceButton) missing.push("assistanceButton")
    if (!this.divider) missing.push("divider")
    if (!this.pathLine) missing.push("pathLine")
    if (!this.statusLabel) missing.push("statusLabel")
    if (!this.resetButton) missing.push("resetButton")
    if (missing.length > 0) {
      print("[REACHSCOPE] ERROR missing @input refs: " + missing.join(", "))
      return false
    }
    return true
  }

  // ---------------- Debug self-test (off by default) ----------------
  // Moves objects through the same plane/clamp path a drag uses; targets are expressed relative to
  // the live marker/button/divider transforms, and the verdict printed is whatever the geometry says.
  private startSelfTest(): void {
    const m = this.referenceMarker.getTransform().getWorldPosition()
    const steps: Array<() => void> = []
    const glide = (who: ReachscopeDraggable, tx: number, tz: number, label: string) => {
      steps.push(() => {
        print(`[REACHSCOPE][SELFTEST] ${label}`)
        who.debugBeginDrag()
      })
      const from = () => who.getWorldXZ()
      let start: vec2 | null = null
      const n = 12
      for (let i = 1; i <= n; i++) {
        steps.push(() => {
          if (!start) start = from()
          const t = i / n
          who.debugDragTo(start.x + (tx - start.x) * t, start.y + (tz - start.y) * t)
        })
      }
      steps.push(() => {
        who.debugEndDrag()
        print(`[REACHSCOPE][SELFTEST] after "${label}": verdict=${this.getVerdict()} dist=${this.getDistanceCm().toFixed(1)} crossing=${this.isPathCrossingDivider()}`)
      })
    }
    const b0 = this.buttonStart
    glide(this.assistanceButton, b0.x + 30, b0.z, "drag button 30 cm sideways")
    // Divider into the new path: midpoint of marker→button segment.
    glide(this.divider, (m.x + b0.x + 30) / 2, (m.z + b0.z) / 2, "drag divider into the path")
    glide(this.divider, this.dividerStart.x - 25, this.dividerStart.z, "drag divider away")
    // TOO FAR must win even when the path crosses the divider: put the divider on the diagonal path first.
    glide(this.divider, (m.x + m.x + 36) / 2, (m.z + m.z - 55) / 2, "drag divider onto the diagonal path")
    glide(this.assistanceButton, m.x + 36, m.z - 55, "drag button diagonally (55 in / 36 side)")
    glide(this.assistanceButton, m.x + 30, m.z - 50, "drag button back within reach")
    steps.push(() => {
      print("[REACHSCOPE][SELFTEST] reset()")
      this.reset()
      print(`[REACHSCOPE][SELFTEST] after reset: verdict=${this.getVerdict()} dist=${this.getDistanceCm().toFixed(1)}`)
    })
    let idx = 0
    const tick = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    tick.bind(() => {
      if (idx >= steps.length) return
      steps[idx++]()
      tick.reset(0.05)
    })
    tick.reset(0.5)
  }
}
