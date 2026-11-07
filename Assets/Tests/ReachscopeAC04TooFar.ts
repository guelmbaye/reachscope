import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ReachscopeLeafInteractor} from "./ReachscopeLeafInteractor"
import {assertConsistent, check, expectedCrossing, fmt, getRig, log, near} from "./ReachscopeTestUtils"

/** AC-04: TOO FAR overrides obstruction; moving back within 65 cm restores the geometry-based verdict. */
@component
export class ReachscopeAC04TooFar extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    log("=== AC-04 distance limit overrides obstruction (real LEAF SIK drags) ===")
    const r = getRig()
    const ix = new ReachscopeLeafInteractor()
    const btn = ReachscopeLeafInteractor.interactable("AssistanceButton")
    const div = ReachscopeLeafInteractor.interactable("Divider")
    const s0 = assertConsistent(r, "AC-04 start")
    const m = s0.m
    // Diagonal far point: 60 cm inward, 40 cm sideways (≈72.1 cm) — the brief's larger-margin example.
    const fx = m.x + 40
    const fz = m.z - 60
    // Put the divider on that diagonal path first (midpoint).
    await ix.dragTo(div, (m.x + fx) / 2, (m.z + fz) / 2)
    await sleep(300)
    await ix.dragTo(btn, fx, fz)
    await sleep(700)
    const s1 = assertConsistent(r, "AC-04 button far diagonal")
    check("AC-04 button at (marker+40, marker-60)", near(s1.b.x, fx, 0.5) && near(s1.b.z, fz, 0.5), `button=${fmt(s1.b)}`)
    check("AC-04 dist > 65", s1.dist > 65, `dist=${s1.dist.toFixed(2)}`)
    check("AC-04 dist ≈ 72.1", near(s1.dist, Math.sqrt(40 * 40 + 60 * 60), 0.5), `dist=${s1.dist.toFixed(2)}`)
    check("AC-04 path DOES cross the divider (independent)", expectedCrossing(s1.m, s1.b, s1.d), `divider=${fmt(s1.d)}`)
    check("AC-04 crossing reported true by Lens", s1.crossing, `${s1.crossing}`)
    check("AC-04 verdict TOO FAR (overrides obstruction)", s1.verdict === "TOO FAR", s1.verdict)
    check("AC-04 label TOO FAR", s1.label === "TOO FAR", `label="${s1.label}"`)

    // Brief's own example (55 in / 36 side ≈ 65.7 cm)
    await ix.dragTo(btn, m.x + 36, m.z - 55)
    await sleep(700)
    const s1b = assertConsistent(r, "AC-04 brief example 55in/36side")
    check("AC-04 brief example reads TOO FAR", s1b.verdict === "TOO FAR", `${s1b.verdict} dist=${s1b.dist.toFixed(2)}`)

    // Back within 65 cm on a path that still crosses the divider → geometry decides
    await ix.dragTo(btn, m.x + 25, m.z - 50)
    await sleep(700)
    const s2 = assertConsistent(r, "AC-04 back within reach #1")
    check("AC-04 #1 dist <= 65", s2.dist <= 65, `dist=${s2.dist.toFixed(2)}`)
    check("AC-04 #1 not TOO FAR", s2.verdict !== "TOO FAR", s2.verdict)

    // Back within reach on a path that misses the divider → geometry decides
    await ix.dragTo(btn, m.x - 20, m.z - 50)
    await sleep(700)
    const s3 = assertConsistent(r, "AC-04 back within reach #2")
    check("AC-04 #2 dist <= 65", s3.dist <= 65, `dist=${s3.dist.toFixed(2)}`)
    check("AC-04 #2 not TOO FAR", s3.verdict !== "TOO FAR", s3.verdict)
    check("AC-04 in-reach checks covered both BLOCKED and CLEAR", s2.verdict !== s3.verdict, `${s2.verdict} / ${s3.verdict}`)
    log("=== AC-04 done ===")
  }
}
