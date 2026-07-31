/**
 * Locomotion system — movement behaviors for mascot animation.
 *
 * Provides fly (float/wander) and walk (gravity/bounce) modes
 * with tricks, energy levels, and squash/stretch physics.
 *
 * This behavior does NOT draw — it computes transform state
 * (position offset, rotation, squash) that the emotion/character
 * behavior reads and applies to the canvas context.
 *
 * @module engine/locomotion
 */

import type { Behavior } from './behavior.ts'
import type { InputState } from './input.ts'
import type { Renderer } from './renderer.ts'
import { setCharacterSquash, setCharacterTransform } from './character.ts'
import { playTrick, playLand } from './audio.ts'

/* -------------------------------------------------------- */
/*  Types                                                  */
/* -------------------------------------------------------- */

export type LocomotionMode = 'fly' | 'walk'

export interface TrickToggles {
  hop: boolean
  flip: boolean
  spin: boolean
  highjump: boolean
}

export interface LocomotionConfig {
  readonly defaultMode: LocomotionMode
  readonly energy: number       // 0–10
  readonly tricks: TrickToggles
  readonly scale: number        // 0.5–1.6
}

/** Per-frame movement output. */
export interface MovementState {
  readonly offsetX: number      // px offset from canvas center
  readonly offsetY: number
  readonly rotation: number     // degrees
  readonly squashX: number
  readonly squashY: number
  readonly isAirborne: boolean
  readonly isWalking: boolean
}

/* -------------------------------------------------------- */
/*  Behavior factory                                        */
/* -------------------------------------------------------- */

const DEFAULT_CONFIG: LocomotionConfig = {
  defaultMode: 'fly',
  energy: 0,
  tricks: { hop: true, flip: true, spin: true, highjump: true },
  scale: 1,
}

export interface LocomotionAPI {
  readonly setMode: (mode: LocomotionMode) => void
  readonly getMode: () => LocomotionMode
  readonly setEnergy: (n: number) => void
  readonly getEnergy: () => number
  readonly setScale: (s: number) => void
  readonly getScale: () => number
  readonly setTrick: (name: keyof TrickToggles, on: boolean) => void
  readonly triggerJump: (forcedTrick?: string) => void
  readonly getMovement: () => MovementState
}

/**
 * Create a locomotion behavior.
 *
 * Must be registered AFTER the character/emotion behavior
 * (which draws) and BEFORE eye behaviors (which don't need transforms).
 */
export function createLocomotionBehavior(
  config?: Partial<LocomotionConfig>,
): Behavior & LocomotionAPI {
  const cfg: LocomotionConfig = { ...DEFAULT_CONFIG, ...config }

  let renderer: Renderer | null = null
  let size = 48

  /* ---- Internal state ---- */

  let _mode: LocomotionMode = cfg.defaultMode

  /* Position offset from center */
  let _posX = 0
  let _posY = 0
  let _targetX = 0
  let _targetY = 0

  /* Gravity/walk physics */
  let _vx = 0
  let _vy = 0
  let _isGrounded = false
  let _walkDir = 1
  let _walkCycle = 0

  /* Trick state */
  let _trickState: string | null = null
  let _trickProgress = 0
  let _lastTrickTime = 0

  /* Smooth rotation */
  let _rotation = 0

  /* Energy 0-10 */
  let _energy = cfg.energy

  /* Scale */
  let _scale = cfg.scale

  /* Trick toggles */
  const _tricks: TrickToggles = { ...cfg.tricks }

  /* Squash/stretch */
  let _squashX = 1
  let _squashY = 1

  /* ---- Public API ---- */

  function setMode(m: LocomotionMode): void {
    _mode = m
    _isGrounded = false
    _vx = 0; _vy = 0
    _trickState = null
  }

  function getMode(): LocomotionMode { return _mode }
  function setEnergy(n: number): void { _energy = Math.max(0, Math.min(10, n)) }
  function getEnergy(): number { return _energy }
  function setScale(s: number): void { _scale = Math.max(0.5, Math.min(1.6, s)) }
  function getScale(): number { return _scale }
  function setTrick(name: keyof TrickToggles, on: boolean): void { _tricks[name] = on }

  function getMovement(): MovementState {
    return {
      offsetX: _posX,
      offsetY: _posY,
      rotation: _rotation,
      squashX: _squashX,
      squashY: _squashY,
      isAirborne: !_isGrounded,
      isWalking: _mode === 'walk' && _isGrounded && _energy > 0,
    }
  }

  /* ---- Jump logic ---- */

  function triggerJump(forcedTrick?: string): void {
    const activeTricks: string[] = []
    if (_tricks.highjump) activeTricks.push('highjump')
    if (_tricks.flip) activeTricks.push('flip')
    if (_tricks.spin) activeTricks.push('spin')
    if (_tricks.hop) activeTricks.push('hop')

    if (activeTricks.length === 0 && !forcedTrick) return

    const trick = forcedTrick || activeTricks[Math.floor(Math.random() * activeTricks.length)]

    _trickState = trick
    _lastTrickTime = performance.now()
    _isGrounded = false
    _squashX = 0.75
    _squashY = 1.35

    playTrick()

    if (trick === 'highjump') {
      _vy = -14 - _energy * 1.1
      _vx = _walkDir * (1.8 + _energy * 0.5)
    } else if (trick === 'flip') {
      _vy = -12 - _energy * 0.9
      _vx = _walkDir * (2.8 + _energy * 0.6)
    } else if (trick === 'spin') {
      _vy = -10 - _energy * 0.8
      _vx = _walkDir * (2.2 + _energy * 0.5)
    } else { // hop
      _vy = -8.5 - _energy * 0.7
      _vx = _walkDir * (2.0 + _energy * 0.4)
    }
  }

  /* ---- Behavior ---- */

  return {
    name: 'locomotion',
    setMode, getMode, setEnergy, getEnergy,
    setScale, getScale, setTrick, triggerJump, getMovement,

    onMount(r: Renderer): void {
      renderer = r
      size = r.width
      _posX = 0; _posY = 0
      _vx = 0; _vy = 0
      _rotation = 0
      _squashX = 1; _squashY = 1
      _trickState = null
      _isGrounded = false
    },

    onUnmount(): void {
      renderer = null
    },

    onTick(_delta: number, _input: InputState): void {
      if (!renderer) return

      const now = performance.now()
      const dt = _delta / 16.67 // normalize to ~60fps steps

      if (_mode === 'fly') {
        _updateFly(now, dt)
      } else {
        _updateWalk(now, dt)
      }

      /* Update shared character transform */
      setCharacterTransform(_posX, _posY, _rotation)

      /* ---- Update shared character state ---- */
      setCharacterSquash(_squashX * _scale, _squashY * _scale)
    },
  }

  /* ---- Internal fly update ---- */

  function _updateFly(now: number, _dt: number): void {
    if (_energy === 0) {
      /* Calm — drift to center */
      _posX += (0 - _posX) * 0.08
      _posY += (0 - _posY) * 0.08
      _rotation += (0 - _rotation) * 0.08
      _squashX += (1 - _squashX) * 0.1
      _squashY += (1 - _squashY) * 0.1
      _trickState = null
      return
    }

    /* Wander target-seeking */
    const maxOffset = size * 0.3
    if (Math.abs(_posX - _targetX) < 5 || Math.random() < 0.02) {
      _targetX = (Math.random() - 0.5) * maxOffset * 2
      _targetY = (Math.random() - 0.5) * maxOffset * 1.5
    }

    const speed = 0.5 + _energy * 0.4
    _posX += Math.sign(_targetX - _posX) * Math.min(Math.abs(_targetX - _posX), speed)
    _posY += Math.sign(_targetY - _posY) * Math.min(Math.abs(_targetY - _posY), speed * 0.7)

    /* Idle bob */
    _posY += Math.sin(now * 0.003) * (2 + _energy * 0.5)

    /* Auto-tricks */
    const cooldown = Math.max(700, 3200 - _energy * 240)
    if (!_trickState && (now - _lastTrickTime > cooldown) && Math.random() < 0.25 + _energy * 0.04) {
      triggerJump()
    }

    /* Trick animation */
    if (_trickState) {
      const speedMult = 0.035 + _energy * 0.003
      _trickProgress += speedMult
      const p = Math.min(1, _trickProgress)

      if (_trickState === 'hop') {
        _posY = -Math.sin(p * Math.PI) * (45 + _energy * 6)
        _rotation = Math.sin(p * Math.PI * 2) * 10
      } else if (_trickState === 'flip') {
        _posY = -Math.sin(p * Math.PI) * (75 + _energy * 8)
        _rotation = p * 360
      } else if (_trickState === 'spin') {
        _posY = -Math.sin(p * Math.PI) * (35 + _energy * 4)
        _rotation = p * 720
      } else if (_trickState === 'highjump') {
        _posY = -Math.sin(p * Math.PI) * (120 + _energy * 10)
        _rotation = Math.sin(p * Math.PI * 2) * 25
        _squashX = 1 - Math.sin(p * Math.PI) * 0.25
        _squashY = 1 + Math.sin(p * Math.PI) * 0.35
      }

      if (p >= 1) {
        _trickState = null
        _posY = 0
        _rotation = 0
        _squashX = 1.3
        _squashY = 0.7
      }
    } else {
      _squashX += (1 - _squashX) * 0.15
      _squashY += (1 - _squashY) * 0.15

      /* Idle rotation wander */
      _rotation += (0 - _rotation) * 0.1
    }
  }

  /* ---- Internal walk update ---- */

  function _updateWalk(now: number, _dt: number): void {
    if (!_isGrounded) {
      /* Airborne */
      _vy += 0.55
      _posY += _vy
      _posX += _vx
      _vx *= 0.98

      /* Trick rotation in air */
      if (_trickState === 'flip') _rotation += _walkDir * 18
      else if (_trickState === 'spin') _rotation += _walkDir * 28
      else if (_trickState === 'highjump') {
        _rotation = Math.sin(_vy * 0.1) * 15
        if (_vy < 0) { _squashX = 0.8; _squashY = 1.25 }
        else { _squashX = 1.15; _squashY = 0.85 }
      } else {
        _rotation = Math.sin(_vy * 0.08) * 10
      }

      /* Landing (bounce off floor) */
      const floorY = size * 0.25
      if (_vy >= 0 && _posY >= floorY) {
        _posY = floorY
        _vy = 0; _vx = 0
        _isGrounded = true
        _trickState = null
        _rotation = 0
        _squashX = 1.4
        _squashY = 0.6
        playLand()
      }
    } else {
      /* Grounded */
      _posY = size * 0.25

      /* Walk on ground */
      if (_energy > 0 && _tricks.hop) {
        const speed = 0.8 + _energy * 0.5
        _posX += _walkDir * speed
        _walkCycle += 0.18 + _energy * 0.03
        _rotation = Math.sin(_walkCycle) * 10
        _squashY = 1 + Math.abs(Math.sin(_walkCycle)) * 0.12

        /* Bounce off walls */
        const bound = size * 0.3
        if (_posX > bound) { _walkDir = -1; _posX = bound }
        else if (_posX < -bound) { _walkDir = 1; _posX = -bound }
      } else {
        _rotation += (0 - _rotation) * 0.15
      }

      /* Auto-jump */
      const cooldown = Math.max(800, 3500 - _energy * 250)
      if (_energy > 0 && !_trickState && (now - _lastTrickTime > cooldown) && Math.random() < 0.2 + _energy * 0.04) {
        triggerJump()
      }
    }

    _squashX += (1 - _squashX) * 0.15
    _squashY += (1 - _squashY) * 0.15
  }
}