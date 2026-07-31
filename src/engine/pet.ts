import { BehaviorManager } from './behavior.ts'
import type { Behavior } from './behavior.ts'
import { Renderer } from './renderer.ts'
import type { Renderer as RendererType } from './renderer.ts'
import { core } from './core.ts'
import { input } from './input.ts'

/** User-provided color value (hex, rgb, hsl, or named). */
type Color = string

/** Configuration for creating a pet instance. */
export interface PetConfig {
  /** Unique identifier for this pet. */
  readonly id?: string
  /** Behaviors to install on this pet. */
  readonly behaviors?: Behavior[]
  /** Primary color of the pet (default: "#a78bfa"). */
  readonly color?: Color
  /** Size of the pet in pixels (default: 48). */
  readonly size?: number
  /** Render mode — 'canvas' or 'div' (default: 'canvas'). */
  readonly mode?: 'canvas' | 'div'
}

/** A live pet instance with its own state, behaviors, and renderer. */
export interface PetInstance {
  /** Unique identifier. */
  readonly id: string
  /** The color assigned at creation. */
  readonly color: Color
  /** The size assigned at creation. */
  readonly size: number
  /** Behavior manager for this pet. */
  readonly behaviors: BehaviorManager
  /** The renderer assigned to this pet, or null if not mounted. */
  readonly renderer: RendererType | null
  /** Mount the pet into a DOM container, starting the engine loop. */
  mount(container: HTMLElement): void
  /** Unmount the pet, stopping its behaviors and removing its renderer. */
  unmount(): void
  /** Get a list of active behavior names. */
  getBehaviors(): string[]
}

let _nextId = 0
function generateId(): string {
  return `pet-${++_nextId}`
}

/**
 * Create a new pet instance with the given configuration.
 * The pet is inert until `mount(container)` is called.
 */
export function createPet(config: PetConfig): PetInstance {
  const id = config.id ?? generateId()
  const color: Color = config.color ?? '#a78bfa'
  const size = config.size ?? 48
  const mode = config.mode ?? 'canvas'

  const behaviorManager = new BehaviorManager()
  for (const b of config.behaviors ?? []) {
    behaviorManager.register(b)
  }

  let _renderer: RendererType | null = null

  const instance: PetInstance = {
    id,
    color,
    size,
    behaviors: behaviorManager,
    get renderer() {
      return _renderer
    },

    mount(container: HTMLElement): void {
      if (_renderer) {
        throw new Error(`Pet "${id}" is already mounted`)
      }

      _renderer = new Renderer({ container, mode, width: size, height: size })

      // Set the canvas so input coordinates are relative to it
      if (_renderer.canvas) {
        input.setCanvas(_renderer.canvas)
      }

      const activeBehaviors = Array.from(behaviorManager.activeBehaviors())
      core.mount(id, activeBehaviors, _renderer)
    },

    unmount(): void {
      core.getPet(id)?.unmount()
      _renderer = null
    },

    getBehaviors(): string[] {
      return behaviorManager.listActive()
    },
  }

  return instance
}