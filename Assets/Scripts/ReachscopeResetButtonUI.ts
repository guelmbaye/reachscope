import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

/**
 * ReachscopeResetButtonUI — the "RESET" pinch button near the front-right corner of the counter.
 *
 * Owns: a UIKit Button + its label. Position/tilt come from this authored SceneObject's transform.
 * Public API (Channel A): event onReset (fires on a completed pinch on the button only — UIKit
 *   onTriggerUp requires the trigger to have started on this button, so dragging another object
 *   over it never fires it).
 * Must not: move objects or hold state — passive view.
 */

const BUTTON_LABEL_Z = 0.08

@component
export class ReachscopeResetButtonUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ReachscopeResetButtonUI – RESET pinch button</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Button face size in cm (square).")
  @widget(new SliderWidget(4, 14, 0.5))
  sizeCm: number = 8

  @input
  @hint("Button label text.")
  label: string = "RESET"

  @input
  @hint("Label text size (Lens Text size units).")
  @widget(new SliderWidget(30, 90, 1))
  labelSize: number = 50

  @input("vec4", "{1, 1, 1, 1}")
  @hint("Label color (keep light — the display is additive).")
  @widget(new ColorWidget())
  labelColor: vec4 = new vec4(1, 1, 1, 1)
  @ui.group_end

  private _onReset = new Event<void>()
  get onReset(): PublicApi<void> {
    return this._onReset.publicApi()
  }

  private button!: Button

  onAwake(): void {
    const btnObj = global.scene.createSceneObject("ResetButtonFace")
    btnObj.setParent(this.sceneObject)
    this.button = btnObj.createComponent(Button.getTypeName()) as Button
    this.button.onInitialized.add(() => {
      this.button.size = new vec3(this.sizeCm, this.sizeCm, 1)
    })
    this.button.onTriggerUp.add(() => {
      this._onReset.invoke()
    })

    const so = global.scene.createSceneObject("ResetLabel")
    so.setParent(btnObj)
    so.getTransform().setLocalPosition(new vec3(0, 0, 0.6 + BUTTON_LABEL_Z))
    const t = so.createComponent("Component.Text") as Text
    t.text = this.label
    t.size = this.labelSize
    ;(t as Text & {weight?: number}).weight = 700
    t.depthTest = true
    t.textFill.color = this.labelColor
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-(this.sizeCm - 0.5) / 2, (this.sizeCm - 0.5) / 2, -1.5, 1.5)
  }
}
