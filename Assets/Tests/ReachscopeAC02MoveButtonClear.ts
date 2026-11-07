import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ReachscopeLeafInteractor} from "./ReachscopeLeafInteractor"
import {assertConsistent, check, fmt, fmtQ, getRig, log, near, quatSame, snap, spyPulses} from "./ReachscopeTestUtils"

/** AC-02: real LEAF/SIK pinch-drag of the AssistanceButton ~30 cm sideways → DIRECT PATH CLEAR. */
@component
export class ReachscopeAC02MoveButtonClear extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    log("=== AC-02 move button 30 cm sideways (real LEAF SIK drag) ===")
    const r = getRig()
    const it = ReachscopeLeafInteractor.interactable("AssistanceButton")
    const ix = new ReachscopeLeafInteractor()
    const s0 = assertConsistent(r, "AC-02 before")
    check("AC-02 precondition PATH BLOCKED", s0.verdict === "PATH BLOCKED", s0.verdict)
    const pulses = spyPulses(r)
    let grabbed = false
    let released = false
    r.main.assistanceButton.onDragStart.add(() => {
      grabbed = true
    })
    r.main.assistanceButton.onDragEnd.add(() => {
      released = true
    })
    try {
      // 1) Stock LEAF drag API (open-loop): proves the SIK drag path moves the button at all.
      await ix.drag(it, new vec3(0.15, 0, 0), 400)
      await sleep(200)
      const s1 = snap(r)
      log(`AC-02 after stock LEAF drag(0.15cm/update, 400ms): button=${fmt(s1.b)} verdict=${s1.verdict}`)
      // Open-loop stock drag distance varies with preview frame rate (0.45–0.60 cm observed); only direction matters here.
      check("AC-02 stock LEAF drag moved button along +X", s1.b.x > s0.b.x + 0.1, `dx=${(s1.b.x - s0.b.x).toFixed(2)}`)
      check("AC-02 stock drag kept Z", near(s1.b.z, s0.b.z, 0.05), `dz=${(s1.b.z - s0.b.z).toFixed(3)}`)
      check("AC-02 drag start/end events fired", grabbed && released, `grab=${grabbed} release=${released}`)

      // 2) Closed-loop LEAF drag to x=start+30 (30 cm sideways), sampling the path while held.
      const tx = s0.b.x + 30
      const tz = s0.b.z
      const seen: string[] = []
      const dists: number[] = []
      let draggingFrames = 0
      let heldYmax = 0
      let rotChanged = false
      const res = await ix.dragTo(it, tx, tz, () => {
        const v = r.main.getVerdict()
        if (seen.length === 0 || seen[seen.length - 1] !== v) seen.push(v)
        dists.push(r.main.getDistanceCm())
        if (r.main.assistanceButton.isDragging()) draggingFrames++
        const p = r.button.getTransform().getWorldPosition()
        heldYmax = Math.max(heldYmax, Math.abs(p.y + 62))
        if (!quatSame(r.button.getTransform().getWorldRotation(), s0.bRot)) rotChanged = true
      })
      log(`AC-02 dragTo done frames=${res.frames} final=${fmt(res.final)} verdicts-while-held=${seen.join(" -> ")}`)
      const uniqDist = new Set(dists.map((d) => d.toFixed(1))).size
      check("AC-02 button was in grabbed state during drag", draggingFrames > 5, `draggingFrames=${draggingFrames}`)
      check("AC-02 path/distance updated while dragging", uniqDist > 5, `distinct distances while held=${uniqDist}`)
      check(
        "AC-02 verdict changed BLOCKED -> CLEAR while held",
        seen.indexOf("PATH BLOCKED") >= 0 && seen[seen.length - 1] === "DIRECT PATH CLEAR",
        seen.join(" -> "),
      )
      check("AC-02 Y stayed pinned to -62 while held", heldYmax < 0.01, `max|y+62|=${heldYmax.toFixed(4)}`)
      check("AC-02 rotation untouched while held", !rotChanged, `changed=${rotChanged}`)
      await sleep(800) // let the 0.40 s pulse finish
      const s2 = assertConsistent(r, "AC-02 after release")
      check("AC-02 button reached ~30 cm sideways", near(s2.b.x, tx, 0.5) && near(s2.b.z, tz, 0.5), `button=${fmt(s2.b)} goal=(${tx},${tz})`)
      check("AC-02 verdict DIRECT PATH CLEAR", s2.verdict === "DIRECT PATH CLEAR", s2.verdict)
      check("AC-02 dist ≈ 58.3", near(s2.dist, Math.sqrt(30 * 30 + 50 * 50), 0.5), `dist=${s2.dist.toFixed(2)}`)
      check("AC-02 label DIRECT PATH CLEAR", s2.label === "DIRECT PATH CLEAR", `label="${s2.label}"`)
      check("AC-02 exactly one clear pulse", pulses.count() === 1, `pulses=${pulses.count()}`)
      check("AC-02 pulse is one-shot (finished)", !s2.pulsing, `pulsing=${s2.pulsing}`)
      check("AC-02 not dragging after release", !r.main.assistanceButton.isDragging(), "isDragging=false")
      check("AC-02 rotation unchanged", quatSame(s2.bRot, s0.bRot), `before=${fmtQ(s0.bRot)} after=${fmtQ(s2.bRot)}`)
      await sleep(1000)
      const s3 = assertConsistent(r, "AC-02 1 s after release")
      check("AC-02 position kept after release", near(s3.b.x, s2.b.x, 0.001) && near(s3.b.z, s2.b.z, 0.001), `${fmt(s2.b)} -> ${fmt(s3.b)}`)
      check("AC-02 verdict kept after release", s3.verdict === "DIRECT PATH CLEAR", s3.verdict)
      check("AC-02 still exactly one pulse", pulses.count() === 1, `pulses=${pulses.count()}`)
    } finally {
      pulses.restore()
    }
    log("=== AC-02 done ===")
  }
}
