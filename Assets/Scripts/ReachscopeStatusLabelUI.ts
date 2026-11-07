/**
 * ReachscopeStatusLabelUI — the always-visible verdict text that sits just above the button.
 *
 * Owns: one world-space Text (real scale, light colors for the additive display).
 * Public API (Channel A): setVerdict(text, color), setAnchorWorldPosition(p).
 * Must not: compute verdicts or hold domain state — passive view.
 */

const FONT_SIZE_SCALE = 1.0
type TextRole = "Headline1" | "Headline2" | "Body"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Headline1: {size: 54, weight: 700},
  Headline2: {size: 48, weight: 700},
  Body: {size: 39, weight: 500}
}
function applyTextRole(t: Text, role: TextRole, distanceCm: number = 110): void {
  t.size = TYPE_SCALE[role].size * FONT_SIZE_SCALE * (distanceCm / 110)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

@component
export class ReachscopeStatusLabelUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ReachscopeStatusLabelUI – verdict label above the button</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Viewing distance (cm) used to scale the text role so it reads at real scale.")
  @widget(new SliderWidget(60, 250, 5))
  viewingDistanceCm: number = 150

  @input
  @hint("Offset of the label above the button's countertop position, in cm.")
  @widget(new SliderWidget(2, 30, 0.5))
  heightAboveButtonCm: number = 7

  @input
  @hint("Backward tilt in degrees so the text faces a user looking down at the counter.")
  @widget(new SliderWidget(0, 80, 1))
  tiltDeg: number = 35

  @input
  @hint("Keep the label visible even when the divider is between the user and the button.")
  alwaysOnTop: boolean = true
  @ui.group_end

  private text!: Text

  onAwake(): void {
    const so = global.scene.createSceneObject("StatusText")
    so.setParent(this.sceneObject)
    this.text = so.createComponent("Component.Text") as Text
    this.text.text = "PATH BLOCKED"
    applyTextRole(this.text, "Headline1", this.viewingDistanceCm)
    this.text.horizontalAlignment = HorizontalAlignment.Center
    this.text.verticalAlignment = VerticalAlignment.Center
    this.text.horizontalOverflow = HorizontalOverflow.Overflow
    this.text.verticalOverflow = VerticalOverflow.Overflow
    // alwaysOnTop: the 30 cm divider sits between the user's eye and the button at start, so a
    // depth-tested label would be hidden exactly when it matters (brief: "always visible").
    this.text.depthTest = !this.alwaysOnTop
    this.sceneObject.getTransform().setWorldRotation(quat.fromEulerAngles(-this.tiltDeg * MathUtils.DegToRad, 0, 0))
  }

  setVerdict(label: string, color: vec4): void {
    if (!this.text) return
    this.text.text = label
    this.text.textFill.color = color
  }

  getText(): string {
    return this.text ? this.text.text : ""
  }

  /** p = the button's world position on the countertop. */
  setAnchorWorldPosition(p: vec3): void {
    this.sceneObject.getTransform().setWorldPosition(new vec3(p.x, p.y + this.heightAboveButtonCm, p.z))
  }
}
