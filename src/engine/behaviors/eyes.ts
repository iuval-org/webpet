import type { Behavior } from '../behavior.ts'
import type { InputState } from '../input.ts'
import type { Renderer } from '../renderer.ts'
import { getPupilMode, getEmotion } from '../emotion.ts'
import type { PupilMode } from '../emotion.ts'

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
    { cx: size * 0.3375, cy: size * 0.45, radius },    // 135/400 of viewBox
    { cx: size * 0.6625, cy: size * 0.45, radius },    // 265/400
  ]
}

/**
 * Draw a single eye on the canvas context.
 * The pupil shape varies by pupil mode: circle (normal), heart (love),
 * or a 4-point sparkle star (dizzy).
 */
function drawEye(
  ctx: CanvasRenderingContext2D,
  eye: EyeLayout,
  state: EyeState,
  config: EyesConfig,
  pupilMode: PupilMode,
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

  const px = cx + ox
  const py = cy + oy

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
  ctx.arc(px, py, radius * 0.85, 0, Math.PI * 2)
  ctx.fillStyle = config.irisColor
  ctx.fill()

  /* 3. Pupil (shape depends on pupil mode) */
  ctx.fillStyle = '#111111'
  if (pupilMode === 'heart') {
    drawPupilHeart(ctx, px, py, pupilR * 1.25)
  } else if (pupilMode === 'dizzy') {
    drawPupilDizzy(ctx, px, py, pupilR)
  } else {
    ctx.beginPath()
    ctx.arc(px, py, pupilR, 0, Math.PI * 2)
    ctx.fill()
  }

  /* 4. Highlight (small white glint — only on normal pupils) */
  const highlightR = pupilR * 0.35
  if (pupilMode === 'normal' && highlightR >= 1) {
    ctx.beginPath()
    ctx.arc(px - pupilR * 0.25, py - pupilR * 0.25, highlightR, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.fill()
  }
}

/** Draw a small heart-shaped pupil. */
function drawPupilHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(cx, cy + r * 0.9)
  ctx.bezierCurveTo(cx - r * 1.15, cy - r * 0.1, cx - r * 0.55, cy - r * 1.05, cx, cy - r * 0.35)
  ctx.bezierCurveTo(cx + r * 0.55, cy - r * 1.05, cx + r * 1.15, cy - r * 0.1, cx, cy + r * 0.9)
  ctx.fill()
}

/** Draw a 4-point sparkle star pupil (dizzy eyes). */
function drawPupilDizzy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
): void {
  const outer = r * 1.3
  const inner = r * 0.38
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 4 // diagonals first
    const rad = i % 2 === 0 ? outer : inner
    const x = cx + Math.cos(angle) * rad
    const y = cy + Math.sin(angle) * rad
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

/** Trace a rounded-rect path (avoids relying on ctx.roundRect typing). */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Draw black sunglasses over both eyes (cool emotion). */
function drawSunglasses(ctx: CanvasRenderingContext2D, size: number): void {
  const radius = Math.max(size * 0.15, 4)
  const eyeY = size * 0.45
  const leftCx = size * 0.3375
  const rightCx = size * 0.6625
  const lensW = radius * 1.9
  const lensH = radius * 1.2
  const bridgeW = rightCx - leftCx - lensW

  ctx.save()
  ctx.fillStyle = '#111111'

  /* Lenses */
  roundRectPath(ctx, leftCx - lensW / 2, eyeY - lensH / 2, lensW, lensH, lensH / 2.5)
  ctx.fill()
  roundRectPath(ctx, rightCx - lensW / 2, eyeY - lensH / 2, lensW, lensH, lensH / 2.5)
  ctx.fill()

  /* Bridge */
  if (bridgeW > 0) {
    ctx.fillRect(leftCx + lensW / 2, eyeY - lensH * 0.16, bridgeW, lensH * 0.32)
  }

  /* Temples */
  ctx.strokeStyle = '#111111'
  ctx.lineWidth = Math.max(size * 0.02, 2)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(leftCx - lensW / 2, eyeY - lensH * 0.25)
  ctx.lineTo(leftCx - lensW / 2 - radius * 0.65, eyeY - lensH * 0.5)
  ctx.moveTo(rightCx + lensW / 2, eyeY - lensH * 0.25)
  ctx.lineTo(rightCx + lensW / 2 + radius * 0.65, eyeY - lensH * 0.5)
  ctx.stroke()

  ctx.restore()
}

/**
 * Create an "eyes follow cursor" behavior.
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

      /* ---- Render eyes (canvas is cleared by character behavior) ---- */

      const pupilMode = getPupilMode()
      drawEye(r.ctx, leftLayout, leftEye, cfg, pupilMode)
      drawEye(r.ctx, rightLayout, rightEye, cfg, pupilMode)

      /* ---- Sunglasses overlay (cool emotion) ---- */
      if (getEmotion() === 'cool') {
        drawSunglasses(r.ctx, size)
      }
    },
  }
}