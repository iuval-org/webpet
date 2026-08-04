/**
 * Particle System — canvas 2D particle effects engine.
 *
 * Implements the Behavior interface so it integrates into the engine loop.
 * Supports spark, heart, star, and confetti particle types with object pooling.
 * Must be registered AFTER the emotion behavior so particles draw on top.
 *
 * @module engine/particles
 */

import type { Behavior } from './behavior.ts'
import type { Renderer } from './renderer.ts'
import type { InputState } from './input.ts'

/* -------------------------------------------------------- */
/*  Types                                                  */
/* -------------------------------------------------------- */

export type ParticleType = 'spark' | 'heart' | 'star' | 'confetti'

/** Internal pooled particle. */
interface Particle2 {
  x: number
  y: number
  vx: number
  vy: number
  life: number       // remaining life in seconds
  maxLife: number    // initial life (for alpha calc)
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  type: ParticleType
  alive: boolean
}

/** Optional overrides for a single emit() call. */
export interface ParticleEmitConfig {
  readonly speed: number        // px/s
  readonly gravity: number      // px/s² (0 = use system gravity)
  readonly size: number         // base particle size in px
  readonly lifetime: number     // seconds
  readonly spread: number       // cone angle in radians (π = 180°, 2π = 360°)
  readonly color: string        // color override
  readonly useGravity: boolean  // whether system gravity applies
}

const DEFAULT_EMIT_CONFIG: ParticleEmitConfig = {
  speed: 80,
  gravity: 0,
  size: 4,
  lifetime: 1,
  spread: Math.PI,
  color: '',
  useGravity: true,
}

/* -------------------------------------------------------- */
/*  Object pool                                             */
/* -------------------------------------------------------- */

const MAX_PARTICLES = 200

function createParticle(): Particle2 {
  return {
    x: 0, y: 0, vx: 0, vy: 0,
    life: 0, maxLife: 1, size: 4,
    color: '#ffd700', rotation: 0,
    rotationSpeed: 0, type: 'spark', alive: false,
  }
}

function initPool(): Particle2[] {
  const pool: Particle2[] = []
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pool.push(createParticle())
  }
  return pool
}

/** Find the first dead particle in the pool, or null if all alive. */
function nextDead(pool: Particle2[]): Particle2 | null {
  for (const p of pool) {
    if (!p.alive) return p
  }
  return null
}

/* -------------------------------------------------------- */
/*  Draw helpers per type                                   */
/* -------------------------------------------------------- */

function drawSpark(ctx: CanvasRenderingContext2D, p: Particle2): void {
  const alpha = Math.max(0, p.life / p.maxLife)
  ctx.globalAlpha = alpha
  ctx.fillStyle = p.color
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
  ctx.fill()
}

function drawHeart(ctx: CanvasRenderingContext2D, p: Particle2): void {
  const alpha = Math.max(0, p.life / p.maxLife)
  const s = p.size
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.globalAlpha = alpha
  ctx.fillStyle = p.color
  ctx.beginPath()
  ctx.moveTo(0, s * 0.3)
  ctx.bezierCurveTo(-s * 0.6, -s * 0.3, 0, -s * 0.8, 0, -s * 0.3)
  ctx.bezierCurveTo(0, -s * 0.8, s * 0.6, -s * 0.3, 0, s * 0.3)
  ctx.fill()
  ctx.restore()
}

function drawStar(ctx: CanvasRenderingContext2D, p: Particle2): void {
  const alpha = Math.max(0, p.life / p.maxLife)
  const outerR = p.size * 0.5
  const innerR = outerR * 0.4
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.globalAlpha = alpha
  ctx.fillStyle = p.color
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2
    const innerAngle = outerAngle + Math.PI / 5
    const ox = Math.cos(outerAngle) * outerR
    const oy = Math.sin(outerAngle) * outerR
    const ix = Math.cos(innerAngle) * innerR
    const iy = Math.sin(innerAngle) * innerR
    if (i === 0) ctx.moveTo(ox, oy)
    else ctx.lineTo(ox, oy)
    ctx.lineTo(ix, iy)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawConfetti(ctx: CanvasRenderingContext2D, p: Particle2): void {
  const alpha = Math.max(0, p.life / p.maxLife)
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.globalAlpha = alpha
  ctx.fillStyle = p.color
  ctx.fillRect(-p.size * 0.3, -p.size * 0.15, p.size * 0.6, p.size * 0.3)
  ctx.restore()
}

const DRAW_FN: Record<ParticleType, (ctx: CanvasRenderingContext2D, p: Particle2) => void> = {
  spark: drawSpark,
  heart: drawHeart,
  star: drawStar,
  confetti: drawConfetti,
}

/* -------------------------------------------------------- */
/*  Default colors per type                                 */
/* -------------------------------------------------------- */

const TYPE_COLORS: Record<ParticleType, string> = {
  spark: '#ffd700',
  heart: '#ff69b4',
  star: '#ffeb3b',
  confetti: '#ff6b6b',
}

/* -------------------------------------------------------- */
/*  Particle Behavior — public API + Behavior integration   */
/* -------------------------------------------------------- */

const DEFAULT_GRAVITY = 60   // px/s² downward
const DEFAULT_SPREAD = Math.PI

/** Public particle API exposed to consumers (pet, triggers, user code). */
export interface ParticleAPI {
  /**
   * Emit `count` particles of the given type from position (x, y).
   * Particles spread upward in a cone by default.
   */
  emit(
    x: number, y: number,
    type: ParticleType,
    count: number,
    config?: Partial<ParticleEmitConfig>,
  ): void

  /** Set global gravity in px/s² (default: 60). Negative = upward. */
  setGravity(g: number): void

  /** Set the default emission cone angle in radians (default: π). */
  setSpread(angle: number): void
}

/** Combined type: Behavior + ParticleAPI for engine integration. */
export type ParticleBehavior = Behavior & ParticleAPI

/**
 * Create a particle system behavior.
 *
 * Must be registered AFTER the emotion behavior so particles draw on top
 * of the character (emotion clears the canvas each frame).
 */
export function createParticleBehavior(): ParticleBehavior {
  const pool = initPool()
  let renderer: Renderer | null = null
  let gravity = DEFAULT_GRAVITY
  let spread = DEFAULT_SPREAD

  /* ---- ParticleAPI ---- */

  function emit(
    x: number, y: number,
    type: ParticleType,
    count: number,
    config?: Partial<ParticleEmitConfig>,
  ): void {
    const cfg: ParticleEmitConfig = { ...DEFAULT_EMIT_CONFIG, ...config }

    // Resolve color: explicit override, type default, or random confetti color
    let color: string
    if (cfg.color) {
      color = cfg.color
    } else if (type === 'confetti') {
      const CONFETTI_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff69b4', '#ff8c00']
      color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
    } else {
      color = TYPE_COLORS[type]
    }

    const useGravityLocal = cfg.useGravity
    const actualSpread = cfg.spread ?? (type === 'star' ? Math.PI * 2 : spread)

    for (let i = 0; i < count; i++) {
      const p = nextDead(pool)
      if (!p) break  // pool exhausted

      // Angle: cone centered upward (-π/2 in canvas coords)
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * actualSpread
      const speed = cfg.speed * (0.5 + Math.random() * 0.5)
      const lifetime = cfg.lifetime * (0.7 + Math.random() * 0.3)

      p.x = x + (Math.random() - 0.5) * 4
      p.y = y + (Math.random() - 0.5) * 4
      p.vx = Math.cos(angle) * speed * (useGravityLocal ? 1 : 1)
      p.vy = Math.sin(angle) * speed * (useGravityLocal ? 1 : 1)
      p.life = lifetime
      p.maxLife = lifetime
      p.size = cfg.size * (0.7 + Math.random() * 0.6)
      p.color = color
      p.rotation = Math.random() * Math.PI * 2
      p.rotationSpeed = (Math.random() - 0.5) * 6
      p.type = type
      p.alive = true
    }
  }

  function setGravity(g: number): void {
    gravity = g
  }

  function setSpread(angle: number): void {
    spread = angle
  }

  /* ---- Behavior hooks ---- */

  return {
    name: 'particles',

    emit,
    setGravity,
    setSpread,

    onMount(r: Renderer): void {
      renderer = r
    },

    onUnmount(): void {
      renderer = null
    },

    onTick(delta: number, _input: InputState): void {
      const r = renderer
      if (!r || !r.ctx) return

      const dt = delta / 1000
      const ctx = r.ctx

      /* ---- Update phase ---- */
      for (const p of pool) {
        if (!p.alive) continue

        p.life -= dt
        if (p.life <= 0) {
          p.alive = false
          continue
        }

        p.vy += gravity * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rotation += p.rotationSpeed * dt

        // Kill particles that drift too far off-screen
        if (p.x < -50 || p.x > r.width + 50 || p.y < -50 || p.y > r.height + 50) {
          p.alive = false
        }
      }

      /* ---- Render phase (no clear — emotion behavior owns it) ---- */
      ctx.save()
      for (const p of pool) {
        if (!p.alive) continue
        DRAW_FN[p.type](ctx, p)
      }
      ctx.restore()
    },
  }
}