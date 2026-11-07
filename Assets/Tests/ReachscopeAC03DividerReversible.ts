import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ReachscopeLeafInteractor} from "./ReachscopeLeafInteractor"
import {assertConsistent, check, fmt, fmtQ, getRig, log, near, quatSame} from "./ReachscopeTestUtils"

/** AC-03: with the button moved clear, LEAF-drag the Divider into the path (BLOCKED) then away (CLEAR). */
@component
export class ReachscopeAC03DividerReversible extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    log("=== AC-03 divider reversibility (real LEAF SIK drags) ===")
    const r = getRig()
    const ix = new ReachscopeLeafInteractor()
    const btn = ReachscopeLeafInteractor.interactable("AssistanceButton")
    const div = ReachscopeLeafInteractor.interactable("Divider")
    const s0 = assertConsistent(r, "AC-03 start")
    // precondition: the AC-02 clear state, produced by a real drag
    await ix.dragTo(btn, s0.b.x + 30, s0.b.z)
    await sleep(700)
    const s1 = assertConsistent(r, "AC-03 precondition (button moved)")
    check("AC-03 precondition DIRECT PATH CLEAR", s1.verdict === "DIRECT PATH CLEAR", s1.verdict)

    // Into the new path: point on marker→button at the divider's current depth (computed from live transforms)
    const tz = s1.d.z
    const t = (tz - s1.m.z) / (s1.b.z - s1.m.z)
    const tx = s1.m.x + (s1.b.x - s1.m.x) * t
    let sawBlockedWhileHeld = false
    await ix.dragTo(div, tx, tz, () => {
      if (r.main.divider.isDragging() && r.main.getVerdict() === "PATH BLOCKED") sawBlockedWhileHeld = true
    })
    await sleep(700)
    const s2 = assertConsistent(r, "AC-03 divider moved into path")
    check("AC-03 divider reached path point", near(s2.d.x, tx, 0.5) && near(s2.d.z, tz, 0.5), `divider=${fmt(s2.d)} goal=(${tx.toFixed(1)},${tz.toFixed(1)})`)
    check("AC-03 verdict PATH BLOCKED", s2.verdict === "PATH BLOCKED", s2.verdict)
    check("AC-03 BLOCKED shown immediately (while still held)", sawBlockedWhileHeld, `${sawBlockedWhileHeld}`)
    check("AC-03 button did not move", near(s2.b.x, s1.b.x, 0.001) && near(s2.b.z, s1.b.z, 0.001), `${fmt(s1.b)} -> ${fmt(s2.b)}`)
    check("AC-03 divider upright (rotation unchanged)", quatSame(s2.dRot, s0.dRot), `before=${fmtQ(s0.dRot)} after=${fmtQ(s2.dRot)}`)

    // Away from the path
    let sawClearWhileHeld = false
    await ix.dragTo(div, s0.d.x - 25, s0.d.z, () => {
      if (r.main.divider.isDragging() && r.main.getVerdict() === "DIRECT PATH CLEAR") sawClearWhileHeld = true
    })
    await sleep(700)
    const s3 = assertConsistent(r, "AC-03 divider moved away")
    check("AC-03 divider reached x≈start-25", near(s3.d.x, s0.d.x - 25, 0.5) && near(s3.d.z, s0.d.z, 0.5), `divider=${fmt(s3.d)}`)
    check("AC-03 verdict DIRECT PATH CLEAR", s3.verdict === "DIRECT PATH CLEAR", s3.verdict)
    check("AC-03 CLEAR shown while still held", sawClearWhileHeld, `${sawClearWhileHeld}`)
    check("AC-03 divider upright (rotation unchanged)", quatSame(s3.dRot, s0.dRot), `after=${fmtQ(s3.dRot)}`)
    log("=== AC-03 done ===")
  }
}
