import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {Interactor, TargetingMode} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

/**
 * ReachscopeDraggable — SIK pinch-drag constrained to the countertop plane.
 *
 * Owns: this object's grab collider + SIK Interactable, and plane-constrained translation
 *       (X/Z only, Y pinned to the countertop, rotation never changed → stays upright).
 * Expects: the SceneObject is a unit-scale, identity-rotation wrapper; visuals live on children.
 *          ReachscopeMain calls setPlane()/setBounds() at start.
 * Must not: evaluate verdicts or know about other objects.
 *
 * How the drag works: on SIK onTriggerStart the interactor's ray (mouse in Interactive Preview,
 * hand ray on device) is intersected with the horizontal countertop plane; each frame while the
 * trigger is held the object follows that plane point (keeping the initial grab offset), clamped
 * to the countertop. For Direct (near-hand) pinches the pinch point is projected onto the plane.
 */
@component
export class ReachscopeDraggable extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ReachscopeDraggable – pinch-drag on the countertop plane</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Invisible grab collider size in cm (X = width, Y = height, Z = depth). Slightly larger than the visual.")
  colliderSize: vec3 = new vec3(12, 6, 12)

  @input
  @hint("Draw the grab collider as a wireframe (debug).")
  debugCollider: boolean = false
  @ui.group_end

  private interactable: Interactable | null = null
  private activeInteractor: Interactor | null = null
  private grabOffset: vec2 = vec2.zero()
  private programmatic = false

  private planeY = 0
  private bounds = {minX: -1e6, maxX: 1e6, minZ: -1e6, maxZ: 1e6}

  private _onDragStart = new Event<void>()
  private _onDragEnd = new Event<void>()
  get onDragStart(): PublicApi<void> {
    return this._onDragStart.publicApi()
  }
  get onDragEnd(): PublicApi<void> {
    return this._onDragEnd.publicApi()
  }

  onAwake(): void {
    // Collider + Interactable live on this unit-scale wrapper so the SIK target is this object.
    // ColliderComponent has no center offset: the box is centered on the origin (which sits on the
    // countertop), so colliderSize.y should be ~2x the visual height; the part below the countertop
    // is never reached by a ray coming from above.
    const collider = this.sceneObject.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = this.colliderSize
    collider.shape = shape
    collider.debugDrawEnabled = this.debugCollider

    this.interactable = this.sceneObject.createComponent(Interactable.getTypeName()) as Interactable
    this.interactable.targetingMode = TargetingMode.Direct | TargetingMode.Indirect

    this.createEvent("OnStartEvent").bind(() => {
      const it = this.interactable
      if (!it) return
      it.onTriggerStart.add((e: InteractorEvent) => this.beginDrag(e.interactor))
      it.onTriggerEnd.add(() => this.endDrag())
      it.onTriggerEndOutside.add(() => this.endDrag())
      it.onTriggerCanceled.add(() => this.endDrag())
    })
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  /** Countertop height (world Y, cm) that this object is pinned to. */
  setPlane(planeY: number): void {
    this.planeY = planeY
  }

  /** Allowed world-space X/Z range for this object's origin. */
  setBounds(minX: number, maxX: number, minZ: number, maxZ: number): void {
    this.bounds = {minX, maxX, minZ, maxZ}
  }

  isDragging(): boolean {
    return this.activeInteractor !== null || this.programmatic
  }

  /** Clamp + pin to plane + write world position. Used by drag, reset, and debug moves. */
  setWorldXZ(x: number, z: number): void {
    const cx = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, x))
    const cz = Math.min(this.bounds.maxZ, Math.max(this.bounds.minZ, z))
    this.sceneObject.getTransform().setWorldPosition(new vec3(cx, this.planeY, cz))
  }

  getWorldXZ(): vec2 {
    const p = this.sceneObject.getTransform().getWorldPosition()
    return new vec2(p.x, p.z)
  }

  /** Cancels any active drag (used by Reset). */
  cancelDrag(): void {
    this.endDrag()
    this.programmatic = false
  }

  // ---- Debug-only programmatic drag (same clamp/plane path as a real drag) ----
  debugBeginDrag(): void {
    this.programmatic = true
    this._onDragStart.invoke()
  }
  debugDragTo(x: number, z: number): void {
    this.setWorldXZ(x, z)
  }
  debugEndDrag(): void {
    if (!this.programmatic) return
    this.programmatic = false
    this._onDragEnd.invoke()
  }

  private beginDrag(interactor: Interactor): void {
    if (!interactor) return
    const hit = this.planePoint(interactor)
    const pos = this.getWorldXZ()
    this.grabOffset = hit ? new vec2(pos.x - hit.x, pos.y - hit.y) : vec2.zero()
    this.activeInteractor = interactor
    this._onDragStart.invoke()
  }

  private endDrag(): void {
    if (this.activeInteractor === null) return
    this.activeInteractor = null
    this._onDragEnd.invoke()
  }

  private onUpdate(): void {
    const interactor = this.activeInteractor
    if (!interactor) return
    const hit = this.planePoint(interactor)
    if (!hit) return
    this.setWorldXZ(hit.x + this.grabOffset.x, hit.y + this.grabOffset.y)
  }

  /** Where the interactor currently points on the countertop plane (x, z), or null. */
  private planePoint(interactor: Interactor): vec2 | null {
    const origin = interactor.startPoint
    if (!origin) return null
    const dir = interactor.direction
    const direct = (interactor.activeTargetingMode & TargetingMode.Direct) !== 0
    if (direct || !dir) {
      return new vec2(origin.x, origin.z)
    }
    if (Math.abs(dir.y) < 1e-4) return null
    const t = (this.planeY - origin.y) / dir.y
    if (t <= 0) return null
    return new vec2(origin.x + dir.x * t, origin.z + dir.z * t)
  }
}
