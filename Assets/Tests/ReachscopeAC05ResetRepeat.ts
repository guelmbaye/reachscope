import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ReachscopeLeafInteractor} from "./ReachscopeLeafInteractor"
import {assertConsistent, check, fmt, getRig, log, near} from "./ReachscopeTestUtils"

/** AC-05: LEAF pinch on Reset restores start; blocked→clear→blocked repeats; divider positions consistent. */
@component
export class ReachscopeAC05ResetRepeat extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    log("=== AC-05 reset + repeatability (real LEAF SIK drags + LEAF trigger on UIKit Reset) ===")
    const r = getRig()
    const ix = new ReachscopeLeafInteractor()
    const btn = ReachscopeLeafInteractor.interactable("AssistanceButton")
    const div = ReachscopeLeafInteractor.interactable("Divider")
    const reset = ReachscopeLeafInteractor.interactable("ResetButtonFace")
    let resets = 0
    r.main.resetButton.onReset.add(() => {
      resets++
    })
    const s0 = assertConsistent(r, "AC-05 start")
    const bStart = s0.b
    const dStart = s0.d

    const pinchReset = async (label: string) => {
      const before = resets
      await ix.trigger(reset)
      await sleep(500)
      check(`${label} reset fired from LEAF pinch on ResetButtonFace`, resets === before + 1, `onReset count ${before} -> ${resets}`)
      const s = assertConsistent(r, `${label} after reset`)
      check(`${label} button back at start`, near(s.b.x, bStart.x, 0.01) && near(s.b.z, bStart.z, 0.01), `button=${fmt(s.b)} start=${fmt(bStart)}`)
      check(`${label} divider back at start`, near(s.d.x, dStart.x, 0.01) && near(s.d.z, dStart.z, 0.01), `divider=${fmt(s.d)} start=${fmt(dStart)}`)
      check(`${label} PATH BLOCKED after reset`, s.verdict === "PATH BLOCKED" && s.label === "PATH BLOCKED", `${s.verdict} / "${s.label}"`)
    }

    // Move both, then pinch Reset
    await ix.dragTo(btn, bStart.x + 30, bStart.z)
    await ix.dragTo(div, dStart.x - 25, dStart.z + 10)
    await sleep(600)
    const s1 = assertConsistent(r, "AC-05 both moved")
    check("AC-05 both objects actually moved", s1.b.distance(bStart) > 20 && s1.d.distance(dStart) > 20, `button=${fmt(s1.b)} divider=${fmt(s1.d)}`)
    await pinchReset("AC-05 reset#1")

    // Repeat blocked → clear → blocked twice
    for (let cycle = 1; cycle <= 2; cycle++) {
      await ix.dragTo(btn, bStart.x + 30, bStart.z)
      await sleep(600)
      const c = assertConsistent(r, `AC-05 cycle${cycle} clear`)
      check(`AC-05 cycle${cycle} CLEAR`, c.verdict === "DIRECT PATH CLEAR", c.verdict)
      await ix.dragTo(btn, bStart.x, bStart.z)
      await sleep(600)
      const b = assertConsistent(r, `AC-05 cycle${cycle} blocked again`)
      check(`AC-05 cycle${cycle} BLOCKED again`, b.verdict === "PATH BLOCKED", b.verdict)
    }

    // (Divider-position sweep + second Reset pinch live in ReachscopeAC05bDividerPositions,
    //  split out so each scenario finishes inside the MCP run_leaf_scenario call timeout.)
    log("=== AC-05 done ===")
  }
}
