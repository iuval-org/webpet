import type { Behavior } from '../behavior.ts'
import type { InputState } from '../input.ts'
import type { Renderer } from '../renderer.ts'

/**
 * Configuration for the eyes-follow-cursor behavior.
 */
export interface EyesConfig {
  /** How fast the pupil follows the cursor (0 = static, 1 = instant). */
  readonly followSpeed: number
  /** Frames of smoothing (interpolation window). Used as denominator for smoothing. */
  readonly smoothFrames: number
  /** Maximum rotation angle in degrees (limits how far the eye can turn). */
  readonly maxAngle: number
  /** Color of the iris (CSS color string). */
  readonly irisColor: string
  /** Size of the pupil relative to the eye radius (0-1). */
  readonly pupilSize: number
  /** Milliseconds between blinks (reserved for a future blink behavior). */
  readonly blinkInterval: number
}

const DEFAULT_CONFIG: EyesConfig = {
  followSpeed: 0.15,
  smoothFrames: 10,
  maxAngle: 30,
  irisColor: '#4a90d9',
  pupilSize: 0.35,
  blinkInterval: 3000,
}

/** Layout info for a single eye. */
interface EyeLayout {
  readonly cx: number
  readonly cy: number
  readonly radius: number
}

/** Per-eye state tracked across frames. */
interface EyeState {
  /** Current horizontal offset from the eye center (pixels). */
  offsetX: number
  /** Current vertical offset from the eye center (pixels). */
  offsetY: number
}

/**
 * Compute the layout of both eyes based on canvas size.
 * Eyes are placed symmetrically in the upper-central area of the canvas.
 */
function computeEyeLayout(size: number): [EyeLayout, EyeLayout] {
  const radius = Math.max(size * 0.15, 4)
  return [
    { cx: size * 0.35, cy: size * 0.4, radius },
    { cx: size * 0.65, cy: size * 0.4, radius },
  ]
}

/**
 * Draw a single eye on the canvas context.
 *
 * @param ctx - The 2D rendering context.
 * @param eye - Layout info for this eye.
 * @param state - Current smoothed pupil offset for this eye.
 * @param config - Active eyes configuration.
 */
function drawEye(
  ctx: CanvasRenderingContext2D,
  eye: EyeLayout,
  state: EyeState,
  config: EyesConfig,
): void {
  const { cx, cy, radius } = eye
  const pupilR = Math.max(radius * config.pupilSize, 1.5)
  const maxDisp = radius * 0.4

  /* Clamp the offset so the pupil stays within the visible sclera */
  const disp = Math.sqrt(state.offsetX * state.offsetX + state.offsetY * state.offsetY)
  let ox = state.offsetX
  let oy = state.offsetY
  if (disp > maxDisp) {
    ox = (state.offsetX / disp) * maxDisp
    oy = (state.offsetY / disp) * maxDisp
  }

  /* 1. Sclera (white of the eye) */
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = '#cccccc'
  ctx.lineWidth = 1
  ctx.stroke()

  /* 2. Iris (colored circle) */
  ctx.beginPath()
  ctx.arc(cx + ox, cy + oy, radius * 0.85, 0, Math.PI * 2)
  ctx.fillStyle = config.irisColor
  ctx.fill()

  /* 3. Pupil (dark circle inside the iris) */
  ctx.beginPath()
  ctx.arc(cx + ox, cy + oy, pupilR, 0, Math.PI * 2)
  ctx.fillStyle = '#111111'
  ctx.fill()

  /* 4. Highlight (small white glint on the upper-left of the pupil) */
  const highlightR = pupilR * 0.35
  if (highlightR >= 1) {
    ctx.beginPath()
    ctx.arc(cx + ox - pupilR * 0.25, cy + oy - pupilR * 0.25, highlightR, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.fill()
  }
}

/**
 * Create an "eyes follow cursor" behavior.
 *
 * The behavior draws a pair of eyes on the pet's canvas and makes the pupils
 * smoothly track the mouse cursor position within the container.
 *
 * @param config - Optional partial configuration (missing keys use defaults).
 * @returns A `Behavior` instance ready to be registered with a pet.
 */
export function createEyesBehavior(config?: Partial<EyesConfig>): Behavior {
  const cfg: EyesConfig = { ...DEFAULT_CONFIG, ...config }

  let renderer: Renderer | null = null
  let size = 48

  const leftEye: EyeState = { offsetX: 0, offsetY: 0 }
  const rightEye: EyeState = { offsetX: 0, offsetY: 0 }

  return {
    name: 'eyes',

    onMount(r: Renderer): void {
      renderer = r
      size = r.width
    },

    onUnmount(): void {
      renderer = null
    },

    onTick(_delta: number, input: InputState): void {
      const r = renderer
      if (!r || !r.ctx) return

      const [leftLayout, rightLayout] = computeEyeLayout(size)

      /* ---- Smooth the pupil offset toward the cursor ---- */

      const smoothTarget = (eyeLayout: EyeLayout, state: EyeState): void => {
        const dx = input.canvasX - eyeLayout.cx
        const dy = input.canvasY - eyeLayout.cy
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > 0) {
          /* Forward direction: straight up (toward top of canvas, angle = -PI/2) */
          const forwardAngle = -Math.PI / 2
          const targetAngle = Math.atan2(dy, dx)
          let diff = targetAngle - forwardAngle
          /* Normalise angle difference to [-PI, PI] */
          diff = Math.atan2(Math.sin(diff), Math.cos(diff))

          const maxAngleRad = (cfg.maxAngle * Math.PI) / 180
          const clampedDiff = Math.max(-maxAngleRad, Math.min(maxAngleRad, diff))
          const effectiveAngle = forwardAngle + clampedDiff

          const maxDisp = eyeLayout.radius * 0.4
          const targetX = Math.cos(effectiveAngle) * maxDisp
          const targetY = Math.sin(effectiveAngle) * maxDisp

          /* Smooth interpolation using followSpeed */
          const lerpFactor = Math.min(cfg.followSpeed, 1)
          state.offsetX += (targetX - state.offsetX) * lerpFactor
          state.offsetY += (targetY - state.offsetY) * lerpFactor
        }
      }

      smoothTarget(leftLayout, leftEye)
      smoothTarget(rightLayout, rightEye)

      /* ---- Render eyes ---- */

      r.clear()
      drawEye(r.ctx, leftLayout, leftEye, cfg)
      drawEye(r.ctx, rightLayout, rightEye, cfg)
    },
  }
}