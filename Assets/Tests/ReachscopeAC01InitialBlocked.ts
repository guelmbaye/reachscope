import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {assertBriefParams, assertConsistent, check, fmt, getRig, log, near, quatSame} from "./ReachscopeTestUtils"

/** AC-01: on launch, objects visible at start, button ~50 cm away, divider crossing, PATH BLOCKED. No input. */
@component
export class ReachscopeAC01InitialBlocked extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    log("=== AC-01 initial blocked state (no interaction) ===")
    const r = getRig()
    assertBriefParams(r)
    const names = [
      "Counter",
      "CounterVisual",
      "ReferenceMarker",
      "MarkerVisual",
      "Divider",
      "DividerVisual",
      "AssistanceButton",
      "ButtonVisual",
      "PathLine",
      "StatusText",
    ]
    for (const n of names) {
      const so = findSceneObjectByName(n)
      check(`AC-01 ${n} present & enabled in hierarchy`, !!so && so.isEnabledInHierarchy, `found=${!!so}`)
    }
    for (const n of ["CounterVisual", "MarkerVisual", "DividerVisual", "ButtonVisual"]) {
      const rmv = findSceneObjectByName(n).getComponent("Component.RenderMeshVisual") as RenderMeshVisual
      check(`AC-01 ${n} has mesh+material`, !!rmv && !!rmv.mesh && !!rmv.mainMaterial && rmv.enabled, `rmv=${!!rmv}`)
    }
    const s = assertConsistent(r, "AC-01 start")
    check("AC-01 button at authored start (10,-62,-150)", near(s.b.x, 10, 0.01) && near(s.b.z, -150, 0.01), `button=${fmt(s.b)}`)
    check("AC-01 divider at authored start (10,-62,-125)", near(s.d.x, 10, 0.01) && near(s.d.z, -125, 0.01), `divider=${fmt(s.d)}`)
    check("AC-01 button ~50 cm from marker", near(s.dist, 50, 1.0), `dist=${s.dist.toFixed(2)}`)
    check("AC-01 verdict PATH BLOCKED", s.verdict === "PATH BLOCKED", `verdict=${s.verdict}`)
    check("AC-01 crossing true", s.crossing === true, `crossing=${s.crossing}`)
    check("AC-01 label reads PATH BLOCKED", s.label === "PATH BLOCKED", `label="${s.label}"`)
    check("AC-01 intersection highlighted", s.markOn, `mark=${s.markOn}`)
    const markPos = r.mark.getTransform().getWorldPosition()
    check(
      "AC-01 intersection mark on divider footprint",
      near(markPos.x, 10, 0.5) && markPos.z <= -123.9 && markPos.z >= -126.1,
      `mark=${fmt(markPos)}`,
    )
    check("AC-01 divider upright (identity rotation)", quatSame(s.dRot, quat.quatIdentity()), `dRot w=${s.dRot.w.toFixed(4)}`)
    log("=== AC-01 done ===")
  }
}
