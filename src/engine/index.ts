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
export type { Emotion, EmotionDrawState, EmotionConfig, EmotionAPI } from './emotion.ts'

export { createEmotionTriggers } from './emotionTriggers.ts'
export type { EmotionTriggersAPI, BuiltinTrigger, TriggerName, EmotionTriggerConfig } from './emotionTriggers.ts'

export { CHARACTERS, CHARACTER_LIST } from './character.ts'
export type { CharacterId, CharacterDef, AccessoryType } from './character.ts'
export { setCharacter, getCharacter, getCharacterDef } from './character.ts'

export { setAudioEnabled, toggleAudio, isAudioEnabled, playBlink, playPoke } from './audio.ts'

/** Built-in behaviors (eyes, blink, ...). */
export * as behaviors from './behaviors/index.ts'