/**
 * Emotion System — core emotion types, draw state, and character behavior.
 *
 * Integrates with the character system to draw:
 * - Character body (blob + gradient)
 * - Eyebrows
 * - Eyelids (blink animation)
 * - Mouth (per emotion)
 * - Smooth transitions between emotions
 *
 * This behavior MUST be registered FIRST as it clears the canvas.
 *
 * @module engine/emotion
 */

import type { Behavior } from './behavior.ts'
import type { Renderer } from './renderer.ts'
import type { InputState } from './input.ts'
import {
  drawAccessories,
  drawEyebrows,
  drawEyelids,
  drawMouth,
  getCharacterDef,
  setCharacter,
  getCharacter,
  getCharacterRenderState,
  setCharacterSquash,
  getAppearance,
  type CharacterId,
} from './character.ts'
import { playBlink, playPoke, playAngry, playSad, playLove, playCool, playDizzy, playSilly } from './audio.ts'
import { drawBody as drawAppearanceBody, drawArms, drawHeadgear } from './appearance.ts'

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
  | 'love'
  | 'cool'
  | 'dizzy'
  | 'silly'
  | 'skeptical'

/** Visual mode for the pupils, driven by the active emotion. */
export type PupilMode = 'normal' | 'heart' | 'dizzy'

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
  neutral:   { mouthCurvature: 0,   mouthOpenness: 0,   eyeOpenness: 0.5, eyeAngle: 0,  trembling: 0 },
  happy:     { mouthCurvature: 1,   mouthOpenness: 0,   eyeOpenness: 0.4, eyeAngle: 0.3, trembling: 0 },
  sad:       { mouthCurvature: -1,  mouthOpenness: 0,   eyeOpenness: 0.35, eyeAngle: -0.15, trembling: 0 },
  angry:     { mouthCurvature: -0.4, mouthOpenness: 0.1, eyeOpenness: 0.45, eyeAngle: -0.5, trembling: 0.08 },
  surprised: { mouthCurvature: 0,   mouthOpenness: 0.8, eyeOpenness: 0.9, eyeAngle: 0.1, trembling: 0 },
  sleepy:    { mouthCurvature: 0.1, mouthOpenness: 0,   eyeOpenness: 0.15, eyeAngle: 0,  trembling: 0 },
  scared:    { mouthCurvature: -0.6, mouthOpenness: 0.5, eyeOpenness: 0.85, eyeAngle: -0.3, trembling: 0.5 },
  love:      { mouthCurvature: 1,   mouthOpenness: 0,   eyeOpenness: 0.5, eyeAngle: 0.2, trembling: 0 },
  cool:      { mouthCurvature: 0.2, mouthOpenness: 0,   eyeOpenness: 0.3, eyeAngle: -0.1, trembling: 0 },
  dizzy:     { mouthCurvature: -0.3, mouthOpenness: 0.4, eyeOpenness: 0.6, eyeAngle: 0,  trembling: 0.15 },
  silly:     { mouthCurvature: 0.3, mouthOpenness: 0.5, eyeOpenness: 0.4, eyeAngle: 0.4, trembling: 0 },
  skeptical: { mouthCurvature: -0.2, mouthOpenness: 0,   eyeOpenness: 0.3, eyeAngle: 0.6, trembling: 0 },
}

/* -------------------------------------------------------- */
/*  Drawing helpers                                         */
/* -------------------------------------------------------- */

function cloneTarget(e: Emotion): EmotionDrawState {
  const s = TARGETS[e]
  return { ...s }
}

/* -------------------------------------------------------- */
/*  Emotion behavior                                        */
/* -------------------------------------------------------- */

const DEFAULT_CONFIG: EmotionConfig = {
  defaultEmotion: 'neutral',
  transitionSpeed: 0.04,
}

/* ---- Pupil mode ---- */

const PUPIL_MODE_BY_EMOTION: Record<Emotion, PupilMode> = {
  neutral: 'normal',
  happy: 'normal',
  sad: 'normal',
  angry: 'normal',
  surprised: 'normal',
  sleepy: 'normal',
  scared: 'normal',
  love: 'heart',
  cool: 'normal',
  dizzy: 'dizzy',
  silly: 'normal',
  skeptical: 'normal',
}

/**
 * Module-level snapshot of the active pet's emotion + pupil mode.
 * The engine is single-pet (character state is already module-level in
 * character.ts), so the eyes behavior reads these to render pupil shapes
 * and the sunglasses overlay without coupling behavior instances.
 */
let _activeEmotion: Emotion = 'neutral'
let _activePupilMode: PupilMode = 'normal'

export function getEmotion(): Emotion {
  return _activeEmotion
}

export function getPupilMode(): PupilMode {
  return _activePupilMode
}

/* ---- Squash & stretch ---- */

/** Duration of the bounce-back squash animation in seconds. */
const SQUASH_SECONDS = 0.5
/** Peak squash/stretch amplitude: squashX = 1 + AMP, squashY = 1 - AMP. */
const SQUASH_AMP = 0.15
/** Recovery easing for external squashes (e.g. click) — per-frame lerp. */
const SQUASH_RECOVERY = 0.15

/** Ease-out-back: 0 → 1 with a small overshoot past 1 mid-way. */
const BACK_C1 = 1.70158
const BACK_C3 = BACK_C1 + 1
function easeOutBack(x: number): number {
  return 1 + BACK_C3 * Math.pow(x - 1, 3) + BACK_C1 * Math.pow(x - 1, 2)
}

export interface EmotionAPI {
  readonly setEmotion: (emotion: Emotion) => void
  readonly getEmotion: () => Emotion
  readonly onEmotionChange: (cb: (emotion: Emotion) => void) => () => void
  readonly getDrawState: () => EmotionDrawState
  readonly setCharacter: (id: CharacterId) => void
  readonly getCharacter: () => CharacterId
  readonly setPupilMode: (mode: PupilMode) => void
  readonly getPupilMode: () => PupilMode
}

/**
 * Create the character + emotion behaviour.
 *
 * Draws body, eyebrows, eyelids, and mouth on the canvas.
 * Clears the canvas each frame so other behaviours draw on a clean surface.
 * MUST be registered before other rendering behaviours (eyes, blink, etc.).
 *
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
  let _blinkProgress = 0
  let _lastBlinkTime = 0
  let _pupilMode: PupilMode = PUPIL_MODE_BY_EMOTION[cfg.defaultEmotion]
  let _squashTime = 0

  /* ---- Emotion API ---- */

  function setEmotion(emotion: Emotion): void {
    if (emotion === _target) return
    _target = emotion

    // Sync module-level snapshot for cross-behavior reads (eyes, etc.)
    _activeEmotion = emotion
    _activePupilMode = PUPIL_MODE_BY_EMOTION[emotion]

    // Momentary squash & stretch whenever the emotion changes abruptly
    setCharacterSquash(1 + SQUASH_AMP, 1 - SQUASH_AMP)
    _squashTime = SQUASH_SECONDS

    // Pupil mode follows the emotion
    _pupilMode = PUPIL_MODE_BY_EMOTION[emotion]

    // Play sound based on emotion (skeptical stays silent)
    switch (emotion) {
      case 'happy': playPoke(); break
      case 'angry': playAngry(); break
      case 'sad': playSad(); break
      case 'surprised': playBlink(); break
      case 'love': playLove(); break
      case 'cool': playCool(); break
      case 'dizzy': playDizzy(); break
      case 'silly': playSilly(); break
      default: break
    }

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

  function setPupilMode(mode: PupilMode): void {
    _pupilMode = mode
    _activePupilMode = mode
  }

  function getPupilMode(): PupilMode {
    return _pupilMode
  }

  function setCharacterId(id: CharacterId): void {
    setCharacter(id)
  }

  function getCharacterId(): CharacterId {
    return getCharacter()
  }

  /* ---- Behavior hooks ---- */

  return {
    name: 'emotion',

    setEmotion: setEmotion,
    getEmotion,
    onEmotionChange,
    getDrawState,
    setCharacter: setCharacterId,
    getCharacter: getCharacterId,
    setPupilMode,
    getPupilMode,

    onMount(r: Renderer): void {
      renderer = r
      size = r.width
      _current = cfg.defaultEmotion
      _target = cfg.defaultEmotion
      _draw = cloneTarget(_current)
      _blinkProgress = 0
      _lastBlinkTime = performance.now()
      _activeEmotion = cfg.defaultEmotion
      _activePupilMode = PUPIL_MODE_BY_EMOTION[cfg.defaultEmotion]
    },

    onUnmount(): void {
      renderer = null
    },

    onTick(delta: number, _input: InputState): void {
      const r = renderer
      if (!r || !r.ctx) return

      time += delta / 1000
      const charDef = getCharacterDef()
      const renderState = getCharacterRenderState()

      /* ---- Clear canvas (we own clearing) ---- */
      r.clear()

      /* ---- Apply character transforms (movement, rotation, squash) ---- */
      const ctx = r.ctx
      ctx.save()
      ctx.translate(size / 2 + renderState.offsetX, size / 2 + renderState.offsetY)
      ctx.rotate((renderState.rotation * Math.PI) / 180)
      ctx.scale(renderState.squashX, renderState.squashY)
      ctx.translate(-size / 2, -size / 2)

      /* ---- Draw character body ---- */
      const ap = getAppearance()
      drawAppearanceBody(ctx, size, ap.body, charDef)
      drawAccessories(ctx, size, charDef)

      /* ---- Draw arms ---- */
      drawArms(ctx, size, ap.arms, charDef, time)

      /* ---- Draw headgear ---- */
      drawHeadgear(ctx, size, ap.headgear, charDef, time)

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

      /* ---- Squash & stretch recovery (bounce/elastic) ---- */

      if (_squashTime > 0) {
        // Progress 0 → 1; amplitude starts at 1 and dips negative (overshoot)
        // before settling at 0, producing a soft bounce back to rest.
        const progress = 1 - _squashTime / SQUASH_SECONDS
        _squashTime = Math.max(0, _squashTime - delta / 1000)
        const amp = 1 - easeOutBack(progress)
        setCharacterSquash(1 + SQUASH_AMP * amp, 1 - SQUASH_AMP * amp)
      } else if (renderState.squashX !== 1 || renderState.squashY !== 1) {
        // External squash (e.g. click behavior) — ease back to rest
        setCharacterSquash(
          renderState.squashX + (1 - renderState.squashX) * SQUASH_RECOVERY,
          renderState.squashY + (1 - renderState.squashY) * SQUASH_RECOVERY,
        )
      }

      /* ---- Auto-blink ---- */
      const blinkInterval = 3000 + Math.random() * 2000
      if (!_blinkProgress && performance.now() - _lastBlinkTime > blinkInterval) {
        _blinkProgress = 0.001
        _lastBlinkTime = performance.now()
      }
      if (_blinkProgress > 0 && _blinkProgress < 1) {
        _blinkProgress += delta / 150 // 150ms blink duration
        if (_blinkProgress >= 1) {
          _blinkProgress = 0
        }
      }

      /* ---- Draw eyebrows ---- */
      const browAngle = _draw.eyeAngle
      // Asymmetric brows: skeptical = one raised, one lowered; silly = uneven
      const browAsymmetry =
        _current === 'skeptical' ? 1.2
        : _current === 'silly' ? 0.4
        : 0
      drawEyebrows(ctx, size, browAngle, '#222', browAsymmetry)

      /* ---- Draw eyelids (blink + sleepy) ---- */
      const blinkAmount = _blinkProgress > 0
        ? (_blinkProgress < 0.5 ? _blinkProgress * 2 : (1 - _blinkProgress) * 2)
        : 0
      const eyeCover = Math.max(blinkAmount, 1 - (_draw.eyeOpenness * 2))
      drawEyelids(ctx, size, eyeCover, charDef.eyelidColor)

      /* ---- Draw mouth ---- */
      drawMouth(
        ctx, size,
        _draw.mouthCurvature,
        _draw.mouthOpenness,
        _draw.trembling,
        color,
        time,
      )

      /* ---- Restore canvas transforms ---- */
      ctx.restore()
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