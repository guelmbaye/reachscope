import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {awaitEventOnce, nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractorTriggerType} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"

/**
 * LEAF test interactor for REACHSCOPE (test code only).
 *
 * Drives REAL SIK input: the LEAF DefaultSikInteractor hovers the target Interactable, sets its
 * trigger to Select (→ Interactable.onTriggerStart → ReachscopeDraggable.beginDrag), then moves
 * its ray (startPoint/endPoint, direction unchanged) a little each frame. ReachscopeDraggable
 * intersects that ray with the countertop plane in its own UpdateEvent, exactly as for a mouse or
 * hand ray. Releasing sets the trigger back to None (→ onTriggerEnd → endDrag).
 *
 * The stock LEAF drag(target, vectorPerUpdate, durationMs) is open-loop (distance depends on frame
 * count), so dragTo() commands the ray shift needed to land on a world X/Z goal, in ≤ stepCm
 * increments, and then applies up to 3 small residual corrections based on the observed position
 * (like a user watching the object). It never writes the object transform itself.
 */
export class ReachscopeLeafInteractor extends DefaultLeafInteractor {
  constructor() {
    super("ReachscopeLeafInteractor")
  }

  static interactable(name: string): Interactable {
    const it = findInteractablesByName(name, undefined, true)[0]
    if (!it) throw new Error(`Interactable "${name}" not found or not enabled`)
    return it
  }

  /**
   * Pinch-drag `target` until its SceneObject's world X/Z is at (goalX, goalZ).
   * @param onFrame optional callback invoked every frame while the trigger is held.
   * @returns frames held and final world position.
   */
  async dragTo(
    target: Interactable,
    goalX: number,
    goalZ: number,
    onFrame?: () => void,
    stepCm: number = 0.75,
  ): Promise<{frames: number; final: vec3}> {
    const tr = target.getSceneObject().getTransform()
    const triggerStarted = awaitEventOnce(target.onTriggerStart)
    await this.enterHover(target)
    await nextFrame()
    await nextFrame()
    this.setTriggerType(InteractorTriggerType.Select)
    await nextFrame()
    this.overrideDragVector = new vec3(0, 0, 0)
    await triggerStarted
    await nextFrame()

    let frames = 0
    const shiftBy = async (dx: number, dz: number) => {
      const len = Math.sqrt(dx * dx + dz * dz)
      const n = Math.max(1, Math.ceil(len / stepCm))
      const step = new vec3(dx / n, 0, dz / n)
      for (let i = 0; i < n; i++) {
        this.startPoint = this.startPoint.add(step)
        this.endPoint = this.endPoint.add(step)
        this.overrideDragVector = step
        await nextFrame()
        frames++
        if (onFrame) onFrame()
      }
      // let the draggable's UpdateEvent catch up
      for (let i = 0; i < 3; i++) {
        await nextFrame()
        frames++
        if (onFrame) onFrame()
      }
    }

    const p0 = tr.getWorldPosition()
    await shiftBy(goalX - p0.x, goalZ - p0.z)
    for (let k = 0; k < 3; k++) {
      const p = tr.getWorldPosition()
      const rx = goalX - p.x
      const rz = goalZ - p.z
      if (Math.sqrt(rx * rx + rz * rz) < 0.05) break
      await shiftBy(rx, rz)
    }

    const triggerEnded = awaitEventOnce(target.onTriggerEnd)
    this.overrideDragVector = new vec3(0, 0, 0)
    this.setTriggerType(InteractorTriggerType.None)
    await nextFrame()
    await triggerEnded
    this.resetStartEndPoint()
    this.overrideDragVector = undefined
    await this.exitHover()
    await sleep(100)
    return {frames, final: tr.getWorldPosition()}
  }
}
