import type { Behavior } from '../behavior.ts'
import type { InputState } from '../input.ts'
import type { Renderer } from '../renderer.ts'

/**
 * Configuration for the periodic blink behavior.
 */
export interface BlinkConfig {
  /** Milliseconds between blinks (default: 3000). */
  readonly interval: number
  /** Milliseconds the blink animation lasts (default: 150). */
  readonly duration: number
  /** Probability (0-1) of a double blink occurring (default: 0.2). */
  readonly doubleChance: number
}

const DEFAULT_CONFIG: BlinkConfig = {
  interval: 3000,
  duration: 150,
  doubleChance: 0.2,
}

/** Layout info for a single eye. */
interface EyePos {
  readonly cx: number
  readonly cy: number
  readonly radius: number
}

/**
 * Compute symmetrical eye positions matching the layout used by the eyes
 * behavior so blink overlays align correctly.
 */
function computeEyePositions(size: number): [EyePos, EyePos] {
  const radius = Math.max(size * 0.15, 4)
  return [
    { cx: size * 0.35, cy: size * 0.4, radius },
    { cx: size * 0.65, cy: size * 0.4, radius },
  ]
}

/**
 * Smooth ease-in-out function for natural-feeling blinks.
 */
function easeInOut(t: number): number {
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/**
 * Draw a closed-eye line (gentle downward arc) over a single eye position.
 * The arc represents the eyelid seam when the eye is shut.
 *
 * @param ctx - The 2D rendering context.
 * @param eye - Position and radius of the eye.
 * @param alpha - Opacity 0-1, controls how "closed" the line appears.
 */
function drawClosedEye(
  ctx: CanvasRenderingContext2D,
  eye: EyePos,
  alpha: number,
): void {
  if (alpha <= 0) return

  const { cx, cy, radius } = eye
  const curveDepth = radius * 0.2 * alpha
  const lineWidth = Math.max(1.5, radius * 0.12)

  ctx.beginPath()
  ctx.moveTo(cx - radius * 0.75, cy)
  ctx.quadraticCurveTo(cx, cy + curveDepth, cx + radius * 0.75, cy)
  ctx.strokeStyle = `rgba(60, 60, 60, ${alpha})`
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.stroke()
}

/**
 * Create a periodic blink behavior.
 *
 * The behavior closes and opens the pet's eyes at a configurable interval
 * with a smooth ease-in-out transition. Blink overlays are drawn on top of
 * whatever the canvas currently shows (usually normal eyes from the `eyes`
 * behavior), so this behavior should be registered **after** the eyes
 * behavior to draw the closed-eye line on top.
 *
 * @param config - Optional partial configuration (missing keys use defaults).
 * @returns A `Behavior` instance ready to be registered with a pet.
 */
export function createBlinkBehavior(config?: Partial<BlinkConfig>): Behavior {
  const cfg: BlinkConfig = { ...DEFAULT_CONFIG, ...config }

  let renderer: Renderer | null = null
  let size = 48

  /* ---- Blink state machine ---- */

  /** Accumulated time since the last blink ended (ms). */
  let nextBlinkTime = 0
  /**
   * Blink cycle progress 0–1. 0 = fully open (idle).
   * 0→0.5 = closing, 0.5→1 = opening. After 1, checks remainingBlinks.
   */
  let blinkProgress = 0
  /** Number of blinks remaining in the current sequence (1 or 2 for double). */
  let remainingBlinks = 1

  return {
    name: 'blink',

    onMount(r: Renderer): void {
      renderer = r
      size = r.width
    },

    onUnmount(): void {
      renderer = null
    },

    onTick(delta: number, _input: InputState): void {
      const r = renderer
      if (!r || !r.ctx) return

      /* ---- Idle: waiting for next blink ---- */

      if (blinkProgress <= 0) {
        nextBlinkTime += delta
        if (nextBlinkTime >= cfg.interval) {
          nextBlinkTime = 0
          blinkProgress = 0.001 // start cycle
          remainingBlinks = Math.random() < cfg.doubleChance ? 2 : 1
        }
        return
      }

      /* ---- In a blink cycle ---- */

      blinkProgress += delta / cfg.duration

      if (blinkProgress >= 1) {
        remainingBlinks--
        if (remainingBlinks > 0) {
          // Restart immediately for a double blink
          blinkProgress = 0.001
        } else {
          blinkProgress = 0
          return
        }
      }

      /* ---- Compute alpha ---- */

      // 0→1 during closing (0→0.5), 1→0 during opening (0.5→1)
      const rawAlpha = blinkProgress <= 0.5
        ? blinkProgress * 2
        : (1 - blinkProgress) * 2

      const alpha = easeInOut(rawAlpha)
      if (alpha <= 0) return

      /* ---- Draw closed-eye overlay ---- */

      const [leftEye, rightEye] = computeEyePositions(size)
      drawClosedEye(r.ctx, leftEye, alpha)
      drawClosedEye(r.ctx, rightEye, alpha)
    },
  }
}