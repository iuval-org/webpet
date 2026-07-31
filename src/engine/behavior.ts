import type { InputState } from './input.ts'
import type { Renderer } from './renderer.ts'

/**
 * A Behavior defines a reactive module that hooks into the pet lifecycle.
 * Behaviors receive tick and input events and can mutate pet state.
 */
export interface Behavior {
  /** Unique identifier for this behavior. */
  readonly name: string

  /** Called every frame with elapsed time (ms) and current input state. */
  onTick(delta: number, input: InputState): void

  /** Called when the owning pet is mounted, with its renderer. */
  onMount?(renderer: Renderer): void

  /** Called when the owning pet is unmounted. */
  onUnmount?(): void
}

/**
 * Manages a registry of named behaviors.
 * Behaviors can be toggled on/off without being removed.
 */
export class BehaviorManager {
  private readonly _behaviors: Map<string, Behavior> = new Map()
  private readonly _active: Set<string> = new Set()

  /** Register a new behavior. Throws if `name` already exists. */
  register(behavior: Behavior): void {
    if (this._behaviors.has(behavior.name)) {
      throw new Error(`Behavior "${behavior.name}" is already registered`)
    }
    this._behaviors.set(behavior.name, behavior)
    this._active.add(behavior.name)
  }

  /** Unregister a behavior by name. */
  unregister(name: string): void {
    this._behaviors.delete(name)
    this._active.delete(name)
  }

  /** Enable a registered behavior. */
  enable(name: string): void {
    if (this._behaviors.has(name)) {
      this._active.add(name)
    }
  }

  /** Disable a registered behavior without removing it. */
  disable(name: string): void {
    this._active.delete(name)
  }

  /** Returns `true` if the named behavior is currently active. */
  isActive(name: string): boolean {
    return this._active.has(name)
  }

  /** Iterate over all currently active behaviors. */
  *activeBehaviors(): Generator<Behavior> {
    for (const name of this._active) {
      const b = this._behaviors.get(name)
      if (b) yield b
    }
  }

  /** List all registered behavior names. */
  listAll(): string[] {
    return Array.from(this._behaviors.keys())
  }

  /** List currently active behavior names. */
  listActive(): string[] {
    return Array.from(this._active)
  }
}