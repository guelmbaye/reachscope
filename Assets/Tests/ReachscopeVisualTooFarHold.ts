import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ReachscopeLeafInteractor} from "./ReachscopeLeafInteractor"
import {assertConsistent, check, fmt, getRig, log} from "./ReachscopeTestUtils"

/**
 * Evidence helper (not an AC test): real LEAF SIK drags put the divider on the diagonal path and the
 * button ~72 cm from the marker, then leave the layout there so the TOO FAR state can be screenshotted.
 */
@component
export class ReachscopeVisualTooFarHold extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    log("=== VISUAL TOO FAR hold (real LEAF SIK drags) ===")
    const r = getRig()
    const ix = new ReachscopeLeafInteractor()
    const btn = ReachscopeLeafInteractor.interactable("AssistanceButton")
    const div = ReachscopeLeafInteractor.interactable("Divider")
    const m = assertConsistent(r, "VISUAL start").m
    const fx = m.x + 40
    const fz = m.z - 60
    await ix.dragTo(div, (m.x + fx) / 2, (m.z + fz) / 2)
    await sleep(300)
    await ix.dragTo(btn, fx, fz)
    await sleep(700)
    const s = assertConsistent(r, "VISUAL too far")
    check("VISUAL verdict TOO FAR", s.verdict === "TOO FAR", `${s.verdict} dist=${s.dist.toFixed(2)} button=${fmt(s.b)}`)
    log("=== VISUAL TOO FAR hold done (layout left in place) ===")
  }
}
