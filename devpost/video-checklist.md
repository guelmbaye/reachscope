# REACHSCOPE — 90-second Devpost video checklist

## Before recording
- [ ] Lens Studio open on `REACHSCOPE_SPECS_G1.esproj`; Logger shows no errors.
- [ ] Preview: device SPECS, Interactive, Plane scene.
- [ ] Refresh the preview (fresh start state, **no LEAF "PASSED" banner** on screen — do not run LEAF right before filming).
- [ ] Restore the viewpoint: look down ~23°, right ~11° (README → "Restore the recording viewpoint").
      Check: counter, marker, divider, button, red dashed path, red ring, full "PATH BLOCKED" label and RESET all visible.
- [ ] Record only the Preview panel area at 1080p or higher; cursor visible.

## Shot list (≈90 s)

| Time | On screen | Narration / caption idea |
|---|---|---|
| 0–10 s | **Live preview**, start state: red dashed line through the divider, "PATH BLOCKED". | "A seated customer can't reach this counter's help button — a divider sits right in the way." |
| 10–25 s | **Live preview**: click-drag the blue button ~30 cm sideways. Line turns solid green, "DIRECT PATH CLEAR", one green pulse. Release. | "Move the button 30 cm and the direct path is clear — computed live from where things are." |
| 25–40 s | **Live preview**: drag the divider back onto the path → "PATH BLOCKED"; drag it away → "DIRECT PATH CLEAR". | "It's causal and reversible: move the divider back and the warning returns." |
| 40–55 s | **Live preview**: drag the button diagonally to the back corner → thin amber dashed line, "TOO FAR". Drag back in → verdict follows the geometry. | "Beyond 65 cm the distance limit wins, even if the path is blocked." |
| 55–65 s | **Live preview**: click RESET → start layout, "PATH BLOCKED". | "Reset to try another layout." |
| 65–80 s | **Overlay (label it)**: LEAF panel showing the six acceptance scenarios passing. | "Six LEAF acceptance tests drive real SIK drags and check verdicts against independent geometry." |
| 80–90 s | **Overlay (label it)**: why glasses — real-scale counter in front of you; limits. | "Geometric direct-path check only — not an accessibility certification. Feel on real glasses is still to be tested." |

## Honesty rules for the edit
- Mark every non-preview segment with an on-screen tag such as **"Explanatory overlay"**; leave live preview segments untagged or tag them **"Live Lens Studio preview"**.
- Do not speed up, cut inside, or composite a drag so a transition looks different from what happened.
- Do not claim device testing, hand tracking, or accessibility certification.
- If the LEAF banner appears in a live segment, say it is the test framework's overlay.

## After recording
- [ ] Video < 3 minutes, public on YouTube.
- [ ] Repo public with the Lens Studio project, `README.md` and the `devpost/` folder.
