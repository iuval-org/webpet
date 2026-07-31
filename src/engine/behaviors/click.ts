import type { Behavior } from '../behavior.ts'
import type { InputState } from '../input.ts'
import type { Renderer } from '../renderer.ts'

/**
 * Configuration for the click-reaction behavior.
 */
export interface ClickConfig {
  /** Intensity 0-1, how strong the reaction is (default: 0.5). */
  readonly intensity: number
  /** Duration of the animation in ms (default: 400). */
  readonly duration: number
  /** Preferred reaction type; 'random' picks one each click (default: 'random'). */
  readonly reactionType: 'random' | 'jump' | 'spin' | 'squish' | 'emoji'
  /** Emojis used in the 'emoji' reaction (default: ['⭐', '❤️', '✨', '🎉']). */
  readonly emojis: readonly string[]
  /** Number of particles/emojis to spawn (default: 5). */
  readonly particleCount: number
}

const DEFAULT_CONFIG: ClickConfig = {
  intensity: 0.5,
  duration: 400,
  reactionType: 'random',
  emojis: ['⭐', '❤️', '✨', '🎉'],
  particleCount: 5,
}

type ReactionKind = 'jump' | 'spin' | 'squish' | 'emoji'

const ALL_REACTIONS: readonly ReactionKind[] = ['jump', 'spin', 'squish', 'emoji']

/** Ease-out cubic for snappy animations. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** Interface for a single emoji particle. */
interface EmojiParticle {
  readonly el: HTMLSpanElement
  startX: number
  startY: number
  progress: number
}

/**
 * Pick a reaction kind based on the config.
 * When `reactionType` is `'random'`, picks uniformly at random.
 */
function pickReaction(cfg: ClickConfig): ReactionKind {
  if (cfg.reactionType !== 'random') {
    return cfg.reactionType
  }
  const idx = Math.floor(Math.random() * ALL_REACTIONS.length)
  return ALL_REACTIONS[idx]!
}

/**
 * Create a click-reaction behavior.
 *
 * The pet reacts to mouse clicks within its bounding box with one of four
 * animations:
 *   - **jump**:   translateY bounce (up then down)
 *   - **spin**:   full 360° rotation
 *   - **squish**: squash-and-stretch (compress horizontally, stretch vertically)
 *   - **emoji**:  burst of floating emoji particles
 *
 * Multiple clicks chain: clicking again before the animation finishes restarts
 * the current reaction (potentially with a new random type).
 *
 * @param config - Optional partial configuration (missing keys use defaults).
 * @returns A `Behavior` instance ready to be registered with a pet.
 */
export function createClickBehavior(config?: Partial<ClickConfig>): Behavior {
  const cfg: ClickConfig = { ...DEFAULT_CONFIG, ...config }

  let renderer: Renderer | null = null
  let canvas: HTMLCanvasElement | null = null
  let container: HTMLElement | null = null
  let size = 48

  /* ---- Click edge detection ---- */
  let wasClicking = false

  /* ---- Animation state ---- */
  let animating = false
  let animProgress = 0
  let currentReaction: ReactionKind = 'jump'

  /* ---- Cached DOM refs for canvas transforms ---- */
  const particles: EmojiParticle[] = []

  /* ---- Cleanup particles ---- */
  function removeAllParticles(): void {
    for (const p of particles) {
      p.el.remove()
    }
    particles.length = 0
  }

  /* ---- Start a reaction ---- */
  function triggerReaction(kind: ReactionKind): void {
    currentReaction = kind
    animProgress = 0
    animating = true

    // If emoji reaction, spawn particles immediately at t=0
    if (kind === 'emoji') {
      spawnParticles()
    }
  }

  /* ---- Spawn emoji particles ---- */
  function spawnParticles(): void {
    const c = container
    if (!c) return

    // Remove any existing particles first
    removeAllParticles()

    const offsetX = size / 2
    const offsetY = size / 2

    for (let i = 0; i < cfg.particleCount; i++) {
      const emoji = cfg.emojis[Math.floor(Math.random() * cfg.emojis.length)]!

      const el = document.createElement('span')
      el.textContent = emoji
      el.style.position = 'absolute'
      el.style.pointerEvents = 'none'
      el.style.fontSize = `${Math.max(12, size * 0.35)}px`
      el.style.lineHeight = '1'
      el.style.userSelect = 'none'
      el.style.willChange = 'transform, opacity'

      // Random scatter from centre
      const spreadX = (Math.random() - 0.5) * size * 0.5 * cfg.intensity
      const spreadY = (Math.random() - 0.5) * size * 0.3 * cfg.intensity

      el.style.left = `${offsetX + spreadX}px`
      el.style.bottom = `${offsetY + spreadY}px`
      el.style.transform = 'translateY(0)'

      c.appendChild(el)

      particles.push({
        el,
        startX: offsetX + spreadX,
        startY: offsetY + spreadY,
        progress: 0,
      })
    }
  }

  /* ---- Update emoji particles ---- */
  function updateParticles(progress: number): void {
    const rise = size * 0.6 * cfg.intensity
    const fadeOut = progress

    for (const p of particles) {
      p.progress = progress
      const riseY = -rise * easeOutCubic(progress)
      p.el.style.transform = `translateY(${riseY}px)`
      p.el.style.opacity = `${Math.max(0, 1 - fadeOut)}`
    }
  }

  /* ---- Apply canvas transform ---- */
  function applyCanvasTransform(progress: number, kind: ReactionKind): void {
    const cvs = canvas
    if (!cvs) return

    const t = easeOutCubic(progress)
    const intensityScaled = 0.3 + cfg.intensity * 0.7 // map intensity 0-1 to reasonable visual range

    switch (kind) {
      case 'jump': {
        // Up at mid-point, back down at end
        const peak = size * 0.4 * intensityScaled
        // t goes 0→1, jump curve: up early, back late
        const jumpT = -4 * t * (t - 1) // parabola: 0 at 0→1, peak 1 at 0.5
        const y = -peak * jumpT
        cvs.style.transform = `translateY(${y}px)`
        break
      }
      case 'spin': {
        const deg = 360 * t
        cvs.style.transform = `rotate(${deg}deg)`
        break
      }
      case 'squish': {
        // Squash at mid-point: scaleX shrinks, scaleY grows
        const squashAmount = 0.3 * intensityScaled
        const squishCurve = -4 * t * (t - 1) // parabola peak at 0.5
        const scaleX = 1 - squashAmount * squishCurve
        const scaleY = 1 + squashAmount * squishCurve
        cvs.style.transform = `scaleX(${scaleX}) scaleY(${scaleY})`
        break
      }
      case 'emoji': {
        updateParticles(progress)
        // No canvas transform for emoji mode (particles are DOM elements)
        cvs.style.transform = ''
        break
      }
    }
  }

  /* ---- Reset canvas transform ---- */
  function resetTransform(): void {
    if (canvas) {
      canvas.style.transform = ''
    }
  }

  return {
    name: 'click',

    onMount(r: Renderer): void {
      renderer = r
      size = r.width
      canvas = r.canvas
      container = r.container

      // Ensure the canvas has `position: relative` so absolute particles
      // are positioned relative to it. The Renderer sets `display: block`
      // on the canvas, so we wrap it in a relative positioned container.
      if (container) {
        container.style.position = 'relative'
        container.style.overflow = 'visible'
      }
    },

    onUnmount(): void {
      removeAllParticles()
      resetTransform()
      renderer = null
      canvas = null
      container = null
    },

    onTick(delta: number, input: InputState): void {
      const r = renderer
      if (!r) return

      /* ---- Edge-detect a new click inside the pet bounding box ---- */

      const isInside =
        input.canvasX >= 0 &&
        input.canvasX <= size &&
        input.canvasY >= 0 &&
        input.canvasY <= size

      if (input.isClicking && !wasClicking && isInside) {
        // New click — pick reaction and (re)start
        const kind = pickReaction(cfg)
        triggerReaction(kind)
      }
      wasClicking = input.isClicking

      /* ---- Animate ---- */

      if (!animating) return

      animProgress += delta / cfg.duration

      if (animProgress >= 1) {
        // Animation complete
        animating = false
        animProgress = 0
        resetTransform()
        removeAllParticles()
        return
      }

      applyCanvasTransform(animProgress, currentReaction)
    },
  }
}