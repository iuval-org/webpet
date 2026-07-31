/**
 * Emotion System — core emotion types, draw state, and behavior.
 *
 * Defines 7 emotions, their target draw states, and an emotion Behavior
 * that draws the pet's expression (mouth + eye modifiers) on the canvas.
 *
 * @module engine/emotion
 */

import type { Behavior } from './behavior.ts'
import type { Renderer } from './renderer.ts'
import type { InputState } from './input.ts'

/* -------------------------------------------------------- */
/*  Types                                                  */
/* -------------------------------------------------------- */

export type Emotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'sleepy'
  | 'scared'

/** Per-frame draw state that behaviours can read. */
export interface EmotionDrawState {
  /** Mouth curvature: -1 (frown) → 1 (smile). */
  readonly mouthCurvature: number
  /** Mouth openness: 0 (closed) → 1 (wide open). */
  readonly mouthOpenness: number
  /** Eye openness: 0 (closed blink) → 1 (wide). */
  readonly eyeOpenness: number
  /** Eye / brow angle offset — positive = arched, negative = furrowed. */
  readonly eyeAngle: number
  /** Tremble amplitude for scared / intense emotions. */
  readonly trembling: number
}

export interface EmotionConfig {
  readonly defaultEmotion: Emotion
  /** Interpolation speed toward target (0–1). */
  readonly transitionSpeed: number
}

/* -------------------------------------------------------- */
/*  Draw targets per emotion                                */
/* -------------------------------------------------------- */

const TARGETS: Record<Emotion, EmotionDrawState> = {
  neutral:   { mouthCurvature: 0,   mouthOpenness: 0,   eyeOpenness: 0.5, eyeAngle: 0,   trembling: 0 },
  happy:     { mouthCurvature: 1,   mouthOpenness: 0,   eyeOpenness: 0.4, eyeAngle: 0.3, trembling: 0 },
  sad:       { mouthCurvature: -1,  mouthOpenness: 0,   eyeOpenness: 0.35, eyeAngle: -0.2, trembling: 0 },
  angry:     { mouthCurvature: -0.4, mouthOpenness: 0.1, eyeOpenness: 0.45, eyeAngle: -0.5, trembling: 0.08 },
  surprised: { mouthCurvature: 0,   mouthOpenness: 0.8, eyeOpenness: 0.9, eyeAngle: 0.1, trembling: 0 },
  sleepy:    { mouthCurvature: 0.1, mouthOpenness: 0,   eyeOpenness: 0.15, eyeAngle: 0,   trembling: 0 },
  scared:    { mouthCurvature: -0.6, mouthOpenness: 0.5, eyeOpenness: 0.85, eyeAngle: -0.3, trembling: 0.5 },
}

/* -------------------------------------------------------- */
/*  Drawing helpers                                         */
/* -------------------------------------------------------- */

function cloneTarget(e: Emotion): EmotionDrawState {
  const s = TARGETS[e]
  return { ...s }
}

/**
 * Draw a mouth on the canvas based on the current emotion draw state.
 */
function drawMouth(
  ctx: CanvasRenderingContext2D,
  size: number,
  state: EmotionDrawState,
  color: string,
  time: number,
): void {
  const cx = size / 2
  const mouthY = size * 0.68
  const mouthW = size * 0.3
  const strokeW = Math.max(size * 0.04, 2)

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = strokeW
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (state.mouthOpenness > 0.3) {
    /* Open mouth (surprised, scared) — draw an oval */
    const oh = state.mouthOpenness * mouthW * 0.6
    const ow = mouthW * (0.6 + state.mouthOpenness * 0.4)
    ctx.beginPath()
    ctx.ellipse(cx, mouthY + oh * 0.2, ow / 2, oh / 2, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#111'
    ctx.fill()
    ctx.stroke()
  } else {
    /* Closed mouth — a curved arc */
    const curvature = state.mouthCurvature * mouthW * 0.35
    ctx.beginPath()
    ctx.moveTo(cx - mouthW / 2, mouthY)
    ctx.quadraticCurveTo(cx, mouthY - curvature, cx + mouthW / 2, mouthY)
    ctx.stroke()
  }

  /* Trembling effect — slight random offset */
  if (state.trembling > 0.05) {
    const amp = state.trembling * 3
    ctx.strokeStyle = `${color}40`
    ctx.lineWidth = strokeW * 0.5
    ctx.beginPath()
    const tx = cx - mouthW / 2 + Math.sin(time * 15) * amp
    const ty = mouthY + Math.cos(time * 17) * amp
    ctx.moveTo(tx, ty)
    const ex = cx + mouthW / 2 + Math.sin(time * 13 + 1) * amp
    const ey = mouthY + Math.cos(time * 19 + 2) * amp
    ctx.quadraticCurveTo(cx + Math.sin(time * 11) * amp, mouthY - state.mouthCurvature * mouthW * 0.35 + Math.cos(time * 14) * amp, ex, ey)
    ctx.stroke()
  }

  ctx.restore()
}

/* -------------------------------------------------------- */
/*  Emotion behavior                                        */
/* -------------------------------------------------------- */

const DEFAULT_CONFIG: EmotionConfig = {
  defaultEmotion: 'neutral',
  transitionSpeed: 0.04,
}

export interface EmotionAPI {
  readonly setEmotion: (emotion: Emotion) => void
  readonly getEmotion: () => Emotion
  readonly onEmotionChange: (cb: (emotion: Emotion) => void) => () => void
  readonly getDrawState: () => EmotionDrawState
}

/**
 * Create an emotion behaviour.
 *
 * Draws the pet's emotional expression (mouth) over the canvas.
 * Other behaviours can read `getDrawState()` to adjust eye rendering.
 */
export function createEmotionBehavior(config?: Partial<EmotionConfig>): Behavior & EmotionAPI {
  const cfg: EmotionConfig = { ...DEFAULT_CONFIG, ...config }

  let renderer: Renderer | null = null
  let size = 48
  let color = '#333'
  let time = 0

  const _listeners: Array<(emotion: Emotion) => void> = []

  let _current: Emotion = cfg.defaultEmotion
  let _target: Emotion = cfg.defaultEmotion
  let _draw: EmotionDrawState = cloneTarget(cfg.defaultEmotion)

  /* ---- Emotion API ---- */

  function setEmotion(emotion: Emotion): void {
    if (emotion === _target) return
    _target = emotion
    for (const cb of _listeners) cb(emotion)
  }

  function getEmotion(): Emotion {
    return _current
  }

  function onEmotionChange(cb: (emotion: Emotion) => void): () => void {
    _listeners.push(cb)
    return () => {
      const idx = _listeners.indexOf(cb)
      if (idx >= 0) _listeners.splice(idx, 1)
    }
  }

  function getDrawState(): EmotionDrawState {
    return _draw
  }

  /* ---- Behavior hooks ---- */

  return {
    name: 'emotion',

    setEmotion,
    getEmotion,
    onEmotionChange,
    getDrawState,

    onMount(r: Renderer): void {
      renderer = r
      size = r.width
      _current = cfg.defaultEmotion
      _target = cfg.defaultEmotion
      _draw = cloneTarget(_current)
    },

    onUnmount(): void {
      renderer = null
    },

    onTick(delta: number, _input: InputState): void {
      const r = renderer
      if (!r || !r.ctx) return

      time += delta / 1000

      /* ---- Smooth transition toward target ---- */

      if (_target !== _current) {
        const target = TARGETS[_target]
        _draw = {
          mouthCurvature: lerp(_draw.mouthCurvature, target.mouthCurvature, cfg.transitionSpeed),
          mouthOpenness: lerp(_draw.mouthOpenness, target.mouthOpenness, cfg.transitionSpeed),
          eyeOpenness: lerp(_draw.eyeOpenness, target.eyeOpenness, cfg.transitionSpeed),
          eyeAngle: lerp(_draw.eyeAngle, target.eyeAngle, cfg.transitionSpeed),
          trembling: lerp(_draw.trembling, target.trembling, cfg.transitionSpeed),
        }

        /* Snap if close enough */
        const snapThreshold = 0.02
        if (
          approxEq(_draw.mouthCurvature, target.mouthCurvature, snapThreshold) &&
          approxEq(_draw.mouthOpenness, target.mouthOpenness, snapThreshold) &&
          approxEq(_draw.eyeOpenness, target.eyeOpenness, snapThreshold) &&
          approxEq(_draw.eyeAngle, target.eyeAngle, snapThreshold) &&
          approxEq(_draw.trembling, target.trembling, snapThreshold)
        ) {
          _current = _target
          _draw = cloneTarget(_current)
        }
      }

      /* ---- Draw mouth ---- */

      drawMouth(r.ctx, size, _draw, color, time)
    },
  }
}

/* -------------------------------------------------------- */
/*  Math helpers                                            */
/* -------------------------------------------------------- */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(t, 1)
}

function approxEq(a: number, b: number, eps: number): boolean {
  return Math.abs(a - b) < eps
}