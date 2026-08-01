/**
 * Appearance system — modular pet body/eyes/arms/accessory options.
 *
 * Each category has a set of options with drawing functions.
 * The character system uses these to render the pet.
 *
 * @module engine/appearance
 */

import type { CharacterDef } from './character.ts'

/* -------------------------------------------------------- */
/*  Types                                                  */
/* -------------------------------------------------------- */

export type BodyType = 'round' | 'tall' | 'wide' | 'pear' | 'square'
export type EyeType = 'round' | 'angry' | 'sleepy' | 'happy' | 'shiny'
export type ArmType = 'none' | 'stubby' | 'long' | 'tentacle' | 'wings'
export type Headgear = 'none' | 'crown' | 'bow' | 'flower' | 'hair' | 'witch'

export interface Appearance {
  readonly body: BodyType
  readonly eyes: EyeType
  readonly arms: ArmType
  readonly headgear: Headgear
}

export const DEFAULT_APPEARANCE: Appearance = {
  body: 'round',
  eyes: 'round',
  arms: 'stubby',
  headgear: 'none',
}

/* -------------------------------------------------------- */
/*  Body drawing                                            */
/* -------------------------------------------------------- */

/**
 * Draw the body blob with the given shape type.
 */
export function drawBody(
  ctx: CanvasRenderingContext2D,
  size: number,
  bodyType: BodyType,
  character: CharacterDef,
): void {
  const cx = size / 2
  const cy = size / 2
  const s = size / 400

  ctx.beginPath()

  if (bodyType === 'round') {
    /* Demo blob */
    ctx.moveTo(cx, cy - 140 * s)
    ctx.bezierCurveTo(cx + 90 * s, cy - 140 * s, cx + 150 * s, cy - 90 * s, cx + 150 * s, cy + 10 * s)
    ctx.bezierCurveTo(cx + 150 * s, cy + 110 * s, cx + 90 * s, cy + 140 * s, cx, cy + 140 * s)
    ctx.bezierCurveTo(cx - 90 * s, cy + 140 * s, cx - 150 * s, cy + 110 * s, cx - 150 * s, cy + 10 * s)
    ctx.bezierCurveTo(cx - 150 * s, cy - 90 * s, cx - 90 * s, cy - 140 * s, cx, cy - 140 * s)
  } else if (bodyType === 'tall') {
    /* Taller — stretch Y by 1.3 */
    ctx.moveTo(cx, cy - 175 * s)
    ctx.bezierCurveTo(cx + 80 * s, cy - 175 * s, cx + 130 * s, cy - 110 * s, cx + 130 * s, cy + 10 * s)
    ctx.bezierCurveTo(cx + 130 * s, cy + 120 * s, cx + 80 * s, cy + 175 * s, cx, cy + 175 * s)
    ctx.bezierCurveTo(cx - 80 * s, cy + 175 * s, cx - 130 * s, cy + 120 * s, cx - 130 * s, cy + 10 * s)
    ctx.bezierCurveTo(cx - 130 * s, cy - 110 * s, cx - 80 * s, cy - 175 * s, cx, cy - 175 * s)
  } else if (bodyType === 'wide') {
    /* Wider — stretch X by 1.3 */
    ctx.moveTo(cx, cy - 110 * s)
    ctx.bezierCurveTo(cx + 120 * s, cy - 110 * s, cx + 195 * s, cy - 70 * s, cx + 195 * s, cy + 10 * s)
    ctx.bezierCurveTo(cx + 195 * s, cy + 90 * s, cx + 120 * s, cy + 110 * s, cx, cy + 110 * s)
    ctx.bezierCurveTo(cx - 120 * s, cy + 110 * s, cx - 195 * s, cy + 90 * s, cx - 195 * s, cy + 10 * s)
    ctx.bezierCurveTo(cx - 195 * s, cy - 70 * s, cx - 120 * s, cy - 110 * s, cx, cy - 110 * s)
  } else if (bodyType === 'pear') {
    /* Pear — wider bottom, narrower top */
    ctx.moveTo(cx, cy - 150 * s)
    ctx.bezierCurveTo(cx + 70 * s, cy - 145 * s, cx + 110 * s, cy - 80 * s, cx + 120 * s, cy + 20 * s)
    ctx.bezierCurveTo(cx + 135 * s, cy + 110 * s, cx + 100 * s, cy + 150 * s, cx, cy + 150 * s)
    ctx.bezierCurveTo(cx - 100 * s, cy + 150 * s, cx - 135 * s, cy + 110 * s, cx - 120 * s, cy + 20 * s)
    ctx.bezierCurveTo(cx - 110 * s, cy - 80 * s, cx - 70 * s, cy - 145 * s, cx, cy - 150 * s)
  } else {
    /* Square — more angular blob */
    ctx.moveTo(cx - 100 * s, cy - 120 * s)
    ctx.bezierCurveTo(cx + 100 * s, cy - 130 * s, cx + 140 * s, cy - 80 * s, cx + 130 * s, cy + 10 * s)
    ctx.bezierCurveTo(cx + 140 * s, cy + 100 * s, cx + 100 * s, cy + 130 * s, cx, cy + 130 * s)
    ctx.bezierCurveTo(cx - 100 * s, cy + 130 * s, cx - 140 * s, cy + 100 * s, cx - 130 * s, cy + 10 * s)
    ctx.bezierCurveTo(cx - 140 * s, cy - 80 * s, cx - 100 * s, cy - 130 * s, cx - 100 * s, cy - 120 * s)
  }

  ctx.closePath()

  /* Radial gradient */
  const grad = ctx.createRadialGradient(cx - 40 * s, cy - 50 * s, 0, cx, cy, 150 * s)
  grad.addColorStop(0, character.bodyStops[0])
  grad.addColorStop(0.6, character.bodyStops[1])
  grad.addColorStop(1, character.bodyStops[2])

  ctx.fillStyle = grad
  ctx.fill()
  ctx.strokeStyle = '#2e1065'
  ctx.lineWidth = Math.max(size * 0.02, 3)
  ctx.stroke()
}

/* -------------------------------------------------------- */
/*  Arm drawing                                             */
/* -------------------------------------------------------- */

export function drawArms(
  ctx: CanvasRenderingContext2D,
  size: number,
  armType: ArmType,
  character: CharacterDef,
  time: number,
): void {
  if (armType === 'none') return

  const cx = size / 2
  const cy = size / 2
  const s = size / 400
  const armColor = character.bodyStops[1]

  ctx.strokeStyle = '#2e1065'
  ctx.lineWidth = Math.max(size * 0.025, 3)
  ctx.lineCap = 'round'
  ctx.fillStyle = armColor

  const sway = Math.sin(time * 2) * 5

  if (armType === 'stubby') {
    // Left stub
    ctx.beginPath()
    ctx.ellipse(cx - 155 * s, cy + 60 * s + sway, 25 * s, 15 * s, 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    // Right stub
    ctx.beginPath()
    ctx.ellipse(cx + 155 * s, cy + 60 * s - sway, 25 * s, 15 * s, -0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (armType === 'long') {
    // Left arm
    ctx.beginPath()
    ctx.moveTo(cx - 130 * s, cy + 30 * s)
    ctx.quadraticCurveTo(cx - 170 * s, cy + 90 * s + sway, cx - 140 * s, cy + 140 * s)
    ctx.stroke()
    // Right arm
    ctx.beginPath()
    ctx.moveTo(cx + 130 * s, cy + 30 * s)
    ctx.quadraticCurveTo(cx + 170 * s, cy + 90 * s - sway, cx + 140 * s, cy + 140 * s)
    ctx.stroke()
  } else if (armType === 'tentacle') {
    // Left tentacle
    ctx.beginPath()
    ctx.moveTo(cx - 130 * s, cy + 40 * s)
    for (let i = 0; i < 4; i++) {
      const px = cx - 140 * s + Math.sin(time * 3 + i * 1.5) * 15 * s
      const py = cy + 50 * s + i * 30 * s
      ctx.lineTo(px, py)
    }
    ctx.stroke()
    // Right tentacle
    ctx.beginPath()
    ctx.moveTo(cx + 130 * s, cy + 40 * s)
    for (let i = 0; i < 4; i++) {
      const px = cx + 140 * s + Math.sin(time * 3 + i * 1.5 + 1) * 15 * s
      const py = cy + 50 * s + i * 30 * s
      ctx.lineTo(px, py)
    }
    ctx.stroke()
  } else if (armType === 'wings') {
    // Left wing
    ctx.beginPath()
    ctx.moveTo(cx - 120 * s, cy + 20 * s)
    ctx.quadraticCurveTo(cx - 200 * s, cy - 40 * s + sway * 0.5, cx - 160 * s, cy - 80 * s)
    ctx.quadraticCurveTo(cx - 130 * s, cy - 50 * s, cx - 120 * s, cy + 20 * s)
    ctx.fill()
    ctx.stroke()
    // Right wing
    ctx.beginPath()
    ctx.moveTo(cx + 120 * s, cy + 20 * s)
    ctx.quadraticCurveTo(cx + 200 * s, cy - 40 * s - sway * 0.5, cx + 160 * s, cy - 80 * s)
    ctx.quadraticCurveTo(cx + 130 * s, cy - 50 * s, cx + 120 * s, cy + 20 * s)
    ctx.fill()
    ctx.stroke()
  }
}

/* -------------------------------------------------------- */
/*  Headgear drawing                                        */
/* -------------------------------------------------------- */

export function drawHeadgear(
  ctx: CanvasRenderingContext2D,
  size: number,
  headgear: Headgear,
  _character: CharacterDef,
  time: number,
): void {
  if (headgear === 'none') return

  const cx = size / 2
  const cy = size / 2
  const s = size / 400

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (headgear === 'crown') {
    ctx.beginPath()
    ctx.moveTo(cx - 60 * s, cy - 120 * s)
    ctx.lineTo(cx - 75 * s, cy - 180 * s)
    ctx.lineTo(cx - 45 * s, cy - 155 * s)
    ctx.lineTo(cx - 15 * s, cy - 185 * s)
    ctx.lineTo(cx + 15 * s, cy - 155 * s)
    ctx.lineTo(cx + 45 * s, cy - 185 * s)
    ctx.lineTo(cx + 75 * s, cy - 180 * s)
    ctx.lineTo(cx + 60 * s, cy - 120 * s)
    ctx.closePath()
    ctx.fillStyle = '#facc15'
    ctx.fill()
    ctx.strokeStyle = '#ca8a04'
    ctx.lineWidth = Math.max(s * 3, 2)
    ctx.stroke()
  } else if (headgear === 'bow') {
    ctx.save()
    const bx = cx + 70 * s
    const by = cy - 125 * s
    ctx.translate(bx, by)
    ctx.rotate(Math.sin(time * 2) * 0.2)
    // Left loop
    ctx.beginPath()
    ctx.ellipse(-15 * s, 0, 18 * s, 10 * s, -0.3, 0, Math.PI * 2)
    ctx.fillStyle = '#ec4899'
    ctx.fill()
    ctx.strokeStyle = '#be185d'
    ctx.lineWidth = Math.max(s * 2, 1)
    ctx.stroke()
    // Right loop
    ctx.beginPath()
    ctx.ellipse(15 * s, 0, 18 * s, 10 * s, 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    // Center knot
    ctx.beginPath()
    ctx.arc(0, 0, 6 * s, 0, Math.PI * 2)
    ctx.fillStyle = '#be185d'
    ctx.fill()
    ctx.restore()
  } else if (headgear === 'flower') {
    const fx = cx
    const fy = cy - 140 * s
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + Math.sin(time) * 0.1
      ctx.beginPath()
      ctx.ellipse(
        fx + Math.cos(angle) * 15 * s,
        fy + Math.sin(angle) * 15 * s,
        10 * s, 6 * s, angle, 0, Math.PI * 2,
      )
      ctx.fillStyle = ['#f43f5e', '#ec4899', '#f97316', '#facc15', '#a855f7'][i]
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(fx, fy, 6 * s, 0, Math.PI * 2)
    ctx.fillStyle = '#facc15'
    ctx.fill()
  } else if (headgear === 'hair') {
    ctx.strokeStyle = '#333'
    ctx.lineWidth = Math.max(s * 4, 3)
    for (let i = -3; i <= 3; i++) {
      const hx = cx + i * 20 * s
      const hy = cy - 120 * s
      ctx.beginPath()
      ctx.moveTo(hx, hy)
      ctx.quadraticCurveTo(
        hx + i * 5 * s + Math.sin(time + i) * 5 * s,
        hy - 35 * s,
        hx + i * 8 * s,
        hy - 40 * s,
      )
      ctx.stroke()
    }
  } else if (headgear === 'witch') {
    // Cone
    ctx.beginPath()
    ctx.moveTo(cx - 65 * s, cy - 110 * s)
    ctx.lineTo(cx, cy - 230 * s)
    ctx.lineTo(cx + 65 * s, cy - 110 * s)
    ctx.closePath()
    ctx.fillStyle = '#1e1b4b'
    ctx.fill()
    ctx.strokeStyle = '#312e81'
    ctx.lineWidth = Math.max(s * 3, 2)
    ctx.stroke()
    // Brim
    ctx.beginPath()
    ctx.ellipse(cx, cy - 110 * s, 85 * s, 12 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#1e1b4b'
    ctx.fill()
    ctx.stroke()
    // Band
    ctx.fillStyle = '#7c3aed'
    ctx.fillRect(cx - 65 * s, cy - 120 * s, 130 * s, 10 * s)
    // Buckle
    ctx.fillStyle = '#facc15'
    ctx.fillRect(cx - 8 * s, cy - 120 * s, 16 * s, 10 * s)
  }
}

/* -------------------------------------------------------- */
/*  Eye type helpers (used by eyes behavior)                 */
/* -------------------------------------------------------- */

/** Modifiers for the eyes behavior based on eye type. */
export interface EyeModifiers {
  readonly pupilShape: 'round' | 'heart' | 'star' | 'slit'
  readonly pupilSizeFactor: number
  readonly irisSizeFactor: number
  readonly highlightCount: number
  readonly extraGlow: boolean
}

export function getEyeModifiers(eyeType: EyeType): EyeModifiers {
  switch (eyeType) {
    case 'round': return { pupilShape: 'round', pupilSizeFactor: 1, irisSizeFactor: 1, highlightCount: 2, extraGlow: false }
    case 'angry': return { pupilShape: 'slit', pupilSizeFactor: 0.7, irisSizeFactor: 1.1, highlightCount: 1, extraGlow: true }
    case 'sleepy': return { pupilShape: 'round', pupilSizeFactor: 0.5, irisSizeFactor: 0.8, highlightCount: 1, extraGlow: false }
    case 'happy': return { pupilShape: 'heart', pupilSizeFactor: 0.9, irisSizeFactor: 1, highlightCount: 2, extraGlow: false }
    case 'shiny': return { pupilShape: 'star', pupilSizeFactor: 0.8, irisSizeFactor: 1.2, highlightCount: 3, extraGlow: true }
  }
}

/* -------------------------------------------------------- */
/*  Option lists for UI                                     */
/* -------------------------------------------------------- */

export interface AppearanceOption<T> {
  readonly id: T
  readonly label: string
  readonly emoji: string
}

export const BODY_OPTIONS: AppearanceOption<BodyType>[] = [
  { id: 'round', label: 'Redondo', emoji: '⚪' },
  { id: 'tall', label: 'Alto', emoji: '📏' },
  { id: 'wide', label: 'Ancho', emoji: '⬅️' },
  { id: 'pear', label: 'Perita', emoji: '🍐' },
  { id: 'square', label: 'Cuadrado', emoji: '🔲' },
]

export const EYE_OPTIONS: AppearanceOption<EyeType>[] = [
  { id: 'round', label: 'Redondos', emoji: '👁️' },
  { id: 'angry', label: 'Enojados', emoji: '😠' },
  { id: 'sleepy', label: 'Soñolientos', emoji: '😴' },
  { id: 'happy', label: 'Felices', emoji: '😊' },
  { id: 'shiny', label: 'Brillantes', emoji: '✨' },
]

export const ARM_OPTIONS: AppearanceOption<ArmType>[] = [
  { id: 'none', label: 'Nada', emoji: '🚫' },
  { id: 'stubby', label: 'Cortos', emoji: '🫲' },
  { id: 'long', label: 'Largos', emoji: '🦾' },
  { id: 'tentacle', label: 'Tentáculos', emoji: '🐙' },
  { id: 'wings', label: 'Alitas', emoji: '🪽' },
]

export const HEADGEAR_OPTIONS: AppearanceOption<Headgear>[] = [
  { id: 'none', label: 'Nada', emoji: '🚫' },
  { id: 'crown', label: 'Corona', emoji: '👑' },
  { id: 'bow', label: 'Moño', emoji: '🎀' },
  { id: 'flower', label: 'Flor', emoji: '🌸' },
  { id: 'hair', label: 'Pelo', emoji: '💇' },
  { id: 'witch', label: 'Bruja', emoji: '🧙' },
]