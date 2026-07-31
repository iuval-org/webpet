import type { Behavior } from './behavior.ts'
import type { Renderer } from './renderer.ts'
import { input } from './input.ts'
import type { InputState } from './input.ts'

/** A mounted pet instance managed by the core loop. */
export interface PetHandle {
  /** Unique id for this pet instance. */
  readonly id: string
  /** The behaviors registered with this pet. */
  readonly behaviors: readonly Behavior[]
  /** The renderer assigned to this pet. */
  readonly renderer: Renderer
  /** Tear down the pet, removing it from the loop. */
  unmount(): void
  /** Pause tick updates (rendering still happens). */
  pause(): void
  /** Resume tick updates. */
  resume(): void
}

type TickFn = (delta: number, input: InputState) => void

/**
 * Core game-loop singleton.
 * Manages the requestAnimationFrame loop, delta-time calculation,
 * and a set of active pet instances.
 */
class CoreLoop {
  private readonly _pets: Map<string, PetHandle> = new Map()
  private _rafId: number | null = null
  private _lastTime = 0
  private _running = false

  /** Register a pet and start the loop if it isn't already running. */
  mount(id: string, behaviors: readonly Behavior[], renderer: Renderer): PetHandle {
    if (this._pets.has(id)) {
      throw new Error(`Pet "${id}" is already mounted`)
    }

    const handle: PetHandle = {
      id,
      behaviors,
      renderer,
      unmount: () => this._unmount(id),
      pause: () => this._unmount(id),
      resume: () => { /* re-mounting handled externally */ },
    }

    this._pets.set(id, handle)

    for (const b of behaviors) {
      b.onMount?.(renderer)
    }

    if (!this._running) {
      this._start()
    }

    return handle
  }

  /** Get a pet handle by id, or `undefined`. */
  getPet(id: string): PetHandle | undefined {
    return this._pets.get(id)
  }

  /** List all mounted pet ids. */
  listPets(): string[] {
    return Array.from(this._pets.keys())
  }

  /** Register an external tick callback (e.g. for renderers). */
  onTick(fn: TickFn): () => void {
    this._tickListeners.add(fn)
    return () => this._tickListeners.delete(fn)
  }

  private readonly _tickListeners = new Set<TickFn>()

  /* ---- internal ---- */

  private _start(): void {
    this._running = true
    this._lastTime = performance.now()
    input.start()
    this._rafId = requestAnimationFrame(this._tick)
  }

  private _stop(): void {
    this._running = false
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
    input.stop()
  }

  private readonly _tick = (now: number): void => {
    if (!this._running) return

    const delta = now - this._lastTime
    this._lastTime = now

    // Update input and notify listeners
    input.notifyListeners()
    const state = input.getState()

    // Tick each pet's behaviors
    for (const handle of this._pets.values()) {
      for (const b of handle.behaviors) {
        b.onTick(delta, state)
      }
    }

    // Fire external tick listeners
    for (const fn of this._tickListeners) {
      fn(delta, state)
    }

    this._rafId = requestAnimationFrame(this._tick)
  }

  private _unmount(id: string): void {
    const handle = this._pets.get(id)
    if (!handle) return

    for (const b of handle.behaviors) {
      b.onUnmount?.()
    }

    handle.renderer.destroy()
    this._pets.delete(id)

    if (this._pets.size === 0) {
      this._stop()
    }
  }
}

/** Global core-loop singleton. */
export const core = new CoreLoop()