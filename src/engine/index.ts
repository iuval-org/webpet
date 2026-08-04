/**
 * webpet engine — vanilla TypeScript pet engine core.
 *
 * @module engine
 */

export { BehaviorManager } from './behavior.ts'
export type { Behavior } from './behavior.ts'

export { core } from './core.ts'
export type { PetHandle } from './core.ts'

export { input } from './input.ts'
export type { InputState } from './input.ts'

export { createPet } from './pet.ts'
export type { PetConfig, PetInstance } from './pet.ts'

export { Renderer } from './renderer.ts'
export type { RenderMode, RendererConfig } from './renderer.ts'

export { createEmotionBehavior } from './emotion.ts'
export type { Emotion, EmotionDrawState, EmotionConfig, EmotionAPI, PupilMode } from './emotion.ts'

export { createEmotionTriggers } from './emotionTriggers.ts'
export type { EmotionTriggersAPI, BuiltinTrigger, TriggerName, EmotionTriggerConfig } from './emotionTriggers.ts'

export { createParticleBehavior } from './particles.ts'
export type { ParticleType, ParticleBehavior, ParticleAPI, ParticleEmitConfig } from './particles.ts'

export { createParticleTriggers } from './particleTriggers.ts'

export { CHARACTERS, CHARACTER_LIST } from './character.ts'
export type { CharacterId, CharacterDef, AccessoryType } from './character.ts'
export { setCharacter, getCharacter, getCharacterDef } from './character.ts'

export { setAudioEnabled, toggleAudio, isAudioEnabled, playBlink, playPoke } from './audio.ts'

export { createLocomotionBehavior } from './locomotion.ts'
export type { LocomotionMode, LocomotionConfig, LocomotionAPI, MovementState, TrickToggles } from './locomotion.ts'

export {
  BODY_OPTIONS, EYE_OPTIONS, ARM_OPTIONS, HEADGEAR_OPTIONS,
  type BodyType, type EyeType, type ArmType, type Headgear,
  type AppearanceOption,
} from './appearance.ts'

/** Built-in behaviors (eyes, blink, ...). */
export * as behaviors from './behaviors/index.ts'