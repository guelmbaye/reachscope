import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {ReachscopeAC01InitialBlocked} from "./ReachscopeAC01InitialBlocked"
import {ReachscopeAC02MoveButtonClear} from "./ReachscopeAC02MoveButtonClear"
import {ReachscopeAC03DividerReversible} from "./ReachscopeAC03DividerReversible"
import {ReachscopeAC04TooFar} from "./ReachscopeAC04TooFar"
import {ReachscopeAC05ResetRepeat} from "./ReachscopeAC05ResetRepeat"
import {ReachscopeAC05bDividerPositions} from "./ReachscopeAC05bDividerPositions"
import {ReachscopeVisualTooFarHold} from "./ReachscopeVisualTooFarHold"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "ac01-initial-blocked", typename: ReachscopeAC01InitialBlocked.getTypeName()},
    {id: "ac02-move-button-clear", typename: ReachscopeAC02MoveButtonClear.getTypeName()},
    {id: "ac03-divider-reversible", typename: ReachscopeAC03DividerReversible.getTypeName()},
    {id: "ac04-too-far", typename: ReachscopeAC04TooFar.getTypeName()},
    {id: "ac05-reset-repeat", typename: ReachscopeAC05ResetRepeat.getTypeName()},
    {id: "ac05b-divider-positions", typename: ReachscopeAC05bDividerPositions.getTypeName()},
    {id: "visual-too-far-hold", typename: ReachscopeVisualTooFarHold.getTypeName()},
  ]
}
