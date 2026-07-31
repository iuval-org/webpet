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

/** Built-in behaviors (eyes, blink, ...). */
export * as behaviors from './behaviors/index.ts'