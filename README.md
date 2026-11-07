# REACHSCOPE — Specs Lens (Learn AR with SPECS, Gate 1)

A real-scale virtual service counter for Snap Specs. A service-counter designer drags an
assistance button and a divider across the countertop, and the Lens shows — from live world
positions — whether the flat direct path from a fixed customer reach marker to the button is
**PATH BLOCKED**, **DIRECT PATH CLEAR**, or **TOO FAR** (> 65 cm).

Approved design brief (source of truth): [`devpost/design-brief.md`](devpost/design-brief.md).

> REACHSCOPE shows geometric direct-path clearance only. It does **not** certify accessibility
> or ergonomics. The 65 cm threshold is an illustrative design parameter, not a validated reach limit.

## Requirements (do not upgrade packages)

| Item | Version used |
|---|---|
| Lens Studio | 5.24.1 project (tested in the installed 5.23/5.24 build) |
| SpectaclesInteractionKit | 2.0.0 (runtime reports 0.18.0) — in `Packages/` |
| SpectaclesUIKit | 2.0.0 — in `Packages/` |
| LEAF | 2.0.2 (depends on SIK 2.0.0 + Bitmoji 3D 10.0.1) — in `Packages/` |

**Do not install InteractionKit 4, UIKit 4, LEAF 4 or `AiPreviewAgentInteract`.** InteractionKit 4
needs the `SpecsInteractionModule` engine API, which this Lens Studio version does not have; the
whole project then stops compiling.

## Open the project

1. Clone the repo, open `REACHSCOPE_SPECS_G1.esproj` in Lens Studio.
2. Lens Studio regenerates `Cache/`, `Support/` and `Workspaces/` automatically (they are not committed).
3. Preview panel: device **SPECS**, input **Interactive** (default Plane scene).
4. On start the Logger shows `[REACHSCOPE] verdict=PATH BLOCKED dist=50.0 ...`.

## Restore the recording viewpoint (required before filming)

The camera starts level at eye height; the real-scale countertop is 62 cm below eye level, so a
level view shows almost nothing. Look down at the counter like a standing user:

- **By hand:** in Interactive Preview, right-drag (or hold Shift and move the mouse) to look
  **down ~23°** and **right ~11°** until the counter, marker, divider, button, path, label and
  RESET are all inside the bright display area (the faint vertical bands mark the Specs display edges).
- **Via the Lens Studio MCP (exact):** `MovePreviewCamera` →
  `reset`, then `rotate {yaw: 11, pitch: -23}` → pose `rotation {x: 337, y: 349, z: 0}`, position `(0,0,0)`.

This pose survives Lens resets but not a camera reset or a Lens Studio restart.
Reference frame: [`devpost/evidence/visual/05_recording_ready_start_state.png`](devpost/evidence/visual/05_recording_ready_start_state.png).

## Use it (mouse = pinch in Interactive Preview)

1. Start: red dashed line, red ring on the divider base, label **PATH BLOCKED**.
2. Click-hold the blue button, drag ~30 cm sideways along the counter → solid green line,
   **DIRECT PATH CLEAR**, one brief green pulse.
3. Drag the divider back onto the line → **PATH BLOCKED**; drag it away → **DIRECT PATH CLEAR**.
4. Drag the button to the far back corner (> 65 cm from the marker) → thin amber dashed line, **TOO FAR**.
5. Click **RESET** (front-right corner) → start layout and PATH BLOCKED return.

## Automated tests (LEAF)

Open the LEAF panel and run the six acceptance scenarios (registered by the `LeafIndex` scene object):

| Scenario | Criterion |
|---|---|
| `ac01-initial-blocked` | AC-01 initial blocked state |
| `ac02-move-button-clear` | AC-02 drag button sideways → clear |
| `ac03-divider-reversible` | AC-03 divider re-blocks / clears |
| `ac04-too-far` | AC-04 distance limit overrides obstruction |
| `ac05-reset-repeat` | AC-05 reset + repeat |
| `ac05b-divider-positions` | AC-05 geometric consistency for other divider positions |

`visual-too-far-hold` is an evidence helper (not an acceptance test). Drags are driven through
LEAF's SIK interactor (real `onTriggerStart/End` events); expected verdicts are recomputed by the
tests from live world transforms. Test code: `Assets/Tests/`.

## Project layout

- `Assets/Scripts/` — Lens logic: `ReachscopeMain` (verdict loop), `ReachscopeGeometry`
  (distance + segment/footprint intersection), `ReachscopeDraggable` (SIK pinch-drag on the
  countertop plane), `ReachscopePathLine`, `ReachscopeStatusLabelUI`, `ReachscopeResetButtonUI`.
- `Assets/Tests/` — LEAF scenarios and helpers.
- `devpost/` — approved brief and verification evidence (`evidence/leaf`, `evidence/visual`, `evidence/manual`).

## Disclosure

- Built in this hackathon with Claude Code using the Lens Studio CLAD agent toolkit and the Lens
  Studio MCP. No pre-existing REACHSCOPE reference code was reused.
- Third-party Snap packages: SIK, UIKit, LEAF, Bitmoji 3D (LEAF dependency), Icons, Motion.
- `Assets/AiPreviewAgentInspect.lspkg` and the `AiPreviewAgent Handler` scene object were
  auto-installed by Lens Studio's AI preview-inspection tooling during development. They are
  not part of the REACHSCOPE experience.

## Known limitations

- Feel is unproven without glasses: real hand tracking, comfort over time, the 8 cm target size.
- Only the straight flat line is checked (no over/around paths, no hand-width clearance), by design.
- The button may be dragged to overlap the divider; the verdict stays geometrically correct.
