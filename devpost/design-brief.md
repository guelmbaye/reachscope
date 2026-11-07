---
status: approved
---

# Design brief: REACHSCOPE

## The one spatial moment
I'm a service-counter designer standing on the customer side of a virtual public service counter, testing the layout before installation. A red spatial line shows that the direct path from a seated customer's hand position to the assistance button is blocked by a divider. I grab the button, move it about 30 cm sideways along the countertop, and the line turns solid green with "DIRECT PATH CLEAR". If I move the divider back into the path, the warning returns automatically.

## Why it belongs on glasses
- Uses: draws in the world.
- Why it's better than the phone or laptop version: the counter, divider, and button sit in front of me at real-world scale, so I judge and correct the layout the way I'd handle a real counter, not a floor plan or a floating dashboard. It should feel like a small physical design workspace.

## Product or overlay
- Type: product. The virtual counter layout is the experience.
- What the real version would sense: nothing. The reference point is a fixed virtual marker, not a tracked hand.
- Stand-in for the preview: none needed. No camera recognition, hand tracking, network services, or backend.

## Where things live
- Where the user is looking during the main task: standing on the customer side of the counter, slightly left of center, looking down at the layout from a natural standing position. The marker, divider, and button (about 50 to 80 cm across) stay visible without excessive head movement.
- Service counter: anchored in world space (not attached to the head), about 1.2 to 1.5 m in front of the user at start (1.3 m, default). 100 cm wide, 70 cm deep, 95 cm high. Light neutral color so it reads on the additive display (default).
- Fixed reach reference marker: a small circular marker near the customer-facing edge of the countertop, centered left to right (default), about 5 cm in from the edge (default). Not movable.
- Assistance button: about 8 cm in diameter, clearly visible blue interactive surface, sitting on the countertop. Starts about 50 cm from the marker, straight back across the counter depth (default direction). Invisible grab area slightly larger than the visible button (about 12 cm, default).
- Divider panel: 20 cm wide, 30 cm tall, 2 cm thick, standing upright on the countertop, about halfway between the marker and the button, its width running across the direct path so it blocks it at start.
- Path line: runs from the marker to the button, flat, just above the countertop (about 1 cm, default).
- Status label: short text near the button (just above it, default), at real scale, not a large floating dashboard.
- Intersection highlight: a small red mark where the line crosses the divider's base (default style).
- Reset button: a big pinch button labeled "RESET" near the front-right corner of the countertop, about 8 cm (default size). It must not overlap the button, divider, marker, or path line in their starting positions, the 30 cm sideways fix, or the diagonal TOO FAR position, and must stay outside the main interaction area between the marker and the button. Dragging an object near it never triggers it; only a pinch does. Reset restores the initial positions of the button and divider, and with them the PATH BLOCKED state.

## Hands and input
- Grab and drag the assistance button with the simulated pinch. Movement is constrained to the countertop plane; the button can move freely across the countertop surface.
- Grab and drag the divider independently. Constrained to the countertop plane, stays upright (no tilting; no rotation, default).
- Pinch the Reset button to return the button and divider to their starting positions.
- Targets highlight when aimed at (SIK default).
- Voice: none.

## When things show
- Three mutually exclusive states, evaluated continuously from actual world transforms and geometric intersection, never from scripted animation sequences, predefined positions, or scenario IDs. Evaluation order:
  1. Calculate the distance from marker to button.
  2. If it exceeds 65 cm, the state is **TOO FAR**: thin amber dashed line, label "TOO FAR". This wins even if the path crosses the divider.
  3. Otherwise, if the flat direct path crosses the divider's base (no extra clearance for hand width), the state is **PATH BLOCKED**: red dashed line, intersection point highlighted, label "PATH BLOCKED".
  4. Otherwise, the state is **DIRECT PATH CLEAR**: solid green line, label "DIRECT PATH CLEAR".
- Path line: always visible, thin and unobtrusive when nothing is being manipulated. While the button or divider is grabbed, slightly thicker or brighter. On release, back to normal thickness, keeping the current verdict.
- Status label: always visible near the button.
- Verdict updates continuously while dragging, with no confirmation button. If the geometry becomes blocked again, the red state returns immediately with no reset needed.
- On a transition into DIRECT PATH CLEAR: one brief, subtle green pulse, about 0.4 seconds. No repeated pulses while the state stays the same.
- The Lens must be understandable without narration, audio, or color perception alone: the text labels and distinct line styles (dashed red, solid green, thin dashed amber) carry the meaning.
- If something needs attention out of view: none. All content stays in the work area in front of the user.

## Done criteria
Each one can be checked in Lens Studio's Interactive Preview, without physical glasses, camera recognition, network services, or a backend.

1. **AC-01: Initial blocked state.** When I launch or reset the Lens, the counter, reference marker, divider, and assistance button are visible. The button starts about 50 cm from the marker, with the divider crossing the direct path. A red dashed line connects the marker to the button, the intersection with the divider is highlighted, and the label reads "PATH BLOCKED". No interaction is needed to reveal the problem.
2. **AC-02: Fix the obstruction by moving the button (the main 20-second moment).** I grab the button with the simulated pinch and drag it about 30 cm sideways along the countertop. The button follows the drag and the path updates while dragging. When the path no longer crosses the divider and the button is within 65 cm, the line turns solid green, the label changes to "DIRECT PATH CLEAR", and a brief green pulse confirms it. Releasing the button keeps its position and the correct verdict.
3. **AC-03: Reversibility with the divider.** Without moving the button again, I grab the divider and move it into the now-clear path. The status immediately returns to "PATH BLOCKED" and the line turns red and dashed. Moving the divider away restores "DIRECT PATH CLEAR". This works from actual spatial positions, not predetermined triggers.
4. **AC-04: Distance limit overrides obstruction.** I drag the button diagonally across the countertop to more than 65 cm from the marker, for example about 55 cm inward and 36 cm sideways from the marker (about 65.7 cm), while it stays on the counter. The verdict comes from the actual distance calculation, never a hard-coded trigger. The status changes to "TOO FAR" and the path becomes amber and dashed, even when the path crosses the divider. Moving the button back within 65 cm restores BLOCKED or CLEAR based on the actual geometry.
5. **AC-05: Reset and repeatability.** After moving the button and divider, I pinch Reset. Both objects return to their starting positions and the red "PATH BLOCKED" state returns. I can repeat the blocked-to-clear-to-blocked sequence. Different valid divider positions give geometrically consistent verdicts.

### Optional polish (not required for done)
- Brighter or thicker line while dragging.
- Hover highlight styling beyond SIK defaults.
- Small visual refinements to the intersection mark and the green pulse beyond the basic behavior above.

## Out of scope
- Certified ergonomic or accessibility assessment. This shows geometric direct-path clearance only. The 65 cm threshold is an illustrative design parameter, not a clinically validated reach limit.
- Tracking a real hand or recognizing a real counter.
- Paths that go over or around the divider (only the straight line is checked), and clearance for hand or arm width.
- Rotating the divider, more than one button or divider, or saving layouts between sessions.
- Audio, narration, and voice.

## Risks and open questions
- The 8 cm button is a small pinch target at real scale. The larger invisible grab area should help; whether it feels easy on real glasses is feel unproven.
- At 1.2 to 1.5 m, the whole 100 cm counter won't fit in the glasses' narrow view at once. The working area (marker, divider, button) should.
- The divider is only 30 cm tall, so a real hand could reach over it. The Lens checks only the flat straight line, by design.
- The example TOO FAR position (55 cm inward, 36 cm sideways) is only about 0.7 cm over the 65 cm limit, so a drag that stops slightly short reads CLEAR or BLOCKED. Moving a little farther diagonally (for example 60 cm inward, 40 cm sideways, about 72 cm) gives a clearer margin and still stays on the 100 x 70 cm counter.
- Comfort over time and real hand tracking: feel unproven without glasses.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
