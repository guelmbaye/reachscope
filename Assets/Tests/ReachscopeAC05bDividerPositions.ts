import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ReachscopeLeafInteractor} from "./ReachscopeLeafInteractor"
import {assertConsistent, check, fmt, getRig, log, near} from "./ReachscopeTestUtils"

/**
 * AC-05 (part b): different valid divider positions give geometrically consistent verdicts
 * (expected verdict computed by the test from live world transforms), then a LEAF pinch on Reset
 * restores the start state again.
 */
@component
export class ReachscopeAC05bDividerPositions extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    log("=== AC-05b divider positions + reset (real LEAF SIK drags + LEAF trigger on UIKit Reset) ===")
    const r = getRig()
    const ix = new ReachscopeLeafInteractor()
    const div = ReachscopeLeafInteractor.interactable("Divider")
    const reset = ReachscopeLeafInteractor.interactable("ResetButtonFace")
    let resets = 0
    r.main.resetButton.onReset.add(() => {
      resets++
    })
    const s0 = assertConsistent(r, "AC-05b start")
    const bStart = s0.b
    const dStart = s0.d

    // Button stays at start; divider visits several valid positions.
    const positions: Array<[number, number]> = [
      [dStart.x + 9, dStart.z], // footprint edge still covers the path line
      [dStart.x + 11, dStart.z], // just misses
      [dStart.x + 25, dStart.z], // well clear
      [dStart.x - 15, dStart.z - 15], // off to the side, nearer the button
      [dStart.x + 2, dStart.z + 15], // near the marker, on the path
      [dStart.x - 9.5, dStart.z - 20], // left edge, near the button
    ]
    const verdicts: string[] = []
    for (let i = 0; i < positions.length; i++) {
      const x = positions[i][0]
      const z = positions[i][1]
      await ix.dragTo(div, x, z, undefined, 1.5)
      await sleep(500)
      const s = assertConsistent(r, `AC-05b divider pos#${i + 1} (${x.toFixed(1)},${z.toFixed(1)})`)
      check(`AC-05b divider pos#${i + 1} reached`, near(s.d.x, x, 0.5) && near(s.d.z, z, 0.5), `divider=${fmt(s.d)}`)
      verdicts.push(s.verdict)
    }
    check(
      "AC-05b divider sweep produced both BLOCKED and CLEAR",
      verdicts.indexOf("PATH BLOCKED") >= 0 && verdicts.indexOf("DIRECT PATH CLEAR") >= 0,
      verdicts.join(", "),
    )

    await ix.trigger(reset)
    await sleep(500)
    check("AC-05b reset fired from LEAF pinch on ResetButtonFace", resets === 1, `onReset count=${resets}`)
    const s = assertConsistent(r, "AC-05b after reset")
    check("AC-05b button back at start", near(s.b.x, bStart.x, 0.01) && near(s.b.z, bStart.z, 0.01), `button=${fmt(s.b)}`)
    check("AC-05b divider back at start", near(s.d.x, dStart.x, 0.01) && near(s.d.z, dStart.z, 0.01), `divider=${fmt(s.d)}`)
    check("AC-05b PATH BLOCKED after reset", s.verdict === "PATH BLOCKED" && s.label === "PATH BLOCKED", `${s.verdict} / "${s.label}"`)
    log("=== AC-05b done ===")
  }
}
